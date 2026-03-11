'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getStoredUser } from '../../lib/auth-mock';
import {
  apiGetMyMeetingRequests,
  apiAcceptMeetingRequest,
  apiRejectMeetingRequest,
  apiGetWizardGuestBookings,
  apiAcceptGuestBooking,
  apiRejectGuestBooking,
  MeetingRequestDto,
  GuestBookingDto,
} from '../../lib/api-meetings';
import './wnioski.css';
import '../panel-shared.css';

type UnifiedItem =
  | { kind: 'regular'; data: MeetingRequestDto; sortDate: Date }
  | { kind: 'guest';   data: GuestBookingDto;   sortDate: Date };

const STATUS_LABELS: Record<string, string> = {
  pending:   'Oczekujące',
  accepted:  'Zaakceptowane',
  rejected:  'Odrzucone',
  paid:      'Opłacone',
  completed: 'Zakończone',
};

export default function WnioskiPage() {
  const [user] = useState(() => getStoredUser());

  const [requests, setRequests]         = useState<MeetingRequestDto[]>([]);
  const [total, setTotal]               = useState(0);
  const [offset, setOffset]             = useState(0);
  const [limit]                         = useState(20);
  const [statusFilter, setStatusFilter] = useState('pending');

  const [guestBookings, setGuestBookings] = useState<GuestBookingDto[]>([]);

  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | string | null>(null);

  // Modal odrzucenia
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    id: number | string | null;
    kind: 'regular' | 'guest';
    reason: string;
  }>({ open: false, id: null, kind: 'guest', reason: '' });

  // ── Pobieranie danych ────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [regData, guestData] = await Promise.all([
        apiGetMyMeetingRequests(user.token, { status: statusFilter || undefined, limit, offset }),
        apiGetWizardGuestBookings(user.token),
      ]);
      setRequests(regData.requests);
      setTotal(regData.total);
      setGuestBookings(guestData.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować wniosków');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, limit, offset]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Akcje: zalogowani klienci ────────────────────────────────────────────

  const handleAccept = async (id: number) => {
    if (!user) return;
    setProcessingId(id);
    setError(null);
    setSuccess(null);
    try {
      await apiAcceptMeetingRequest(user.token, id);
      setSuccess('Wniosek zaakceptowany! Klient otrzyma powiadomienie o płatności.');
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd akceptacji');
    } finally { setProcessingId(null); }
  };

  const handleReject = (id: number) => {
    setRejectModal({ open: true, id, kind: 'regular', reason: '' });
  };

  // ── Akcje: goście ────────────────────────────────────────────────────────

  const handleAcceptGuest = async (id: string) => {
    if (!user) return;
    setProcessingId(id);
    setError(null);
    setSuccess(null);
    try {
      await apiAcceptGuestBooking(user.token, id);
      setSuccess('Zaakceptowano! Gość otrzyma e-mail z linkiem do płatności.');
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd akceptacji');
    } finally { setProcessingId(null); }
  };

  const handleRejectGuest = (id: string) => {
    setRejectModal({ open: true, id, kind: 'guest', reason: '' });
  };

  const handleConfirmReject = async () => {
    if (!user || rejectModal.id === null) return;
    const { id, kind, reason } = rejectModal;
    setRejectModal(m => ({ ...m, open: false }));
    setProcessingId(id);
    setError(null);
    setSuccess(null);
    try {
      if (kind === 'regular') {
        await apiRejectMeetingRequest(user.token, id as number);
        setSuccess('Wniosek odrzucony.');
      } else {
        await apiRejectGuestBooking(user.token, id as string, reason.trim() || undefined);
        setSuccess('Wniosek gościa odrzucony.');
      }
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd odrzucenia');
    } finally {
      setProcessingId(null);
      setRejectModal({ open: false, id: null, kind: 'guest', reason: '' });
    }
  };

  // ── Scalona lista ────────────────────────────────────────────────────────

  const canJoin = (startsAt: string) =>
    new Date() >= new Date(new Date(startsAt).getTime() - 5 * 60 * 1000);

  // Filtrujemy gości tak samo jak zalogowanych (mapujemy statusy)
  const filteredGuests = statusFilter
    ? guestBookings.filter(b => {
        if (statusFilter === 'pending')   return b.status === 'pending';
        if (statusFilter === 'accepted')  return b.status === 'accepted' || b.status === 'paid';
        if (statusFilter === 'rejected')  return b.status === 'rejected';
        return true;
      })
    : guestBookings;

  const unified: UnifiedItem[] = [
    ...requests.map(r => ({
      kind: 'regular' as const,
      data: r,
      sortDate: r.requestedStartsAt ? new Date(r.requestedStartsAt) : new Date(r.createdAt ?? 0),
    })),
    ...filteredGuests.map(g => ({
      kind: 'guest' as const,
      data: g,
      sortDate: new Date(g.scheduledAt),
    })),
  ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  const pendingCount = unified.filter(item =>
    item.kind === 'guest' ? item.data.status === 'pending' : item.data.status === 'pending'
  ).length;

  const totalPages  = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (loading && unified.length === 0) {
    return (
      <div className="panel-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <div>
          <h1 className="panel-page__title">
            Wnioski o spotkanie
            {pendingCount > 0 && (
              <span className="wnioski-head-badge">{pendingCount}</span>
            )}
          </h1>
          <p className="panel-page__subtitle">
            Zaakceptuj lub odrzuć wnioski zalogowanych klientów i gości
          </p>
        </div>
      </div>

      {error   && <div className="wnioski-alert wnioski-alert--error">{error}</div>}
      {success && <div className="wnioski-alert wnioski-alert--success">{success}</div>}

      <div className="wnioski-filters">
        <div className="panel-select">
          <span className="panel-select__label">Status:</span>
          <div className="panel-select__control">
            <select
              className="panel-select__dropdown"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setOffset(0); }}
            >
              <option value="">Wszystkie</option>
              <option value="pending">Oczekujące</option>
              <option value="accepted">Zaakceptowane / Opłacone</option>
              <option value="rejected">Odrzucone</option>
            </select>
          </div>
        </div>
      </div>

      <section className="wnioski-section">
        {unified.length === 0 ? (
          <p className="wnioski-empty">Brak wniosków dla wybranego filtra</p>
        ) : (
          <div className="wnioski-list">
            {unified.map(item => {
              if (item.kind === 'regular') {
                const r = item.data;
                const isProc = processingId === r.id;
                const date   = r.requestedStartsAt ? new Date(r.requestedStartsAt) : null;
                const isPending = r.status === 'pending';
                return (
                  <div key={`r-${r.id}`} className="wnioski-card">
                    <div className="wnioski-card__header">
                      <div>
                        <h3 className="wnioski-card__title">{r.advertisementTitle}</h3>
                        <span className="wnioski-card__client">
                          Klient: <strong>{r.clientUsername}</strong>
                        </span>
                      </div>
                      <span className={`wnioski-card__status wnioski-card__status--${r.status}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>

                    <div className="wnioski-card__body">
                      {date ? (
                        <div className="wnioski-card__datetime">
                          <div className="wnioski-card__date">
                            📅 {date.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                          <div className="wnioski-card__time">
                            🕐 {date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <div className="wnioski-card__no-date">Data do ustalenia</div>
                      )}
                      {r.message && (
                        <div className="wnioski-card__message">
                          <strong>Wiadomość:</strong> {r.message}
                        </div>
                      )}
                      {r.appointment?.status === 'paid' && (
                        <div className="wnioski-card__payment-status">
                          <span className="wnioski-status-badge wnioski-status-badge--paid">✓ Opłacone</span>
                        </div>
                      )}
                      {r.createdAt && (
                        <div className="wnioski-card__created">
                          Wysłano: {new Date(r.createdAt).toLocaleString('pl-PL')}
                        </div>
                      )}
                    </div>

                    {r.appointment?.status === 'paid' && r.appointment.meetingToken && (
                      <div className="wnioski-card__actions">
                        {canJoin(r.appointment.startsAt) ? (
                          <Link href={`/spotkanie/${r.appointment.meetingToken}`}
                            className="wnioski-card__button wnioski-card__button--meeting">
                            🎥 Dołącz do spotkania
                          </Link>
                        ) : (
                          <div className="wnioski-card__meeting-wrapper">
                            <div className="wnioski-card__button wnioski-card__button--meeting-disabled">
                              🎥 Dołącz do spotkania
                            </div>
                            <div className="wnioski-tooltip">
                              <span className="wnioski-tooltip__icon">ℹ</span>
                              <span className="wnioski-tooltip__text">Dostępne 5 minut przed rozpoczęciem</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {isPending && (
                      <div className="wnioski-card__actions">
                        <button className="wnioski-card__button wnioski-card__button--accept"
                          onClick={() => handleAccept(r.id)} disabled={isProc}>
                          {isProc ? 'Przetwarzanie...' : '✓ Zaakceptuj'}
                        </button>
                        <button className="wnioski-card__button wnioski-card__button--reject"
                          onClick={() => handleReject(r.id)} disabled={isProc}>
                          ✕ Odrzuć
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              // ── Gość ─────────────────────────────────────────────────────
              const g = item.data;
              const isProc = processingId === g.id;
              const date   = new Date(g.scheduledAt);
              const isPending = g.status === 'pending';
              return (
                <div key={`g-${g.id}`} className="wnioski-card wnioski-card--guest">
                  <div className="wnioski-card__header">
                    <div>
                      <div className="wnioski-card__title-row">
                        <h3 className="wnioski-card__title">{g.advertisementTitle ?? 'Konsultacja'}</h3>
                        <span className="wnioski-guest-badge">Gość</span>
                      </div>
                      <span className="wnioski-card__client">
                        {g.guestName}
                        {g.guestEmail && <> · <a href={`mailto:${g.guestEmail}`} className="wnioski-email-link">{g.guestEmail}</a></>}
                        {g.guestPhone && <> · {g.guestPhone}</>}
                      </span>
                    </div>
                    <span className={`wnioski-card__status wnioski-card__status--${g.status}`}>
                      {STATUS_LABELS[g.status] ?? g.status}
                    </span>
                  </div>

                  <div className="wnioski-card__body">
                    <div className="wnioski-card__datetime">
                      <div className="wnioski-card__date">
                        📅 {date.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="wnioski-card__time">
                        🕐 {date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                        <span className="wnioski-card__duration"> · {g.durationMinutes} min · {(g.priceGrosze / 100).toFixed(2)} zł</span>
                      </div>
                    </div>
                    {g.message && (
                      <div className="wnioski-card__message">
                        <strong>Wiadomość:</strong> {g.message}
                      </div>
                    )}
                    {g.rejectionReason && (
                      <div className="wnioski-card__message">
                        <strong>Powód odrzucenia:</strong> {g.rejectionReason}
                      </div>
                    )}
                    <div className="wnioski-card__created">
                      Wysłano: {new Date(g.createdAt).toLocaleString('pl-PL')}
                    </div>
                  </div>

                  {g.status === 'paid' && (
                    <div className="wnioski-card__actions">
                      {canJoin(g.scheduledAt) ? (
                        <Link href={`/panel/spotkanie-gosc/${g.id}`}
                          className="wnioski-card__button wnioski-card__button--meeting">
                          🎥 Dołącz do spotkania
                        </Link>
                      ) : (
                        <div className="wnioski-card__meeting-wrapper">
                          <div className="wnioski-card__button wnioski-card__button--meeting-disabled">
                            🎥 Dołącz do spotkania
                          </div>
                          <div className="wnioski-tooltip">
                            <span className="wnioski-tooltip__icon">ℹ</span>
                            <span className="wnioski-tooltip__text">Dostępne 5 minut przed rozpoczęciem</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isPending && (
                    <div className="wnioski-card__actions">
                      <button className="wnioski-card__button wnioski-card__button--accept"
                        onClick={() => handleAcceptGuest(g.id)} disabled={isProc}>
                        {isProc ? 'Przetwarzanie...' : '✓ Zaakceptuj'}
                      </button>
                      <button className="wnioski-card__button wnioski-card__button--reject"
                        onClick={() => handleRejectGuest(g.id)} disabled={isProc}>
                        ✕ Odrzuć
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="panel-pagination">
            <div className="panel-pagination__controls">
              <button className="panel-pagination__btn"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={currentPage === 1}>← Poprzednia</button>
              <span className="panel-pagination__info">Strona {currentPage} z {totalPages}</span>
              <button className="panel-pagination__btn"
                onClick={() => setOffset(offset + limit)}
                disabled={currentPage === totalPages}>Następna →</button>
            </div>
          </div>
        )}
      </section>

      {/* Modal odrzucenia */}
      {rejectModal.open && (
        <div className="wnioski-modal-overlay" onClick={() => setRejectModal(m => ({ ...m, open: false }))}>
          <div className="wnioski-modal" onClick={e => e.stopPropagation()}>
            <div className="wnioski-modal__header">
              <h3 className="wnioski-modal__title">Odrzuć wniosek</h3>
              <button className="wnioski-modal__close" onClick={() => setRejectModal(m => ({ ...m, open: false }))}>✕</button>
            </div>
            <div className="wnioski-modal__body">
              {rejectModal.kind === 'guest' ? (
                <>
                  <p className="wnioski-modal__desc">
                    Możesz podać powód odrzucenia – zostanie wysłany e-mailem do gościa.
                  </p>
                  <textarea
                    className="wnioski-modal__textarea"
                    placeholder="Powód odrzucenia (opcjonalnie)..."
                    rows={4}
                    value={rejectModal.reason}
                    onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value }))}
                    autoFocus
                  />
                </>
              ) : (
                <p className="wnioski-modal__desc">
                  Czy na pewno chcesz odrzucić ten wniosek? Tej akcji nie można cofnąć.
                </p>
              )}
            </div>
            <div className="wnioski-modal__footer">
              <button
                className="wnioski-card__button wnioski-card__button--cancel"
                onClick={() => setRejectModal(m => ({ ...m, open: false }))}
              >
                Anuluj
              </button>
              <button
                className="wnioski-card__button wnioski-card__button--reject"
                onClick={handleConfirmReject}
              >
                ✕ Odrzuć
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

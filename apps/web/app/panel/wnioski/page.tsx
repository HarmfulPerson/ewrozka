'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import {
  apiAcceptMeetingRequest,
  apiRejectMeetingRequest,
  apiAcceptGuestBooking,
  apiRejectGuestBooking,
  apiGetWizardUnifiedRequests,
  type UnifiedRequestDto,
} from '../../lib/api-meetings';
import './wnioski.css';
import '../panel-shared.css';

const STATUS_LABELS: Record<string, string> = {
  pending:   'Oczekujące',
  accepted:  'Zaakceptowane',
  rejected:  'Odrzucone',
  paid:      'Opłacone',
  completed: 'Zakończone',
};

const PAGE_SIZES = [10, 20, 50, 100];
const VALID_FILTERS = ['', 'pending', 'accepted', 'paid', 'rejected'];

export default function WnioskiPage() {
  const searchParams = useSearchParams();
  const [user] = useState(() => getStoredUser());

  const [items, setItems]   = useState<UnifiedRequestDto[]>([]);
  const [total, setTotal]   = useState(0);

  const [offset, setOffset]             = useState(0);
  const [limit, setLimit]               = useState(20);
  const [statusFilter, setStatusFilter] = useState(() => {
    const fromUrl = searchParams.get('status') ?? 'pending';
    return VALID_FILTERS.includes(fromUrl) ? fromUrl : 'pending';
  });
  const [sortBy, setSortBy]             = useState('scheduledAt');
  const [sortOrder, setSortOrder]       = useState<'ASC' | 'DESC'>('DESC');

  const [loading, setLoading]           = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    id: string | null;
    kind: 'regular' | 'guest';
    reason: string;
    showError?: boolean;
  }>({ open: false, id: null, kind: 'guest', reason: '' });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetWizardUnifiedRequests(user.token, {
        status: statusFilter || undefined,
        limit, offset, sortBy, order: sortOrder,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się załadować wniosków');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, offset, limit, sortBy, sortOrder]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener('ewrozka:pending-requests-changed', handler);
    return () => window.removeEventListener('ewrozka:pending-requests-changed', handler);
  }, [fetchAll]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const notifyChanged = () => window.dispatchEvent(new Event('ewrozka:pending-requests-changed'));

  const handleAccept = async (item: UnifiedRequestDto) => {
    if (!user) return;
    setProcessingId(item.id);
    try {
      if (item.kind === 'regular') {
        await apiAcceptMeetingRequest(user.token, Number(item.id));
      } else {
        await apiAcceptGuestBooking(user.token, item.id);
      }
      toast.success('Wniosek zaakceptowany!');
      notifyChanged();
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd akceptacji');
    } finally { setProcessingId(null); }
  };

  const handleReject = (item: UnifiedRequestDto) => {
    setRejectModal({ open: true, id: item.id, kind: item.kind, reason: '' });
  };

  const handleConfirmReject = async () => {
    if (!user || rejectModal.id === null) return;
    const { id, kind, reason } = rejectModal;
    if (!reason.trim()) {
      setRejectModal(m => ({ ...m, showError: true }));
      return;
    }
    setRejectModal(m => ({ ...m, open: false }));
    setProcessingId(id);
    try {
      if (kind === 'regular') {
        await apiRejectMeetingRequest(user.token, Number(id), reason.trim());
      } else {
        await apiRejectGuestBooking(user.token, id, reason.trim());
      }
      toast.success('Wniosek odrzucony.');
      notifyChanged();
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd odrzucenia');
    } finally {
      setProcessingId(null);
      setRejectModal({ open: false, id: null, kind: 'guest', reason: '' });
    }
  };

  // ── Sorting ────────────────────────────────────────────────────────────────
  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(col);
      setSortOrder('DESC');
    }
    setOffset(0);
  };

  const SortArrow = ({ col }: { col: string }) => (
    <span className={`wnioski-sort-arrow${sortBy === col ? ' wnioski-sort-arrow--active' : ''}`}>
      {sortBy === col ? (sortOrder === 'ASC' ? '▲' : '▼') : '▼'}
    </span>
  );

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getJoinStatus = (startsAt: string | null) => {
    if (!startsAt) return { canJoin: false, tooltip: '' };
    const diff = new Date(startsAt).getTime() - 5 * 60 * 1000 - Date.now();
    if (diff <= 0) return { canJoin: true, tooltip: '' };
    const totalMins = Math.ceil(diff / 60000);
    const d = Math.floor(totalMins / 1440);
    const h = Math.floor((totalMins % 1440) / 60);
    const m = totalMins % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} d`);
    if (h > 0) parts.push(`${h} h`);
    if (m > 0 || parts.length === 0) parts.push(`${m} min`);
    return { canJoin: false, tooltip: `Dostępne za ${parts.join(' ')}` };
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading && items.length === 0) {
    return (
      <div className="panel-page wnioski-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page wnioski-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">
          Wnioski o spotkanie
        </h1>
      </div>

      <div className="wnioski-toolbar">
        <div className="wnioski-filters">
          {([
            ['', 'Wszystkie'],
            ['pending', 'Oczekujące'],
            ['accepted', 'Oczekujące na płatność'],
            ['paid', 'Opłacone'],
            ['rejected', 'Odrzucone'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              className={`wnioski-filter-btn${statusFilter === value ? ' wnioski-filter-btn--active' : ''}`}
              onClick={() => { setStatusFilter(value); setOffset(0); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="wnioski-table-wrap">
        {items.length === 0 ? (
          <p className="wnioski-empty">Brak wniosków dla wybranego filtra</p>
        ) : (
          <table className="wnioski-table">
            <thead>
              <tr>
                <th style={{ width: 65 }}>Typ</th>
                <th style={{ width: 170 }}>Klient</th>
                <th style={{ width: 140 }}>Ogłoszenie</th>
                <th style={{ width: 110 }} data-sortable onClick={() => toggleSort('scheduledAt')}>
                  <span className="wnioski-th-inner">Data <SortArrow col="scheduledAt" /></span>
                </th>
                {statusFilter === '' ? (
                  <th style={{ width: 120 }} data-sortable onClick={() => toggleSort('status')}>
                    <span className="wnioski-th-inner">Status <SortArrow col="status" /></span>
                  </th>
                ) : (
                  <th style={{ width: 120 }}>Status</th>
                )}
                <th style={{ width: 145 }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isProc = processingId === item.id;
                const isPending = item.unifiedStatus === 'pending';
                const isAccepted = item.unifiedStatus === 'accepted';
                const isPaid = item.unifiedStatus === 'paid';
                const dateStr = item.scheduledAt;

                return (
                  <tr key={`${item.kind}-${item.id}`}>
                    <td>
                      <span className={`wnioski-type-badge wnioski-type-badge--${item.kind === 'regular' ? 'regular' : 'guest'}`}>
                        {item.kind === 'regular' ? 'Klient' : 'Gość'}
                      </span>
                    </td>
                    <td>
                      <span className="wnioski-cell-client">{item.clientName || 'Klient'}</span>
                      {item.kind === 'guest' && item.clientEmail && (
                        <span className="wnioski-cell-client__sub">{item.clientEmail}</span>
                      )}
                    </td>
                    <td>{item.advertisementTitle ?? 'Konsultacja'}</td>
                    <td className="wnioski-cell-date">
                      {dateStr ? (
                        <>
                          {fmtDate(dateStr)}
                          <span className="wnioski-cell-date__time">
                            {fmtTime(dateStr)}
                            {item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`wnioski-status wnioski-status--${item.unifiedStatus}`}>
                        {STATUS_LABELS[item.unifiedStatus] ?? item.unifiedStatus}
                      </span>
                    </td>
                    <td>
                      <div className="wnioski-actions">
                        {isPending && (
                          <>
                            <button className="wnioski-btn wnioski-btn--accept" onClick={() => handleAccept(item)} disabled={isProc}>
                              ✓
                            </button>
                            <button className="wnioski-btn wnioski-btn--reject" onClick={() => handleReject(item)} disabled={isProc}>
                              ✕
                            </button>
                          </>
                        )}
                        {isAccepted && (
                          <button className="wnioski-btn wnioski-btn--reject" onClick={() => handleReject(item)} disabled={isProc}>
                            ✕ Odrzuć
                          </button>
                        )}
                        {isPaid && item.kind === 'regular' && item.meetingToken && (() => {
                          const { canJoin, tooltip } = getJoinStatus(item.appointmentStartsAt);
                          return canJoin ? (
                            <Link href={`/spotkanie/${item.meetingToken}`} className="wnioski-btn wnioski-btn--join">
                              Dołącz
                            </Link>
                          ) : (
                            <span className="wnioski-join-wrap">
                              <span className="wnioski-btn wnioski-btn--join wnioski-btn--disabled">Dołącz</span>
                              <span className="wnioski-tooltip">{tooltip}</span>
                            </span>
                          );
                        })()}
                        {isPaid && item.kind === 'guest' && item.scheduledAt && (() => {
                          const { canJoin, tooltip } = getJoinStatus(item.scheduledAt);
                          return canJoin ? (
                            <Link href={`/panel/spotkanie-gosc/${item.id}`} className="wnioski-btn wnioski-btn--join">
                              Dołącz
                            </Link>
                          ) : (
                            <span className="wnioski-join-wrap">
                              <span className="wnioski-btn wnioski-btn--join wnioski-btn--disabled">Dołącz</span>
                              <span className="wnioski-tooltip">{tooltip}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="wnioski-pagination">
        <div className="wnioski-pagination__per-page">
          <span className="wnioski-pagination__label">Wierszy:</span>
          <select
            className="wnioski-pagination__select"
            value={limit}
            onChange={e => { setLimit(Number(e.target.value)); setOffset(0); }}
          >
            {PAGE_SIZES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="wnioski-pagination__nav">
          <button className="wnioski-pagination__btn"
            onClick={() => setOffset(0)}
            disabled={currentPage === 1}>
            «
          </button>
          <button className="wnioski-pagination__btn"
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={currentPage === 1}>
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] ?? 0) > 1) acc.push('dots');
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === 'dots' ? (
                <span key={`dots-${idx}`} className="wnioski-pagination__dots">…</span>
              ) : (
                <button
                  key={item}
                  className={`wnioski-pagination__btn${item === currentPage ? ' wnioski-pagination__btn--active' : ''}`}
                  onClick={() => setOffset((item - 1) * limit)}
                >
                  {item}
                </button>
              )
            )}

          <button className="wnioski-pagination__btn"
            onClick={() => setOffset(offset + limit)}
            disabled={currentPage === totalPages}>
            ›
          </button>
          <button className="wnioski-pagination__btn"
            onClick={() => setOffset((totalPages - 1) * limit)}
            disabled={currentPage === totalPages}>
            »
          </button>
        </div>

        <span className="wnioski-pagination__info">
          {total > 0 ? `${offset + 1}–${Math.min(offset + limit, total)} z ${total}` : '0 z 0'}
        </span>
      </div>

      {/* Modal odrzucenia */}
      {rejectModal.open && (
        <div className="wnioski-modal-overlay" onClick={() => setRejectModal(m => ({ ...m, open: false }))}>
          <div className="wnioski-modal" onClick={e => e.stopPropagation()}>
            <div className="wnioski-modal__header">
              <h3 className="wnioski-modal__title">Odrzuć wniosek</h3>
              <button className="wnioski-modal__close" onClick={() => setRejectModal(m => ({ ...m, open: false }))}>✕</button>
            </div>
            <div className="wnioski-modal__body">
              <textarea
                className={`wnioski-modal__textarea${rejectModal.showError ? ' wnioski-modal__textarea--error' : ''}`}
                placeholder="Powód odrzucenia..."
                rows={3}
                value={rejectModal.reason}
                onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value, showError: false }))}
                autoFocus
              />
              {rejectModal.showError && (
                <p className="wnioski-modal__error">Podaj powód odrzucenia</p>
              )}
            </div>
            <div className="wnioski-modal__footer">
              <button className="wnioski-btn wnioski-btn--cancel" onClick={() => setRejectModal(m => ({ ...m, open: false }))}>
                Anuluj
              </button>
              <button className="wnioski-btn wnioski-btn--reject" onClick={handleConfirmReject}>
                ✕ Odrzuć
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

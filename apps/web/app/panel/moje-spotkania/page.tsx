'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetClientUnifiedRequests, type ClientRequestDto } from '../../lib/api-meetings';
import { apiRateAppointment } from '../../lib/api-calendar';
import { PaymentModal } from '../../components/payment/PaymentModal';
import '../wnioski/wnioski.css';
import '../panel-shared.css';

const STATUS_LABELS: Record<string, string> = {
  pending:    'Oczekujące',
  accepted:   'Do opłacenia',
  paid:       'Opłacone',
  completed:  'Zakończone',
  rejected:   'Odrzucone',
  cancelled:  'Anulowane',
};

const PAGE_SIZES = [10, 20, 50, 100];
const VALID_FILTERS = ['', 'pending', 'accepted', 'paid', 'completed', 'rejected', 'cancelled'];

export default function MojeSpotkania() {
  const searchParams = useSearchParams();
  const [user] = useState(() => getStoredUser());

  const [items, setItems] = useState<ClientRequestDto[]>([]);
  const [total, setTotal] = useState(0);

  const [offset, setOffset]             = useState(0);
  const [limit, setLimit]               = useState(20);
  const [statusFilter, setStatusFilter] = useState(() => {
    const fromUrl = searchParams.get('status') ?? '';
    return VALID_FILTERS.includes(fromUrl) ? fromUrl : '';
  });
  const [sortBy, setSortBy]             = useState('scheduledAt');
  const [sortOrder, setSortOrder]       = useState<'ASC' | 'DESC'>('DESC');

  const [loading, setLoading]           = useState(true);

  // Rating
  const [hoverRating, setHoverRating] = useState<Record<string, number>>({});
  const [pendingRating, setPendingRating] = useState<Record<string, { stars: number; comment: string }>>({});
  const [submittingRating, setSubmittingRating] = useState<string | null>(null);

  // Payment
  const [paymentModal, setPaymentModal] = useState<{
    appointmentId: number;
    amountZl: string;
    title: string;
  } | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetClientUnifiedRequests(user.token, {
        status: statusFilter || undefined,
        limit, offset, sortBy, order: sortOrder,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, offset, limit, sortBy, sortOrder]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handlePay = (item: ClientRequestDto) => {
    if (!item.appointmentId) return;
    setPaymentModal({
      appointmentId: item.appointmentId,
      amountZl: item.priceGrosze ? `${(item.priceGrosze / 100).toFixed(2)} zł` : 'Płatność',
      title: item.advertisementTitle || 'Konsultacja',
    });
  };

  const handlePaymentSuccess = () => {
    setPaymentModal(null);
    toast.success('Płatność zakończona pomyślnie!');
    fetchAll();
  };

  const handleSelectStar = (itemId: string, stars: number) => {
    setPendingRating(prev => ({
      ...prev,
      [itemId]: { stars, comment: prev[itemId]?.comment ?? '' },
    }));
  };

  const handleSubmitRating = async (item: ClientRequestDto) => {
    if (!user || !item.appointmentId) return;
    const pending = pendingRating[item.id];
    if (!pending) return;
    setSubmittingRating(item.id);
    try {
      await apiRateAppointment(user.token, item.appointmentId, pending.stars, pending.comment || undefined);
      toast.success(`Oceniłeś spotkanie na ${pending.stars} ${pending.stars === 1 ? 'gwiazdkę' : pending.stars < 5 ? 'gwiazdki' : 'gwiazdek'}!`);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, rating: pending.stars } : i));
      setPendingRating(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zapisać oceny');
    } finally {
      setSubmittingRating(null);
    }
  };

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
        <h1 className="panel-page__title">Moje spotkania</h1>
      </div>

      <div className="wnioski-toolbar">
        <div className="wnioski-filters">
          {([
            ['', 'Wszystkie'],
            ['pending', 'Oczekujące'],
            ['accepted', 'Do opłacenia'],
            ['paid', 'Opłacone'],
            ['completed', 'Zakończone'],
            ['cancelled', 'Anulowane'],
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
          <p className="wnioski-empty">
            Brak spotkań dla wybranego filtra.{' '}
            <Link href="/ogloszenia" style={{ color: 'var(--accent-hover)', textDecoration: 'underline' }}>
              Przejdź do wróżek
            </Link>
          </p>
        ) : (
          <table className="wnioski-table">
            <thead>
              <tr>
                <th>Wróżka</th>
                <th>Ogłoszenie</th>
                <th data-sortable onClick={() => toggleSort('scheduledAt')}>
                  <span className="wnioski-th-inner">Data <SortArrow col="scheduledAt" /></span>
                </th>
                {statusFilter === '' ? (
                  <th data-sortable onClick={() => toggleSort('status')}>
                    <span className="wnioski-th-inner">Status <SortArrow col="status" /></span>
                  </th>
                ) : (
                  <th>Status</th>
                )}
                <th style={{ width: 200 }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const dateStr = item.scheduledAt;
                const isPaid = item.unifiedStatus === 'paid';
                const isAccepted = item.unifiedStatus === 'accepted';
                const isCompleted = item.unifiedStatus === 'completed';
                const currentHover = hoverRating[item.id] ?? 0;
                const displayRating = currentHover || item.rating || 0;
                const isSubmitting = submittingRating === item.id;

                return (
                  <tr key={`${item.kind}-${item.id}`}>
                    <td>
                      <span className="wnioski-cell-client">{item.wrozkaUsername || 'Wróżka'}</span>
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
                        {isAccepted && item.appointmentId && (
                          <button className="wnioski-btn wnioski-btn--join" onClick={() => handlePay(item)}>
                            Zapłać
                          </button>
                        )}
                        {isPaid && item.meetingToken && dateStr && (() => {
                          const { canJoin, tooltip } = getJoinStatus(dateStr);
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
                        {isCompleted && item.rating == null && (
                          <div className="wnioski-rating-inline">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                disabled={isSubmitting}
                                className={`wnioski-star${star <= (pendingRating[item.id]?.stars ?? displayRating) ? ' wnioski-star--filled' : ''}`}
                                onMouseEnter={() => setHoverRating(prev => ({ ...prev, [item.id]: star }))}
                                onMouseLeave={() => setHoverRating(prev => { const n = { ...prev }; delete n[item.id]; return n; })}
                                onClick={() => handleSelectStar(item.id, star)}
                              >
                                ★
                              </button>
                            ))}
                            {pendingRating[item.id] && (
                              <button
                                className="wnioski-btn wnioski-btn--accept"
                                disabled={isSubmitting}
                                onClick={() => handleSubmitRating(item)}
                              >
                                {isSubmitting ? '...' : 'Zapisz'}
                              </button>
                            )}
                          </div>
                        )}
                        {isCompleted && item.rating != null && (
                          <div className="wnioski-rating-inline wnioski-rating-inline--static">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className={`wnioski-star wnioski-star--static${star <= item.rating! ? ' wnioski-star--filled' : ''}`}>
                                ★
                              </span>
                            ))}
                          </div>
                        )}
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
            disabled={currentPage === 1}>«</button>
          <button className="wnioski-pagination__btn"
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={currentPage === 1}>‹</button>

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
                >{item}</button>
              )
            )}

          <button className="wnioski-pagination__btn"
            onClick={() => setOffset(offset + limit)}
            disabled={currentPage === totalPages}>›</button>
          <button className="wnioski-pagination__btn"
            onClick={() => setOffset((totalPages - 1) * limit)}
            disabled={currentPage === totalPages}>»</button>
        </div>

        <span className="wnioski-pagination__info">
          {total > 0 ? `${offset + 1}–${Math.min(offset + limit, total)} z ${total}` : '0 z 0'}
        </span>
      </div>

      {paymentModal && user && (
        <PaymentModal
          token={user.token}
          appointmentId={paymentModal.appointmentId}
          amountZl={paymentModal.amountZl}
          title={paymentModal.title}
          onClose={() => setPaymentModal(null)}
          onSuccess={() => handlePaymentSuccess()}
        />
      )}
    </div>
  );
}

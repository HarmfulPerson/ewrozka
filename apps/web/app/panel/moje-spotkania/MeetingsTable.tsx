'use client';

import Link from 'next/link';
import { type ClientRequestDto } from '../../lib/api-meetings';

const STATUS_LABELS: Record<string, string> = {
  pending:    'Oczekujące',
  accepted:   'Do opłacenia',
  paid:       'Opłacone',
  completed:  'Zakończone',
  rejected:   'Odrzucone',
  cancelled:  'Anulowane',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

interface MeetingsTableProps {
  items: ClientRequestDto[];
  statusFilter: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  toggleSort: (col: string) => void;
  hoverRating: Record<string, number>;
  setHoverRating: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  pendingRating: Record<string, { stars: number; comment: string }>;
  submittingRating: string | null;
  handlePay: (item: ClientRequestDto) => void;
  handleSelectStar: (itemId: string, stars: number) => void;
  handleSubmitRating: (item: ClientRequestDto) => void;
  getJoinStatus: (startsAt: string | null) => { canJoin: boolean; tooltip: string };
}

function SortArrow({ col, sortBy, sortOrder }: { col: string; sortBy: string; sortOrder: 'ASC' | 'DESC' }) {
  return (
    <span className={`wnioski-sort-arrow${sortBy === col ? ' wnioski-sort-arrow--active' : ''}`}>
      {sortBy === col ? (sortOrder === 'ASC' ? '▲' : '▼') : '▼'}
    </span>
  );
}

export function MeetingsTable({
  items,
  statusFilter,
  sortBy,
  sortOrder,
  toggleSort,
  hoverRating,
  setHoverRating,
  pendingRating,
  submittingRating,
  handlePay,
  handleSelectStar,
  handleSubmitRating,
  getJoinStatus,
}: MeetingsTableProps) {
  if (items.length === 0) {
    return (
      <div className="wnioski-table-wrap">
        <p className="wnioski-empty">
          Brak spotkań dla wybranego filtra.{' '}
          <Link href="/ogloszenia" style={{ color: 'var(--accent-hover)', textDecoration: 'underline' }}>
            Przejdź do wróżek
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="wnioski-table-wrap">
      <table className="wnioski-table">
        <thead>
          <tr>
            <th>Wróżka</th>
            <th>Ogłoszenie</th>
            <th data-sortable onClick={() => toggleSort('scheduledAt')}>
              <span className="wnioski-th-inner">Data <SortArrow col="scheduledAt" sortBy={sortBy} sortOrder={sortOrder} /></span>
            </th>
            {statusFilter === '' ? (
              <th data-sortable onClick={() => toggleSort('status')}>
                <span className="wnioski-th-inner">Status <SortArrow col="status" sortBy={sortBy} sortOrder={sortOrder} /></span>
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
            const currentHover = hoverRating[item.uid] ?? 0;
            const displayRating = currentHover || item.rating || 0;
            const isSubmitting = submittingRating === item.uid;

            return (
              <tr key={`${item.kind}-${item.uid}`}>
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
                    {isAccepted && item.appointmentUid && (
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
                            className={`wnioski-star${star <= (pendingRating[item.uid]?.stars ?? displayRating) ? ' wnioski-star--filled' : ''}`}
                            onMouseEnter={() => setHoverRating(prev => ({ ...prev, [item.uid]: star }))}
                            onMouseLeave={() => setHoverRating(prev => { const n = { ...prev }; delete n[item.uid]; return n; })}
                            onClick={() => handleSelectStar(item.uid, star)}
                          >
                            ★
                          </button>
                        ))}
                        {pendingRating[item.uid] && (
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
    </div>
  );
}

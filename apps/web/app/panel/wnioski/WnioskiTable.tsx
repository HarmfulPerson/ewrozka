'use client';

import Link from 'next/link';
import type { UnifiedRequestDto } from '../../lib/api-meetings';
import { STATUS_LABELS } from './types';
import { getJoinStatus, fmtDate, fmtTime } from './helpers';
import { SortArrow } from './SortArrow';

interface WnioskiTableProps {
  items: UnifiedRequestDto[];
  statusFilter: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  processingId: string | null;
  onToggleSort: (col: string) => void;
  onAccept: (item: UnifiedRequestDto) => void;
  onReject: (item: UnifiedRequestDto) => void;
}

export function WnioskiTable({
  items, statusFilter, sortBy, sortOrder, processingId,
  onToggleSort, onAccept, onReject,
}: WnioskiTableProps) {
  if (items.length === 0) {
    return <p className="wnioski-empty">Brak wniosków dla wybranego filtra</p>;
  }

  return (
    <table className="wnioski-table">
      <thead>
        <tr>
          <th style={{ width: 65 }}>Typ</th>
          <th style={{ width: 170 }}>Klient</th>
          <th style={{ width: 140 }}>Ogłoszenie</th>
          <th style={{ width: 110 }} data-sortable onClick={() => onToggleSort('scheduledAt')}>
            <span className="wnioski-th-inner">Data <SortArrow col="scheduledAt" sortBy={sortBy} sortOrder={sortOrder} /></span>
          </th>
          {statusFilter === '' ? (
            <th style={{ width: 120 }} data-sortable onClick={() => onToggleSort('status')}>
              <span className="wnioski-th-inner">Status <SortArrow col="status" sortBy={sortBy} sortOrder={sortOrder} /></span>
            </th>
          ) : (
            <th style={{ width: 120 }}>Status</th>
          )}
          <th style={{ width: 145 }}>Akcje</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => {
          const isProc = processingId === item.uid;
          const isPending = item.unifiedStatus === 'pending';
          const isAccepted = item.unifiedStatus === 'accepted';
          const isPaid = item.unifiedStatus === 'paid';
          const dateStr = item.scheduledAt;

          return (
            <tr key={`${item.kind}-${item.uid}`}>
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
                      <button className="wnioski-btn wnioski-btn--accept" onClick={() => onAccept(item)} disabled={isProc}>
                        ✓
                      </button>
                      <button className="wnioski-btn wnioski-btn--reject" onClick={() => onReject(item)} disabled={isProc}>
                        ✕
                      </button>
                    </>
                  )}
                  {isAccepted && (
                    <button className="wnioski-btn wnioski-btn--reject" onClick={() => onReject(item)} disabled={isProc}>
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
                      <Link href={`/panel/spotkanie-gosc/${item.uid}`} className="wnioski-btn wnioski-btn--join">
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
  );
}

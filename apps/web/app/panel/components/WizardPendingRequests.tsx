'use client';

import Link from 'next/link';
import type { UnifiedRequestDto } from '../../lib/api-meetings';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', {
    hour: '2-digit', minute: '2-digit',
  });
}

interface WizardPendingRequestsProps {
  items: UnifiedRequestDto[];
  loading: boolean;
  processingId: string | null;
  onAccept: (item: UnifiedRequestDto) => void;
  onReject: (item: UnifiedRequestDto) => void;
}

export function WizardPendingRequests({ items, loading, processingId, onAccept, onReject }: WizardPendingRequestsProps) {
  return (
    <section className="dashboard__section">
      <div className="dashboard__section-head">
        <h2 className="dashboard__section-title">
          <span className="dashboard__section-icon">✉️</span>
          Prośby o spotkanie
        </h2>
        <Link href="/panel/wnioski?status=pending" className="dashboard__section-link">
          Zobacz wszystkie →
        </Link>
      </div>

      {loading ? (
        <div className="dashboard__loading">Ładowanie…</div>
      ) : items.length === 0 ? (
        <div className="dashboard__empty">
          <span>Brak nowych próśb</span>
        </div>
      ) : (
        <div className="dashboard__card-list">
          {items.map((item) => {
            const isProc = processingId === item.uid;
            return (
              <div key={`${item.kind}-${item.uid}`} className="dashboard__card">
                <div className="dashboard__card-date">
                  {item.scheduledAt ? (
                    <>
                      <span className="dashboard__card-date-day">{formatDate(item.scheduledAt)}</span>
                      <span className="dashboard__card-date-time">{formatTime(item.scheduledAt)}</span>
                    </>
                  ) : (
                    <span className="dashboard__card-date-day">—</span>
                  )}
                </div>
                <div className="dashboard__card-body">
                  <p className="dashboard__card-title">
                    {item.clientName || 'Klient'}
                    {item.kind === 'guest' && <span className="dashboard__card-tag dashboard__card-tag--guest">Gość</span>}
                  </p>
                  <p className="dashboard__card-sub">{item.advertisementTitle || 'Konsultacja'}</p>
                  {item.message && <p className="dashboard__card-msg">„{item.message}"</p>}
                </div>
                <div className="dashboard__card-actions">
                  <button className="dashboard__card-btn dashboard__card-btn--accept" onClick={() => onAccept(item)} disabled={isProc}>✓</button>
                  <button className="dashboard__card-btn dashboard__card-btn--reject" onClick={() => onReject(item)} disabled={isProc}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

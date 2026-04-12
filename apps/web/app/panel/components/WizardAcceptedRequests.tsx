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

interface WizardAcceptedRequestsProps {
  items: UnifiedRequestDto[];
  loading: boolean;
  processingId: string | null;
  onReject: (item: UnifiedRequestDto) => void;
}

export function WizardAcceptedRequests({ items, loading, processingId, onReject }: WizardAcceptedRequestsProps) {
  if (loading || items.length === 0) return null;

  return (
    <section className="dashboard__section dashboard__section--full">
      <div className="dashboard__section-head">
        <h2 className="dashboard__section-title">
          <span className="dashboard__section-icon">⏳</span>
          Oczekujące na płatność
        </h2>
        <Link href="/panel/wnioski?status=accepted" className="dashboard__section-link">
          Zobacz wszystkie →
        </Link>
      </div>
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
              </div>
              <div className="dashboard__card-actions">
                <span className="dashboard__card-status dashboard__card-status--accepted">Zaakceptowane</span>
                <button className="dashboard__card-btn dashboard__card-btn--reject" onClick={() => onReject(item)} disabled={isProc}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

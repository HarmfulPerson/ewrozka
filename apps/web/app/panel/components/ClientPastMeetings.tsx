'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  apiGetCompletedAppointments,
  apiRateAppointment,
  type AppointmentDto,
} from '../../lib/api-calendar';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', {
    hour: '2-digit', minute: '2-digit',
  });
}

interface ClientPastMeetingsProps {
  token: string;
}

export function ClientPastMeetings({ token }: ClientPastMeetingsProps) {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverRating, setHoverRating] = useState<Record<string, number>>({});
  const [submittingRating, setSubmittingRating] = useState<string | null>(null);
  const [pendingRating, setPendingRating] = useState<Record<string, { stars: number; comment: string }>>({});

  const fetchData = useCallback(() => {
    setLoading(true);
    apiGetCompletedAppointments(token, { limit: 3 })
      .then((res) => setAppointments((res.appointments || []).slice(0, 3)))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelectStar = (apt: AppointmentDto, stars: number) => {
    setPendingRating(prev => ({
      ...prev,
      [apt.uid]: { stars, comment: prev[apt.uid]?.comment ?? '' },
    }));
  };

  const handleSubmitRating = async (apt: AppointmentDto) => {
    const pending = pendingRating[apt.uid];
    if (!pending) return;
    setSubmittingRating(apt.uid);
    try {
      // Phase 3: rate by uid.
      await apiRateAppointment(token, apt.uid, pending.stars, pending.comment || undefined);
      toast.success(`Oceniono na ${pending.stars} ${pending.stars === 1 ? 'gwiazdkę' : pending.stars < 5 ? 'gwiazdki' : 'gwiazdek'}!`);
      setAppointments(prev => prev.map(a => a.uid === apt.uid ? { ...a, rating: pending.stars } : a));
      setPendingRating(prev => { const n = { ...prev }; delete n[apt.uid]; return n; });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zapisać oceny');
    } finally {
      setSubmittingRating(null);
    }
  };

  return (
    <section className="dashboard__section">
      <div className="dashboard__section-head">
        <h2 className="dashboard__section-title">
          <span className="dashboard__section-icon">✓</span>
          Odbyte spotkania
        </h2>
        <Link href="/panel/moje-spotkania?status=completed" className="dashboard__section-link">
          Zobacz wszystkie →
        </Link>
      </div>

      {loading ? (
        <div className="dashboard__loading">Ładowanie…</div>
      ) : appointments.length === 0 ? (
        <div className="dashboard__empty">
          <span>Brak odbytych spotkań</span>
        </div>
      ) : (
        <div className="dashboard__card-list">
          {appointments.map((apt) => {
            const displayRating = hoverRating[apt.uid] ?? apt.rating ?? 0;
            const isSubmitting = submittingRating === apt.uid;

            return (
              <div key={apt.uid} className="dashboard__card">
                <div className="dashboard__card-date">
                  <span className="dashboard__card-date-day">{formatDate(apt.startsAt)}</span>
                  <span className="dashboard__card-date-time">{formatTime(apt.startsAt)}</span>
                </div>
                <div className="dashboard__card-body">
                  <p className="dashboard__card-title">
                    {apt.advertisementTitle || 'Konsultacja'}
                  </p>
                  <p className="dashboard__card-sub">
                    {apt.wrozkaUsername || '—'}
                  </p>
                </div>
                <div className="dashboard__card-actions">
                  {apt.rating != null ? (
                    <div className="dashboard__card-stars">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className={`dashboard__card-star${s <= apt.rating! ? ' dashboard__card-star--filled' : ''}`}>★</span>
                      ))}
                    </div>
                  ) : (
                    <div className="dashboard__card-stars">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          key={s}
                          type="button"
                          disabled={isSubmitting}
                          className={`dashboard__card-star dashboard__card-star--btn${s <= (pendingRating[apt.uid]?.stars ?? displayRating) ? ' dashboard__card-star--filled' : ''}`}
                          onMouseEnter={() => setHoverRating(prev => ({ ...prev, [apt.uid]: s }))}
                          onMouseLeave={() => setHoverRating(prev => { const n = { ...prev }; delete n[apt.uid]; return n; })}
                          onClick={() => handleSelectStar(apt, s)}
                        >★</button>
                      ))}
                      {pendingRating[apt.uid] && (
                        <button
                          type="button"
                          className="dashboard__card-btn-join"
                          disabled={isSubmitting}
                          onClick={() => handleSubmitRating(apt)}
                          style={{ marginLeft: '0.375rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        >
                          {isSubmitting ? '…' : 'Zapisz'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

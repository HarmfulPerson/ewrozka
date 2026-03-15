'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGetUpcomingAppointments, type AppointmentDto } from '../../lib/api-calendar';

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

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'minęło';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `za ${days} d ${hours} h`;
  if (hours > 0) return `za ${hours} h ${mins} min`;
  return `za ${mins} min`;
}

interface ClientUpcomingMeetingsProps {
  token: string;
}

export function ClientUpcomingMeetings({ token }: ClientUpcomingMeetingsProps) {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetUpcomingAppointments(token, { limit: 3 })
      .then((res) => setAppointments((res.appointments || []).slice(0, 3)))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <section className="dashboard__section">
      <div className="dashboard__section-head">
        <h2 className="dashboard__section-title">
          <span className="dashboard__section-icon">📅</span>
          Nadchodzące spotkania
        </h2>
        <Link href="/panel/moje-spotkania?status=paid" className="dashboard__section-link">
          Zobacz wszystkie →
        </Link>
      </div>

      {loading ? (
        <div className="dashboard__loading">Ładowanie…</div>
      ) : appointments.length === 0 ? (
        <div className="dashboard__empty">
          <span>Brak nadchodzących spotkań</span>
        </div>
      ) : (
        <div className="dashboard__card-list">
          {appointments.map((apt) => {
            const now = Date.now();
            const start = new Date(apt.startsAt).getTime();
            const fiveMin = start - 5 * 60 * 1000;
            const duration = apt.durationMinutes || 60;
            const end = start + duration * 60 * 1000;
            const isActive = now >= fiveMin && now < end;
            const isPast = now >= end;

            return (
              <div key={apt.id} className="dashboard__card">
                <div className="dashboard__card-date">
                  <span className="dashboard__card-date-day">{formatDate(apt.startsAt)}</span>
                  <span className="dashboard__card-date-time">{formatTime(apt.startsAt)}</span>
                </div>
                <div className="dashboard__card-body">
                  <p className="dashboard__card-title">
                    {apt.advertisementTitle || 'Konsultacja'}
                  </p>
                  <p className="dashboard__card-sub">
                    {apt.wrozkaUsername || '—'} · {duration} min
                  </p>
                </div>
                <div className="dashboard__card-actions">
                  {!isPast && (
                    <span className="dashboard__card-meta">
                      {isActive ? '🟢 Trwa' : timeUntil(apt.startsAt)}
                    </span>
                  )}
                  {isActive && apt.meetingToken && (
                    <Link href={`/spotkanie/${apt.meetingToken}`} className="dashboard__card-btn-join">
                      Dołącz →
                    </Link>
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

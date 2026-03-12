'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGetUpcomingAppointments, type AppointmentDto } from '../../lib/api-calendar';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
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
    apiGetUpcomingAppointments(token, { limit: 20 })
      .then((res) => setAppointments(res.appointments || []))
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
        <Link href="/panel/moje-spotkania" className="dashboard__section-link">
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
        <div className="dashboard__list dashboard__list--scroll">
          {appointments.map((apt) => {
            const now = Date.now();
            const start = new Date(apt.startsAt).getTime();
            const fiveMin = start - 5 * 60 * 1000;
            const duration = apt.durationMinutes || 60;
            const end = start + duration * 60 * 1000;
            const isActive = now >= fiveMin && now < end;
            const isPast = now >= end;

            return (
              <div key={apt.id} className="dashboard__appointment-card">
                <div className="dashboard__apt-date">
                  <span className="dashboard__apt-day">{formatDate(apt.startsAt)}</span>
                  <span className="dashboard__apt-time">{formatTime(apt.startsAt)}</span>
                </div>
                <div className="dashboard__apt-info">
                  <p className="dashboard__apt-client">
                    {apt.advertisementTitle || 'Konsultacja'}
                  </p>
                  <p className="dashboard__apt-duration">
                    Wróżka: {apt.wrozkaUsername || '—'} · {duration} min
                  </p>
                </div>
                <div className="dashboard__apt-right">
                  {!isPast && (
                    <span className="dashboard__apt-until">
                      {isActive ? '🟢 Trwa' : timeUntil(apt.startsAt)}
                    </span>
                  )}
                  {isActive && apt.meetingToken && (
                    <Link
                      href={`/spotkanie/${apt.meetingToken}`}
                      className="dashboard__apt-join"
                    >
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

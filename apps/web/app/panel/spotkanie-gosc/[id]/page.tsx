'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getStoredUser } from '../../../lib/auth-mock';
import { apiGetWizardGuestBookingMeetingRoom } from '../../../lib/api-meetings';
import VideoCall from '../../../spotkanie/components/video-call';
import '../../../spotkanie/spotkanie.css';
import '../../../guest/spotkanie/[token]/guest-spotkanie.css';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function WizardGuestSpotkaniePage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const user = getStoredUser();

  const [room, setRoom] = useState<{
    roomUrl: string;
    token: string;
    booking: { guestName: string; scheduledAt: string; durationMinutes: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tooEarly, setTooEarly] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [inCall, setInCall] = useState(false);

  const fetchRoom = useCallback(async () => {
    if (!bookingId || !user?.token) return;
    try {
      const data = await apiGetWizardGuestBookingMeetingRoom(user.token, bookingId);
      const scheduledAt = new Date(data.booking.scheduledAt);
      const availableAt = new Date(scheduledAt.getTime() - 5 * 60 * 1000);
      if (new Date() < availableAt) {
        setTooEarly(true);
        const tick = setInterval(() => {
          const ms = availableAt.getTime() - Date.now();
          if (ms <= 0) {
            clearInterval(tick);
            setTooEarly(false);
          } else {
            setCountdown(formatCountdown(ms));
          }
        }, 1000);
      }
      setRoom(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dołączyć do spotkania');
    } finally {
      setLoading(false);
    }
  }, [bookingId, user?.token]);

  useEffect(() => {
    if (!user?.token) {
      router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
      return;
    }
    fetchRoom();
  }, [fetchRoom, user?.token, router]);

  if (loading) {
    return (
      <div className="spotkanie-page">
        <div className="spotkanie-loading">
          <div className="spotkanie-spinner" />
          <p>Ładowanie pokoju spotkania...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spotkanie-page">
        <div className="spotkanie-error">
          <h2>Błąd</h2>
          <p>{error}</p>
          <button onClick={() => router.push('/panel')} style={{ marginTop: '1rem' }}>
            ← Wróć do panelu
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  if (inCall) {
    return (
      <div className="spotkanie-call-wrapper spotkanie-call-wrapper--fill">
        <VideoCall
          roomUrl={room.roomUrl}
          meetingToken={room.token}
          userName={user?.username}
          onLeave={() => router.push('/panel')}
        />
      </div>
    );
  }

  const scheduledAt = new Date(room.booking.scheduledAt);

  return (
    <div className="spotkanie-page">
      <div className="spotkanie-card">
        <div className="spotkanie-card__icon">🎥</div>
        <h1 className="spotkanie-card__title">Spotkanie z gościem</h1>
        <p className="spotkanie-card__guest">
          Gość: <strong>{room.booking.guestName}</strong>
        </p>

        <div className="spotkanie-card__info">
          <div className="spotkanie-info-row">
            <span>📅 Termin:</span>
            <strong>
              {scheduledAt.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })},{' '}
              {scheduledAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
            </strong>
          </div>
          <div className="spotkanie-info-row">
            <span>⏱ Czas trwania:</span>
            <strong>{room.booking.durationMinutes} minut</strong>
          </div>
        </div>

        <div className="spotkanie-card__actions">
          {tooEarly ? (
            <div className="spotkanie-tooearly">
              <p>Spotkanie będzie dostępne za:</p>
              <div className="spotkanie-countdown">{countdown}</div>
              <p className="spotkanie-tooearly__hint">Możesz dołączyć 5 minut przed planowaną godziną.</p>
            </div>
          ) : (
            <button className="spotkanie-join-btn" onClick={() => setInCall(true)}>
              Dołącz do spotkania
            </button>
          )}
          <button className="spotkanie-back-btn spotkanie-back-btn--ghost" onClick={() => router.push('/panel')}>
            ← Wróć do panelu
          </button>
        </div>
      </div>
    </div>
  );
}

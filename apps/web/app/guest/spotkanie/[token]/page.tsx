'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiGetGuestMeetingRoom } from '../../../lib/api-meetings';
import VideoCall from '../../../spotkanie/components/video-call';
import '../../../spotkanie/spotkanie.css';
import './guest-spotkanie.css';

interface GuestRoomInfo {
  roomUrl: string;
  token: string;
  booking: {
    wizardName: string;
    scheduledAt: string;
    durationMinutes: number;
    guestName: string;
  };
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function GuestSpotkaniePage() {
  const params = useParams();
  const token = params.token as string;

  const [room, setRoom] = useState<GuestRoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tooEarly, setTooEarly] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [inCall, setInCall] = useState(false);

  const fetchRoom = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGetGuestMeetingRoom(token);
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
      setError(err instanceof Error ? err.message : 'Nieprawidłowy lub wygasły link');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  if (loading) {
    return (
      <div className="spotkanie-page">
        <div className="spotkanie-loading">
          <div className="spotkanie-spinner" />
          <p>Weryfikowanie linku...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spotkanie-page">
        <div className="spotkanie-error">
          <h2>Link nieprawidłowy</h2>
          <p>{error}</p>
          <p className="guest-spotkanie__hint">
            Upewnij się, że korzystasz z linku wysłanego na Twój adres e-mail.<br />
            Link jest prywatny – nie udostępniaj go innym osobom.
          </p>
        </div>
      </div>
    );
  }

  if (!room) return null;

  if (inCall) {
    return (
      <div className="spotkanie-call-wrapper">
        <VideoCall
          roomUrl={room.roomUrl}
          meetingToken={room.token}
          onLeave={() => setInCall(false)}
        />
      </div>
    );
  }

  const scheduledAt = new Date(room.booking.scheduledAt);

  return (
    <div className="spotkanie-page">
      <div className="spotkanie-card">
        <div className="spotkanie-card__icon">✨</div>
        <h1 className="spotkanie-card__title">Spotkanie z {room.booking.wizardName}</h1>
        <p className="spotkanie-card__guest">Witaj, <strong>{room.booking.guestName}</strong>!</p>

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

        <p className="guest-spotkanie__privacy">
          🔒 Ten link jest prywatny – nie udostępniaj go nikomu.
        </p>
      </div>
    </div>
  );
}

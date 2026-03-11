'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getStoredUser } from '../../lib/auth-mock';
import VideoCall from '../components/video-call';
import '../spotkanie.css';

interface MeetingRoom {
  roomId: number;
  appointmentId: number;
  otherParticipantUsername: string;
  startsAt: string;
  endsAt: string;
  roomName: string;
  dailyToken: string;
  dailyRoomUrl: string;
}

interface TooEarlyState {
  startsAt: string;
  availableAt: string;
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

export default function SpotkanieePage() {
  const params = useParams();
  const router = useRouter();
  const [room, setRoom] = useState<MeetingRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tooEarly, setTooEarly] = useState<TooEarlyState | null>(null);
  const [countdown, setCountdown] = useState('');

  const fetchRoom = useCallback(async () => {
    try {
      const user = getStoredUser();
      if (!user?.token) {
        setError('Brak danych użytkownika — zaloguj się ponownie');
        setLoading(false);
        return;
      }

      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
      const apiBase = base.endsWith('/api') ? base : `${base}/api`;
      const response = await fetch(
        `${apiBase}/meeting-room/join/${params.token}`,
        { headers: { Authorization: `Token ${user.token}` } },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));

        if (response.status === 400 && body?.message) {
          try {
            const parsed = JSON.parse(body.message);
            if (parsed.code === 'TOO_EARLY') {
              setTooEarly({ startsAt: parsed.startsAt, availableAt: parsed.availableAt });
              setLoading(false);
              return;
            }
          } catch { /* nie JSON */ }
        }

        if (response.status === 404) setError('Spotkanie nie zostało znalezione.');
        else if (response.status === 403) setError('Nie masz dostępu do tego spotkania.');
        else if (response.status === 401) setError('Błąd autoryzacji — zaloguj się ponownie.');
        else setError(body?.message || `Błąd serwera (${response.status})`);
        setLoading(false);
        return;
      }

      const data: MeetingRoom = await response.json();
      setRoom(data);
      setTooEarly(null);
      setLoading(false);
    } catch (err) {
      setError('Wystąpił błąd połączenia: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.token) {
      router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
      return;
    }
    fetchRoom();
  }, [fetchRoom, router]);

  // Odliczanie + auto-wejście gdy nadejdzie czas
  useEffect(() => {
    if (!tooEarly) return;

    const update = () => {
      const msLeft = new Date(tooEarly.availableAt).getTime() - Date.now();
      if (msLeft <= 0) {
        setCountdown('0:00');
        setLoading(true);
        setTooEarly(null);
        fetchRoom();
      } else {
        setCountdown(formatCountdown(msLeft));
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [tooEarly, fetchRoom]);

  if (loading) {
    return (
      <div className="spotkanie-container">
        <div className="spotkanie-loading">Ładowanie spotkania...</div>
      </div>
    );
  }

  if (tooEarly) {
    const startsAt = new Date(tooEarly.startsAt);
    const timeStr = startsAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const dateStr = startsAt.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
      <div className="spotkanie-container spotkanie-container--waiting">
        <div className="spotkanie-waiting">
          <div className="spotkanie-waiting__icon">🔮</div>
          <h1 className="spotkanie-waiting__title">Poczekaj chwilę</h1>
          <p className="spotkanie-waiting__date">{dateStr}, godz. {timeStr}</p>
          <p className="spotkanie-waiting__desc">
            Pokój spotkania otworzy się <strong>5 minut przed rozpoczęciem</strong>.
          </p>
          <div className="spotkanie-waiting__countdown-wrapper">
            <span className="spotkanie-waiting__countdown-label">Pozostało</span>
            <span className="spotkanie-waiting__countdown">{countdown}</span>
          </div>
          <p className="spotkanie-waiting__hint">
            Strona automatycznie przeniesie Cię do pokoju, gdy nadejdzie czas.
          </p>
          <button
            onClick={() => router.push('/panel')}
            className="spotkanie-back-btn spotkanie-back-btn--ghost"
          >
            ← Wróć do panelu
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spotkanie-container">
        <div className="spotkanie-error">
          <h2>Błąd</h2>
          <p>{error}</p>
          <button onClick={() => router.push('/panel')} className="spotkanie-back-btn">
            Powrót do panelu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spotkanie-container spotkanie-container--call">
      <div className="spotkanie-header">
        <h1>Spotkanie z {room?.otherParticipantUsername}</h1>
      </div>
      {room && (
        <VideoCall
          roomUrl={room.dailyRoomUrl}
          meetingToken={room.dailyToken}
          onLeave={() => router.push('/panel')}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getStoredUser } from '../lib/auth-mock';
import { apiGetMyAppointments, type AppointmentDto } from '../lib/api-calendar';

type UpcomingMeetingItem =
  | (AppointmentDto & { isGuest?: false })
  | {
      id: string;
      startsAt: string;
      durationMinutes: number;
      clientUsername?: string;
      meetingToken?: null;
      isGuest: true;
      guestBookingId: string;
    };
import {
  apiGetMyMeetingRequests,
  apiGetWizardGuestBookings,
  MeetingRequestDto,
} from '../lib/api-meetings';
import {
  apiGetMyFeaturedStatus,
  apiGetFeaturedConfig,
  type FeaturedStatusDto,
  type FeaturedConfigDto,
} from '../lib/api-payment';
import { PaymentModal } from '../components/payment/PaymentModal';
import { ClientUpcomingMeetings } from './components/ClientUpcomingMeetings';
import { ClientPastMeetings } from './components/ClientPastMeetings';
import './panel-dashboard.css';

function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;
  return `${apiBase}/${path}`;
}

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

function PanelPage() {
  const [user] = useState(() => getStoredUser());
  const isWizard = user?.roles?.includes('wizard');
  const isAdmin  = user?.roles?.includes('admin');

  const [appointments, setAppointments] = useState<UpcomingMeetingItem[]>([]);
  const [requests, setRequests] = useState<MeetingRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredStatus, setFeaturedStatus] = useState<FeaturedStatusDto>({ isFeatured: false, expiresAt: null });
  const [featuredConfig, setFeaturedConfig] = useState<FeaturedConfigDto | null>(null);
  const [featuredStatusLoading, setFeaturedStatusLoading] = useState(true);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);

  useEffect(() => {
    if (!user || !isWizard) { setLoading(false); return; }

    Promise.all([
      apiGetMyAppointments(user.token, { status: 'paid', limit: 10 }),
      apiGetMyMeetingRequests(user.token, { status: 'pending', limit: 5 }),
      apiGetWizardGuestBookings(user.token),
    ])
      .then(([apptRes, reqRes, guestRes]) => {
        const guestAsAppointments: Array<{ id: string; startsAt: string; durationMinutes: number; clientUsername?: string; meetingToken?: null; isGuest: true; guestBookingId: string }> =
          (guestRes.bookings || [])
            .filter((b) => ['paid', 'completed'].includes(b.status))
            .map((b) => ({
              id: `guest-${b.id}`,
              startsAt: b.scheduledAt,
              durationMinutes: b.durationMinutes,
              clientUsername: b.guestName,
              meetingToken: null,
              isGuest: true as const,
              guestBookingId: b.id,
            }));
        const merged: UpcomingMeetingItem[] = [
          ...apptRes.appointments.map((a) => ({ ...a, isGuest: false as const })),
          ...guestAsAppointments,
        ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
        const now = Date.now();
        const upcoming = merged.filter((m) => new Date(m.startsAt).getTime() + (m.durationMinutes || 0) * 60_000 > now);
        setAppointments(upcoming.slice(0, 3));
        setRequests(reqRes.requests);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    Promise.all([
      apiGetMyFeaturedStatus(user.token),
      apiGetFeaturedConfig(),
    ])
      .then(([status, config]) => {
        setFeaturedStatus(status);
        setFeaturedConfig(config);
      })
      .catch(() => {})
      .finally(() => setFeaturedStatusLoading(false));
  }, [user, isWizard]);

  function handleFeaturedSuccess() {
    setShowFeaturedModal(false);
    toast.success('Wyróżnienie zostało aktywowane! Twój profil jest teraz promowany.');
    if (user?.token) {
      apiGetMyFeaturedStatus(user.token).then(setFeaturedStatus).catch(() => {});
    }
  }

  if (!user) return null;

  // Panel administratora
  if (isAdmin) {
    return (
      <div className="dashboard">
        <div className="dashboard__admin-welcome">
          <div className="dashboard__admin-icon">⚙</div>
          <h1 className="dashboard__title">Panel Administracyjny</h1>
          <p className="dashboard__subtitle">
            Witaj, <strong>{user.username}</strong>. Jesteś zalogowany jako administrator.
          </p>
          <p className="dashboard__admin-hint">
            Kolejne sekcje administracyjne będą dostępne w tej zakładce.
          </p>
        </div>
      </div>
    );
  }

  // Panel klienta — nadchodzące i odbyte spotkania (one page, max 100vh)
  if (!isWizard) {
    return (
      <div className="dashboard dashboard--client">
        <div className="dashboard__welcome">
          <h1 className="dashboard__title">Witaj, {user.username}!</h1>
          <p className="dashboard__subtitle">Oto podsumowanie Twoich spotkań</p>
        </div>

        <div className="dashboard__grid">
          <ClientUpcomingMeetings token={user.token} />
          <ClientPastMeetings token={user.token} />
        </div>
      </div>
    );
  }

  // Panel wróżki
  return (
    <div className="dashboard">
      <div className="dashboard__welcome">
        <h1 className="dashboard__title">Witaj, {user.username}!</h1>
        <p className="dashboard__subtitle">Oto podsumowanie Twojej aktywności</p>
      </div>

      {/* ─── Wyróżnienie profilu ───────────────────────────────── */}
      {featuredStatus !== null && (
        featuredStatus.isFeatured ? (
          <div className="dashboard__featured dashboard__featured--active">
            <div className="dashboard__featured-icon">✦</div>
            <div className="dashboard__featured-body">
              <p className="dashboard__featured-title">Twój profil jest wyróżniony!</p>
              <p className="dashboard__featured-desc">
                Widnieje na pierwszych miejscach listy wróżek.{' '}
                {featuredStatus.expiresAt && (
                  <>
                    Wyróżnienie wygasa:{' '}
                    <strong>
                      {new Date(featuredStatus.expiresAt).toLocaleString('pl-PL', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </strong>
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="dashboard__featured">
            <div className="dashboard__featured-icon">✦</div>
            <div className="dashboard__featured-body">
              <p className="dashboard__featured-title">Wyróżnij swój profil</p>
              <p className="dashboard__featured-desc">
                Twój profil pojawi się na <strong>pierwszych miejscach</strong> listy wróżek i przyciągnie więcej klientów.
                {featuredConfig && (
                  <> Wyróżnienie trwa{' '}
                    <strong>{featuredConfig.durationHours} godziny</strong>{' '}
                    i kosztuje{' '}
                    <strong>{(featuredConfig.priceGrosze / 100).toFixed(2).replace('.', ',')} zł</strong>.
                  </>
                )}
              </p>
            </div>
            <button
              className="dashboard__featured-btn"
              onClick={() => setShowFeaturedModal(true)}
              disabled={featuredStatusLoading}
            >
              ✦ Kup wyróżnienie
            </button>
          </div>
        )
      )}

      <div className="dashboard__grid">

        {/* Najbliższe spotkania */}
        <section className="dashboard__section">
          <div className="dashboard__section-head">
            <h2 className="dashboard__section-title">
              <span className="dashboard__section-icon">📅</span>
              Najbliższe spotkania
            </h2>
            <Link href="/panel/wnioski" className="dashboard__section-link">
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
            <div className="dashboard__list">
              {appointments.map((apt) => {
                const now = Date.now();
                const start = new Date(apt.startsAt).getTime();
                const fiveMin = start - 5 * 60 * 1000;
                const isActive = now >= fiveMin && now < start + apt.durationMinutes * 60 * 1000;
                const isPast = now >= start + apt.durationMinutes * 60 * 1000;

                return (
                  <div key={apt.id} className="dashboard__appointment-card">
                    <div className="dashboard__apt-date">
                      <span className="dashboard__apt-day">{formatDate(apt.startsAt)}</span>
                      <span className="dashboard__apt-time">{formatTime(apt.startsAt)}</span>
                    </div>
                    <div className="dashboard__apt-info">
                      <p className="dashboard__apt-client">
                        {apt.clientUsername || 'Klient'}
                      </p>
                      <p className="dashboard__apt-duration">{apt.durationMinutes} min</p>
                    </div>
                    <div className="dashboard__apt-right">
                      {!isPast && (
                        <span className="dashboard__apt-until">
                          {isActive ? '🟢 Trwa' : timeUntil(apt.startsAt)}
                        </span>
                      )}
                      {isActive && (
                        apt.isGuest ? (
                          <Link
                            href={`/panel/spotkanie-gosc/${apt.guestBookingId}`}
                            className="dashboard__apt-join"
                          >
                            Dołącz →
                          </Link>
                        ) : !apt.isGuest && apt.meetingToken ? (
                          <Link
                            href={`/spotkanie/${apt.meetingToken}`}
                            className="dashboard__apt-join"
                          >
                            Dołącz →
                          </Link>
                        ) : null
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Prośby o spotkanie */}
        <section className="dashboard__section">
          <div className="dashboard__section-head">
            <h2 className="dashboard__section-title">
              <span className="dashboard__section-icon">✉️</span>
              Prośby o spotkanie
            </h2>
            <Link href="/panel/wnioski" className="dashboard__section-link">
              Zobacz wszystkie →
            </Link>
          </div>

          {loading ? (
            <div className="dashboard__loading">Ładowanie…</div>
          ) : requests.length === 0 ? (
            <div className="dashboard__empty">
              <span>Brak nowych próśb</span>
            </div>
          ) : (
            <div className="dashboard__list">
              {requests.map((req) => (
                <div key={req.id} className="dashboard__request-card">
                  <div className="dashboard__req-avatar">
                    {(req.clientUsername || 'K').charAt(0).toUpperCase()}
                  </div>
                  <div className="dashboard__req-info">
                    <p className="dashboard__req-client">
                      {req.clientUsername || 'Klient'}
                    </p>
                    <p className="dashboard__req-ad">
                      {req.advertisementTitle || 'Konsultacja'}
                    </p>
                    {req.requestedStartsAt && (
                      <p className="dashboard__req-date">
                        {formatDate(req.requestedStartsAt)}, {formatTime(req.requestedStartsAt)}
                      </p>
                    )}
                    {req.message && (
                      <p className="dashboard__req-msg">„{req.message}"</p>
                    )}
                  </div>
                  <Link
                    href="/panel/wnioski"
                    className="dashboard__req-action"
                  >
                    Odpowiedz →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {showFeaturedModal && user && featuredConfig && (
        <PaymentModal
          token={user.token}
          title={`Wyróżnienie wróżki – ${featuredConfig.durationHours}h`}
          amountZl={`${(featuredConfig.priceGrosze / 100).toFixed(2).replace('.', ',')} zł`}
          onClose={() => setShowFeaturedModal(false)}
          onSuccess={handleFeaturedSuccess}
          clientSecretLoader={() =>
            fetch(apiUrl('featured/payment-intent'), {
              method: 'POST',
              headers: {
                Authorization: `Token ${user.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({}),
            }).then((r) => {
              if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e.message || `HTTP ${r.status}`)));
              return r.json();
            })
          }
        />
      )}

    </div>
  );
}

export default PanelPage;

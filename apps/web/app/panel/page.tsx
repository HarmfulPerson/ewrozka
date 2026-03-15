'use client';

import { useEffect, useState, useCallback } from 'react';
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
  apiGetWizardGuestBookings,
  apiAcceptMeetingRequest,
  apiRejectMeetingRequest,
  apiAcceptGuestBooking,
  apiRejectGuestBooking,
  apiGetWizardUnifiedRequests,
  type UnifiedRequestDto,
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
  const [pendingItems, setPendingItems] = useState<UnifiedRequestDto[]>([]);
  const [acceptedItems, setAcceptedItems] = useState<UnifiedRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    id: string | null;
    kind: 'regular' | 'guest';
    reason: string;
    showError?: boolean;
  }>({ open: false, id: null, kind: 'regular', reason: '' });
  const [featuredStatus, setFeaturedStatus] = useState<FeaturedStatusDto>({ isFeatured: false, expiresAt: null });
  const [featuredConfig, setFeaturedConfig] = useState<FeaturedConfigDto | null>(null);
  const [featuredStatusLoading, setFeaturedStatusLoading] = useState(true);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!user || !isWizard) { setLoading(false); return; }
    setLoading(true);
    try {
      const [apptRes, guestRes, pendingRes, acceptedRes] = await Promise.all([
        apiGetMyAppointments(user.token, { status: 'paid', limit: 10 }),
        apiGetWizardGuestBookings(user.token),
        apiGetWizardUnifiedRequests(user.token, { status: 'pending', limit: 3, sortBy: 'createdAt', order: 'DESC' }),
        apiGetWizardUnifiedRequests(user.token, { status: 'accepted', limit: 3, sortBy: 'createdAt', order: 'DESC' }),
      ]);
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
      setPendingItems(pendingRes.items);
      setAcceptedItems(acceptedRes.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, isWizard]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const handler = () => fetchDashboard();
    window.addEventListener('ewrozka:pending-requests-changed', handler);
    return () => window.removeEventListener('ewrozka:pending-requests-changed', handler);
  }, [fetchDashboard]);

  useEffect(() => {
    if (!user || !isWizard) return;
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

  const notifyChanged = () => window.dispatchEvent(new Event('ewrozka:pending-requests-changed'));

  const handleAccept = async (item: UnifiedRequestDto) => {
    if (!user) return;
    setProcessingId(item.id);
    try {
      if (item.kind === 'regular') {
        await apiAcceptMeetingRequest(user.token, Number(item.id));
      } else {
        await apiAcceptGuestBooking(user.token, item.id);
      }
      toast.success('Wniosek zaakceptowany!');
      notifyChanged();
      await fetchDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd akceptacji');
    } finally { setProcessingId(null); }
  };

  const openRejectModal = (item: UnifiedRequestDto) => {
    setRejectModal({ open: true, id: item.id, kind: item.kind, reason: '' });
  };

  const handleConfirmReject = async () => {
    if (!user || rejectModal.id === null) return;
    const { id, kind, reason } = rejectModal;
    if (!reason.trim()) {
      setRejectModal(m => ({ ...m, showError: true }));
      return;
    }
    setRejectModal(m => ({ ...m, open: false }));
    setProcessingId(id);
    try {
      if (kind === 'regular') {
        await apiRejectMeetingRequest(user.token, Number(id), reason.trim());
      } else {
        await apiRejectGuestBooking(user.token, id, reason.trim());
      }
      toast.success('Wniosek odrzucony.');
      notifyChanged();
      await fetchDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd odrzucenia');
    } finally {
      setProcessingId(null);
      setRejectModal({ open: false, id: null, kind: 'regular', reason: '' });
    }
  };


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
      <div className="dashboard__top-row">
        <div className="dashboard__welcome">
          <h1 className="dashboard__title">Witaj, {user.username}!</h1>
          <p className="dashboard__subtitle">Oto podsumowanie Twojej aktywności</p>
        </div>

        {/* ─── Wyróżnienie profilu ───────────────────────────────── */}
        {featuredStatus !== null && (
          featuredStatus.isFeatured ? (
            <div className="dashboard__featured dashboard__featured--active dashboard__featured--compact">
              <div className="dashboard__featured-icon">✦</div>
              <div className="dashboard__featured-body">
                <p className="dashboard__featured-title">Twój profil jest wyróżniony!</p>
                <p className="dashboard__featured-desc">
                  {featuredStatus.expiresAt && (
                    <>
                      Wygasa:{' '}
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
            <div className="dashboard__featured dashboard__featured--compact">
              <div className="dashboard__featured-icon">✦</div>
              <div className="dashboard__featured-body">
                <p className="dashboard__featured-title">Wyróżnij swój profil</p>
                <p className="dashboard__featured-desc">
                  {featuredConfig && (
                    <>{featuredConfig.durationHours}h · {(featuredConfig.priceGrosze / 100).toFixed(2).replace('.', ',')} zł</>
                  )}
                </p>
              </div>
              <button
                className="dashboard__featured-btn"
                onClick={() => setShowFeaturedModal(true)}
                disabled={featuredStatusLoading}
              >
                ✦ Kup
              </button>
            </div>
          )
        )}
      </div>

      <div className="dashboard__grid">

        {/* Najbliższe spotkania */}
        <section className="dashboard__section">
          <div className="dashboard__section-head">
            <h2 className="dashboard__section-title">
              <span className="dashboard__section-icon">📅</span>
              Najbliższe spotkania
            </h2>
            <Link href="/panel/wnioski?status=paid" className="dashboard__section-link">
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
                const isActive = now >= fiveMin && now < start + apt.durationMinutes * 60 * 1000;
                const isPast = now >= start + apt.durationMinutes * 60 * 1000;

                return (
                  <div key={apt.id} className="dashboard__card">
                    <div className="dashboard__card-date">
                      <span className="dashboard__card-date-day">{formatDate(apt.startsAt)}</span>
                      <span className="dashboard__card-date-time">{formatTime(apt.startsAt)}</span>
                    </div>
                    <div className="dashboard__card-body">
                      <p className="dashboard__card-title">
                        {apt.clientUsername || 'Klient'}
                        {apt.isGuest && <span className="dashboard__card-tag dashboard__card-tag--guest">Gość</span>}
                      </p>
                      <p className="dashboard__card-sub">{apt.durationMinutes} min</p>
                    </div>
                    <div className="dashboard__card-actions">
                      {!isPast && (
                        <span className="dashboard__card-meta">
                          {isActive ? '🟢 Trwa' : timeUntil(apt.startsAt)}
                        </span>
                      )}
                      {isActive && (
                        apt.isGuest ? (
                          <Link href={`/panel/spotkanie-gosc/${apt.guestBookingId}`} className="dashboard__card-btn-join">
                            Dołącz →
                          </Link>
                        ) : !apt.isGuest && apt.meetingToken ? (
                          <Link href={`/spotkanie/${apt.meetingToken}`} className="dashboard__card-btn-join">
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
            <Link href="/panel/wnioski?status=pending" className="dashboard__section-link">
              Zobacz wszystkie →
            </Link>
          </div>

          {loading ? (
            <div className="dashboard__loading">Ładowanie…</div>
          ) : pendingItems.length === 0 ? (
            <div className="dashboard__empty">
              <span>Brak nowych próśb</span>
            </div>
          ) : (
            <div className="dashboard__card-list">
              {pendingItems.map((item) => {
                const isProc = processingId === item.id;
                return (
                  <div key={`${item.kind}-${item.id}`} className="dashboard__card">
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
                      <button className="dashboard__card-btn dashboard__card-btn--accept" onClick={() => handleAccept(item)} disabled={isProc}>✓</button>
                      <button className="dashboard__card-btn dashboard__card-btn--reject" onClick={() => openRejectModal(item)} disabled={isProc}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* Zaakceptowane / Nieopłacone */}
      {!loading && acceptedItems.length > 0 && (
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
            {acceptedItems.map((item) => {
              const isProc = processingId === item.id;
              return (
                <div key={`${item.kind}-${item.id}`} className="dashboard__card">
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
                    <button className="dashboard__card-btn dashboard__card-btn--reject" onClick={() => openRejectModal(item)} disabled={isProc}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Modal odrzucenia */}
      {rejectModal.open && (
        <div className="dashboard__modal-overlay" onClick={() => setRejectModal(m => ({ ...m, open: false }))}>
          <div className="dashboard__modal" onClick={e => e.stopPropagation()}>
            <div className="dashboard__modal-header">
              <h3 className="dashboard__modal-title">Odrzuć wniosek</h3>
              <button className="dashboard__modal-close" onClick={() => setRejectModal(m => ({ ...m, open: false }))}>✕</button>
            </div>
            <div className="dashboard__modal-body">
              <textarea
                className={`dashboard__modal-textarea${rejectModal.showError ? ' dashboard__modal-textarea--error' : ''}`}
                placeholder="Powód odrzucenia..."
                rows={3}
                value={rejectModal.reason}
                onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value, showError: false }))}
                autoFocus
              />
              {rejectModal.showError && (
                <p className="dashboard__modal-error">Podaj powód odrzucenia</p>
              )}
            </div>
            <div className="dashboard__modal-footer">
              <button className="dashboard__modal-btn dashboard__modal-btn--cancel" onClick={() => setRejectModal(m => ({ ...m, open: false }))}>
                Anuluj
              </button>
              <button className="dashboard__modal-btn dashboard__modal-btn--reject" onClick={handleConfirmReject}>
                Odrzuć
              </button>
            </div>
          </div>
        </div>
      )}

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

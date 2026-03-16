'use client';

import Image from 'next/image';
import Link from 'next/link';
import PanelPageTransition from '../components/page-transition/PanelPageTransition';

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 10L12 3L21 10"/>
      <path d="M5 10V20H19V10"/>
      <circle cx="12" cy="14" r="1"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M3 9H21"/>
      <circle cx="12" cy="15" r="2"/>
    </svg>
  );
}
function IconAvailability() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="7"/>
      <path d="M12 8V12L15 14"/>
      <path d="M12 2V4"/>
      <path d="M12 20V22"/>
    </svg>
  );
}
function IconRequests() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2"/>
      <path d="M3 7L12 13L21 7"/>
      <circle cx="19" cy="5" r="1"/>
    </svg>
  );
}
function IconAds() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="6" y="4" width="12" height="16" rx="2"/>
      <path d="M9 8H15"/>
      <path d="M9 12H15"/>
      <path d="M9 16H13"/>
    </svg>
  );
}
function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="7" width="18" height="10" rx="3"/>
      <circle cx="16" cy="12" r="1.5"/>
      <path d="M3 10H21"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2V5"/>
      <path d="M12 19V22"/>
      <path d="M4.9 4.9L7 7"/>
      <path d="M17 17L19.1 19.1"/>
      <path d="M2 12H5"/>
      <path d="M19 12H22"/>
    </svg>
  );
}
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearStoredUser, getStoredUser } from '../lib/auth-mock';
import { getUploadUrl } from '../lib/api';
import { apiGetWallet, apiCheckConnectReady, apiGetMyFeaturedStatus, type FeaturedStatusDto, type CommissionTierDto } from '../lib/api-payment';
import { apiGetMyAdvertisements } from '../lib/api-advertisements';
import { useNotifications } from '../hooks/useNotifications';
import { useSessionManager } from '../hooks/useSessionManager';
import { useAdminPendingVideoCount } from '../hooks/useAdminPendingVideoCount';
import { NotificationCenter, NotificationCenterMobile, NotificationMobilePanel, NotificationToastListener } from '../components/notification-center/notification-center';
import { Toaster } from 'react-hot-toast';
import 'react-tooltip/dist/react-tooltip.css';
import { SubtleStars } from '../components/subtle-stars/subtle-stars';
import './panel.css';

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [walletBalance, setWalletBalance] = useState<string>('');
  const [platformFeePercent, setPlatformFeePercent] = useState<number | null>(null);
  const [commissionTier, setCommissionTier] = useState<CommissionTierDto | null>(null);
  const [connectConfigured, setConnectConfigured] = useState<boolean | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [featuredStatus, setFeaturedStatus] = useState<FeaturedStatusDto | null>(null);
  const [adsCount, setAdsCount] = useState<number | null>(null);

  const isWizardRole = user?.roles?.includes('wizard') ?? false;
  const isAdminRole  = user?.roles?.includes('admin') ?? false;
  useSessionManager();
  const notificationsData = useNotifications(!isAdminRole ? user?.token : null);
  const pendingCount = notificationsData.pendingCount;
  const pendingVideoCount = useAdminPendingVideoCount(isAdminRole ? user?.token : null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.push('/login?returnUrl=/panel');
      return;
    }
    setUser(storedUser);
    setMounted(true);
    const isWizardRole = storedUser.roles?.includes('wizard');
    const isAdminRole  = storedUser.roles?.includes('admin');
    if (isWizardRole && !isAdminRole) {
      fetchWizardBar(storedUser.token);
      fetchFeaturedStatus(storedUser.token);
      fetchAdsCount(storedUser.token);
    }

    const handleUserUpdated = () => {
      const refreshed = getStoredUser();
      if (refreshed) setUser(refreshed);
    };

    window.addEventListener('ewrozka:user-updated', handleUserUpdated);

    const handleConnectConfigured = () => {
      if (storedUser?.token) fetchWizardBar(storedUser.token);
    };
    window.addEventListener('ewrozka:connect-configured', handleConnectConfigured);

    const handleAdsCountChanged = () => {
      if (storedUser?.token) fetchAdsCount(storedUser.token);
    };
    window.addEventListener('ewrozka:ads-count-changed', handleAdsCountChanged);

    return () => {
      window.removeEventListener('ewrozka:user-updated', handleUserUpdated);
      window.removeEventListener('ewrozka:connect-configured', handleConnectConfigured);
      window.removeEventListener('ewrozka:ads-count-changed', handleAdsCountChanged);
    };
  }, [router]);

  async function fetchAdsCount(token: string) {
    try {
      const res = await apiGetMyAdvertisements(token);
      setAdsCount(res.advertisementsCount ?? res.advertisements?.length ?? 0);
    } catch {
      // ignore
    }
  }

  async function fetchFeaturedStatus(token: string) {
    try {
      const status = await apiGetMyFeaturedStatus(token);
      setFeaturedStatus(status);
    } catch {
      // ignore
    }
  }

  async function fetchWizardBar(token: string) {
    if (!token) return;
    try {
      const [connectData, walletData] = await Promise.all([
        apiCheckConnectReady(token),
        apiGetWallet(token).catch(() => null),
      ]);
      const configured = connectData.connected && connectData.onboardingCompleted;
      setConnectConfigured(configured);
      if (walletData) {
        setWalletBalance(walletData.balanceFormatted);
        setPlatformFeePercent(walletData.platformFeePercent ?? null);
        setCommissionTier(walletData.commissionTier ?? null);
      }
    } catch {
      setConnectConfigured(false);
    }
  }

  const handleLogout = () => {
    clearStoredUser();
    router.push('/');
  };

  if (!mounted) {
    return (
      <div className="panel-loading">
        <p>Ładowanie...</p>
      </div>
    );
  }

  const isWizard = user?.roles?.includes('wizard');
  const isAdmin  = user?.roles?.includes('admin');

  return (
    <div className="panel-layout">
      <SubtleStars count={120} maxOpacity={0.35} />
      <NotificationToastListener />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-secondary, #1a1625)',
            color: 'var(--text-primary, #e2e0f0)',
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: '12px',
            fontSize: '0.9rem',
          },
          success: {
            iconTheme: { primary: '#a78bfa', secondary: '#1a1625' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#1a1625' },
          },
        }}
      />
      <aside className="panel-sidebar">
        <div className="panel-sidebar__head">
          {/* Logo + saldo w jednej linii (mobile) */}
          <div className="panel-sidebar__top-row">
            <Link href="/" className="panel-sidebar__logo" aria-label="eWróżka – strona główna">
              <Image src="/logo.png" alt="eWróżka" width={110} height={34} priority />
            </Link>
            {isWizard && !isAdmin && connectConfigured !== null && (
              <div className="panel-balance-bar panel-balance-bar--sidebar">
                <div className="panel-balance-bar__content">
                  {connectConfigured ? (
                    <>
                      <span className="panel-balance-bar__label">Saldo:</span>
                      <span className="panel-balance-bar__amount">{walletBalance || '...'}</span>
                      {platformFeePercent != null && (
                        <span className="panel-balance-bar__fee">prowizja {platformFeePercent}%</span>
                      )}
                      {commissionTier && (
                        <span className="panel-balance-bar__tier">
                          {commissionTier.isSetByAdmin ? (
                            'ustawiona przez admina'
                          ) : (
                            <>
                              próg: {commissionTier.meetingsInWindow} spotkań / {commissionTier.windowDays} dni
                              {commissionTier.nextTier && (
                                <> · {commissionTier.nextTier.minMeetings - commissionTier.meetingsInWindow} do {commissionTier.nextTier.feePercent}%</>
                              )}
                            </>
                          )}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Link href="/panel/portfel" className="panel-balance-bar__setup-link">
                        ⚠️ Skonfiguruj konto →
                      </Link>
                      {commissionTier && !commissionTier.isSetByAdmin && (
                        <span className="panel-balance-bar__tier">
                          próg: {commissionTier.meetingsInWindow}/{commissionTier.windowDays} dni
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="panel-sidebar__head-row">
            <div className="panel-sidebar__user">
              <div className={`panel-sidebar__avatar${isWizard && featuredStatus?.isFeatured ? ' panel-sidebar__avatar--featured' : ''}`}>
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getUploadUrl(user.image)}
                    alt={user.username}
                    className="panel-sidebar__avatar-img"
                  />
                ) : (
                  <span className="panel-sidebar__avatar-letter">
                    {(user?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="panel-sidebar__user-info">
                <p className={`panel-sidebar__role${isWizard && featuredStatus?.isFeatured ? ' panel-sidebar__role--featured' : ''}${isAdmin ? ' panel-sidebar__role--admin' : ''}`}>
                  {user?.username || 'Użytkownik'}
                </p>
                {isAdmin && (
                  <p className="panel-sidebar__admin-badge">
                    ⚙ Administrator
                  </p>
                )}
                {isWizard && !isAdmin && featuredStatus?.isFeatured && (
                  <p className="panel-sidebar__featured-badge">
                    ✦ Profil wyróżniony
                  </p>
                )}
              </div>
            </div>
            {!isAdmin && (
              <div className="panel-sidebar__notif">
                <NotificationCenterMobile
                  notifications={notificationsData}
                  open={mobileNotifOpen}
                  onToggle={() => { setMobileNotifOpen(v => !v); setMobileNavOpen(false); }}
                />
              </div>
            )}
            <button
              className="panel-sidebar__burger"
              aria-label="Menu nawigacyjne"
              aria-expanded={mobileNavOpen}
              onClick={() => { setMobileNavOpen((v) => !v); setMobileNotifOpen(false); }}
            >
              <span className="panel-sidebar__burger-bar" />
              <span className="panel-sidebar__burger-bar" />
              <span className="panel-sidebar__burger-bar" />
            </button>
          </div>
        </div>

        {/* Mobile notification panel — rozwija się jak nav */}
        {!isAdmin && (
          <NotificationMobilePanel
            notifications={notificationsData}
            open={mobileNotifOpen}
            onClose={() => setMobileNotifOpen(false)}
          />
        )}

        <nav
          className={`panel-sidebar__nav${mobileNavOpen ? ' panel-sidebar__nav--open' : ''}`}
          onClick={() => setMobileNavOpen(false)}
        >
          <Link
            href="/panel"
            className={`panel-sidebar__link ${pathname === '/panel' ? 'panel-sidebar__link--active' : ''}`}
          >
            <span className="panel-sidebar__link-icon"><IconHome /></span>
            Panel główny
          </Link>
          
          {isWizard && !isAdmin && (
            <>
              <Link
                href="/panel/kalendarz"
                className={`panel-sidebar__link ${pathname?.startsWith('/panel/kalendarz') ? 'panel-sidebar__link--active' : ''}`}
              >
                <span className="panel-sidebar__link-icon"><IconCalendar /></span>
                Kalendarz
              </Link>
              <Link
                href="/panel/dostepnosc"
                className={`panel-sidebar__link ${pathname?.startsWith('/panel/dostepnosc') ? 'panel-sidebar__link--active' : ''}`}
              >
                <span className="panel-sidebar__link-icon"><IconAvailability /></span>
                Dostępność
              </Link>
              <Link
                href="/panel/wnioski"
                className={`panel-sidebar__link ${pathname?.startsWith('/panel/wnioski') ? 'panel-sidebar__link--active' : ''}`}
              >
                <span className="panel-sidebar__link-icon panel-sidebar__link-icon--badgeable">
                  <IconRequests />
                  {pendingCount > 0 && (
                    <span className="panel-sidebar__badge">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </span>
                Wnioski o spotkanie
              </Link>
              <Link
                href="/panel/ogloszenia"
                className={`panel-sidebar__link ${pathname?.startsWith('/panel/ogloszenia') ? 'panel-sidebar__link--active' : ''}`}
              >
                <span className="panel-sidebar__link-icon panel-sidebar__link-icon--badgeable">
                  <IconAds />
                  {adsCount !== null && adsCount > 0 && (
                    <span className="panel-sidebar__badge panel-sidebar__badge--ads">
                      {adsCount > 99 ? '99+' : adsCount}
                    </span>
                  )}
                </span>
                Moje ogłoszenia
              </Link>
              <Link
                href="/panel/portfel"
                className={`panel-sidebar__link ${pathname?.startsWith('/panel/portfel') ? 'panel-sidebar__link--active' : ''}`}
              >
                <span className="panel-sidebar__link-icon"><IconWallet /></span>
                Portfel
              </Link>
            </>
          )}

          {isAdmin && (
            <>
              <Link
                href="/panel/admin/wnioski-wrozek"
                className={`panel-sidebar__link ${pathname?.startsWith('/panel/admin/wnioski-wrozek') ? 'panel-sidebar__link--active' : ''}`}
              >
                <span className="panel-sidebar__link-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </span>
                Wnioski wróżek
              </Link>
              <Link
                href="/panel/admin/wrozki"
                className={`panel-sidebar__link ${pathname?.startsWith('/panel/admin/wrozki') ? 'panel-sidebar__link--active' : ''}`}
              >
                <span className="panel-sidebar__link-icon panel-sidebar__link-icon--badgeable">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  {pendingVideoCount > 0 && (
                    <span className="panel-sidebar__badge">
                      {pendingVideoCount > 99 ? '99+' : pendingVideoCount}
                    </span>
                  )}
                </span>
                Wróżki
              </Link>
              <Link
                href="/panel/admin/progi-prowizji"
                className={`panel-sidebar__link ${pathname?.startsWith('/panel/admin/progi-prowizji') ? 'panel-sidebar__link--active' : ''}`}
              >
                <span className="panel-sidebar__link-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
                  </svg>
                </span>
                Progi prowizji
              </Link>
              <Link
                href="/panel/admin/przypomnienia"
                className={`panel-sidebar__link ${pathname?.startsWith('/panel/admin/przypomnienia') ? 'panel-sidebar__link--active' : ''}`}
              >
                <span className="panel-sidebar__link-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                </span>
                Przypomnienia
              </Link>
            </>
          )}

          {!isWizard && !isAdmin && (
            <Link
              href="/panel/moje-spotkania"
              className={`panel-sidebar__link ${pathname?.startsWith('/panel/moje-spotkania') ? 'panel-sidebar__link--active' : ''}`}
            >
              <span className="panel-sidebar__link-icon"><IconCalendar /></span>
              Moje spotkania
            </Link>
          )}

          <Link
            href="/panel/ustawienia"
            className={`panel-sidebar__link ${pathname?.startsWith('/panel/ustawienia') ? 'panel-sidebar__link--active' : ''}`}
          >
            <span className="panel-sidebar__link-icon"><IconSettings /></span>
            Ustawienia
          </Link>

          {/* Wyloguj – widoczny w menu (desktop: stopka, mobile: koniec nava) */}
          <div className="panel-sidebar__nav-foot">
            <button
              onClick={handleLogout}
              className="panel-sidebar__logout"
            >
              Wyloguj się
            </button>
          </div>
        </nav>
      </aside>

      <main className="panel-main">
        {isWizard && !isAdmin && connectConfigured !== null && (
          <div className="panel-balance-bar panel-balance-bar--main">
            <div className="panel-balance-bar__content">
              {connectConfigured ? (
                <>
                  <span className="panel-balance-bar__label">Saldo portfela:</span>
                  <span className="panel-balance-bar__amount">{walletBalance || '...'}</span>
                  {platformFeePercent != null && (
                    <span className="panel-balance-bar__fee">prowizja {platformFeePercent}%</span>
                  )}
                  {commissionTier && (
                    <span className="panel-balance-bar__tier">
                      {commissionTier.isSetByAdmin ? (
                        'ustawiona przez admina'
                      ) : (
                        <>
                          próg: {commissionTier.meetingsInWindow} spotkań / {commissionTier.windowDays} dni
                          {commissionTier.nextTier && (
                            <> · <Link href="/panel/portfel">{commissionTier.nextTier.minMeetings - commissionTier.meetingsInWindow} do {commissionTier.nextTier.feePercent}%</Link></>
                          )}
                        </>
                      )}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="panel-balance-bar__label panel-balance-bar__label--warn">
                    ⚠️ Konto płatnicze nieskonfigurowane
                  </span>
                  <Link href="/panel/portfel" className="panel-balance-bar__setup-link">
                    Skonfiguruj w Portfelu →
                  </Link>
                </>
              )}
              {!isAdmin && <NotificationCenter notifications={notificationsData} />}
            </div>
          </div>
        )}
        {!isWizard && !isAdmin && (
          <div className="panel-balance-bar panel-balance-bar--main">
            <div className="panel-balance-bar__content">
              <NotificationCenter notifications={notificationsData} />
            </div>
          </div>
        )}
        <div className="panel-main__content">
          <PanelPageTransition />
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { PaymentModal } from '../components/payment/PaymentModal';
import { ClientUpcomingMeetings } from './components/ClientUpcomingMeetings';
import { ClientPastMeetings } from './components/ClientPastMeetings';
import { WizardFeaturedSection } from './components/WizardFeaturedSection';
import { WizardUpcomingMeetings } from './components/WizardUpcomingMeetings';
import { WizardPendingRequests } from './components/WizardPendingRequests';
import { WizardAcceptedRequests } from './components/WizardAcceptedRequests';
import { RejectModal } from './components/RejectModal';
import { useWizardDashboard } from './useWizardDashboard';
import './panel-dashboard.css';

function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;
  return `${apiBase}/${path}`;
}

function PanelPage() {
  const {
    user,
    isWizard,
    isAdmin,
    appointments,
    pendingItems,
    acceptedItems,
    loading,
    processingId,
    rejectModal,
    setRejectModal,
    featuredStatus,
    featuredConfig,
    featuredStatusLoading,
    showFeaturedModal,
    setShowFeaturedModal,
    handleAccept,
    openRejectModal,
    handleConfirmReject,
    handleFeaturedSuccess,
  } = useWizardDashboard();

  if (!user) return null;

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

  return (
    <div className="dashboard">
      <div className="dashboard__top-row">
        <div className="dashboard__welcome">
          <h1 className="dashboard__title">Witaj, {user.username}!</h1>
          <p className="dashboard__subtitle">Oto podsumowanie Twojej aktywności</p>
        </div>

        {featuredStatus !== null && (
          <WizardFeaturedSection
            featuredStatus={featuredStatus}
            featuredConfig={featuredConfig}
            featuredStatusLoading={featuredStatusLoading}
            onBuyClick={() => setShowFeaturedModal(true)}
          />
        )}
      </div>

      <div className="dashboard__grid">
        <WizardUpcomingMeetings appointments={appointments} loading={loading} />
        <WizardPendingRequests
          items={pendingItems}
          loading={loading}
          processingId={processingId}
          onAccept={handleAccept}
          onReject={openRejectModal}
        />
      </div>

      <WizardAcceptedRequests
        items={acceptedItems}
        loading={loading}
        processingId={processingId}
        onReject={openRejectModal}
      />

      <RejectModal
        rejectModal={rejectModal}
        onClose={() => setRejectModal(m => ({ ...m, open: false }))}
        onChange={(reason) => setRejectModal(m => ({ ...m, reason, showError: false }))}
        onConfirm={handleConfirmReject}
      />

      {showFeaturedModal && user && featuredConfig && (
        <PaymentModal
          token={user.token}
          title={`Wyróżnienie specjalisty – ${featuredConfig.durationHours}h`}
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

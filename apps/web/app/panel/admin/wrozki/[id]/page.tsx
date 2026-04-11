'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWizardProfile } from './useWizardProfile';
import {
  WizardHeader,
  ContactCard,
  StatsCard,
  VideoCard,
  CommissionCard,
  ProfileActions,
} from './WizardProfileComponents';
import { WizardAnalyticsTab } from './WizardAnalyticsTab';
import '../../../panel-shared.css';
import '../wrozki.css';

type Tab = 'profil' | 'analityka';

export default function AdminWizardProfilePage() {
  const [tab, setTab] = useState<Tab>('profil');
  const {
    wizard,
    loading,
    featuredLoading,
    feePercent,
    setFeePercent,
    feeSaving,
    resetToTierLoading,
    videoApproveLoading,
    videoRejectLoading,
    handleSetFeatured,
    handleResetToTier,
    handleApproveVideo,
    handleRejectVideo,
    handleSaveFee,
  } = useWizardProfile();

  if (loading || !wizard) {
    return (
      <div className="aw-page">
        <div className="panel-page-spinner">
          <span className="panel-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="aw-page aw-profile">
      <Link href="/panel/admin/wrozki" className="aw-profile__back">
        ← Powrot do listy
      </Link>

      <WizardHeader wizard={wizard} />

      {/* Tabs */}
      <div className="aw-profile__tabs">
        <button
          className={`aw-profile__tab ${tab === 'profil' ? 'aw-profile__tab--active' : ''}`}
          onClick={() => setTab('profil')}
        >
          Profil
        </button>
        <button
          className={`aw-profile__tab ${tab === 'analityka' ? 'aw-profile__tab--active' : ''}`}
          onClick={() => setTab('analityka')}
        >
          Analityka
        </button>
      </div>

      {tab === 'profil' && (
        <>
          <div className="aw-profile__grid">
            <ContactCard wizard={wizard} />
            <StatsCard wizard={wizard} />
            <VideoCard
              wizard={wizard}
              videoApproveLoading={videoApproveLoading}
              videoRejectLoading={videoRejectLoading}
              onApprove={handleApproveVideo}
              onReject={handleRejectVideo}
            />
            <CommissionCard
              wizard={wizard}
              feePercent={feePercent}
              setFeePercent={setFeePercent}
              feeSaving={feeSaving}
              resetToTierLoading={resetToTierLoading}
              onSaveFee={handleSaveFee}
              onResetToTier={handleResetToTier}
            />
          </div>

          {wizard.bio && (
            <section className="aw-profile__card aw-profile__card--full">
              <h2 className="aw-profile__card-title">Opis</h2>
              <p className="aw-profile__bio">{wizard.bio}</p>
            </section>
          )}

          <ProfileActions
            wizard={wizard}
            featuredLoading={featuredLoading}
            onSetFeatured={handleSetFeatured}
          />
        </>
      )}

      {tab === 'analityka' && (
        <WizardAnalyticsTab wizardId={wizard.uid} />
      )}
    </div>
  );
}

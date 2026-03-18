'use client';

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
import '../../../panel-shared.css';
import '../wrozki.css';

export default function AdminWizardProfilePage() {
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
        ← Powrót do listy
      </Link>

      <WizardHeader wizard={wizard} />

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
    </div>
  );
}

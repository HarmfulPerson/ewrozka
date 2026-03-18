'use client';

import Image from 'next/image';
import { getUploadUrl } from '../../../../lib/api';
import type { WizardData } from './useWizardProfile';

const formatGrosze = (g: number) => `${(g / 100).toFixed(2)} zł`;
const formatDate = (s: string) => new Date(s).toLocaleDateString('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function WizardHeader({ wizard }: { wizard: WizardData }) {
  return (
    <div className="aw-profile__header">
      <div className="aw-profile__avatar-wrap">
        <div className="aw-profile__avatar">
          {wizard.image ? (
            <Image
              src={getUploadUrl(wizard.image)}
              alt={wizard.username}
              fill
              className="aw-profile__avatar-img"
            />
          ) : (
            <span className="aw-profile__avatar-letter">
              {wizard.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {wizard.isFeatured && (
          <span className="aw-profile__featured-badge">✦ Wyróżniony</span>
        )}
      </div>
      <div className="aw-profile__info">
        <h1 className="aw-profile__name">{wizard.username}</h1>
        <p className="aw-profile__joined">
          Dołączył: {formatDate(wizard.createdAt)}
        </p>
        {(wizard.topicNames ?? []).length > 0 && (
          <div className="aw-profile__topics">
            {(wizard.topicNames ?? []).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContactCard({ wizard }: { wizard: WizardData }) {
  return (
    <section className="aw-profile__card">
      <h2 className="aw-profile__card-title">Kontakt</h2>
      <p className="aw-profile__card-row">
        <span className="aw-profile__label">E-mail:</span>{' '}
        <a
          href={`mailto:${wizard.email}`}
          className="aw-profile__link"
        >
          {wizard.email}
        </a>
      </p>
      {wizard.phone && (
        <p className="aw-profile__card-row">
          <span className="aw-profile__label">Telefon:</span> {wizard.phone}
        </p>
      )}
    </section>
  );
}

export function StatsCard({ wizard }: { wizard: WizardData }) {
  return (
    <section className="aw-profile__card">
      <h2 className="aw-profile__card-title">Statystyki</h2>
      <p className="aw-profile__card-row">
        <span className="aw-profile__label">Spotkania:</span> {wizard.meetingsCount}
      </p>
      <p className="aw-profile__card-row">
        <span className="aw-profile__label">Zarobione:</span> {formatGrosze(wizard.earnedGrosze)}
      </p>
      <p className="aw-profile__card-row">
        <span className="aw-profile__label">Ogłoszenia:</span> {wizard.announcementsCount}
      </p>
      <p className="aw-profile__card-row">
        <span className="aw-profile__label">Dostępny teraz:</span>{' '}
        {wizard.isAvailableNow ? 'Tak' : 'Nie'}
      </p>
      {wizard.isFeatured && wizard.featuredExpiresAt && (
        <p className="aw-profile__card-row">
          <span className="aw-profile__label">Wyróżnienie do:</span>{' '}
          {formatDate(wizard.featuredExpiresAt)}
        </p>
      )}
    </section>
  );
}

export function VideoCard({
  wizard,
  videoApproveLoading,
  videoRejectLoading,
  onApprove,
  onReject,
}: {
  wizard: WizardData;
  videoApproveLoading: boolean;
  videoRejectLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <section className="aw-profile__card">
      <h2 className="aw-profile__card-title">Filmik profilowy</h2>
      {wizard.videoPending ? (
        <div className="aw-profile__video-pending">
          <p className="aw-profile__card-row aw-profile__card-row--muted">
            <span className="aw-profile__label">Nowy filmik do akceptacji:</span>
          </p>
          <video
            src={getUploadUrl(wizard.videoPending)}
            controls
            className="aw-profile__video"
          />
          <div className="aw-profile__video-actions">
            <button
              type="button"
              className="aw-profile__btn aw-profile__btn--primary"
              onClick={onApprove}
              disabled={videoApproveLoading}
            >
              {videoApproveLoading ? '…' : '✓ Zatwierdź'}
            </button>
            <button
              type="button"
              className="aw-profile__btn aw-profile__btn--secondary"
              onClick={onReject}
              disabled={videoRejectLoading}
            >
              {videoRejectLoading ? '…' : '✕ Odrzuć'}
            </button>
          </div>
        </div>
      ) : wizard.video ? (
        <div className="aw-profile__video-wrap">
          <video
            src={getUploadUrl(wizard.video)}
            controls
            className="aw-profile__video"
          />
        </div>
      ) : (
        <p className="aw-profile__card-row" style={{ color: 'var(--text-muted)' }}>
          Brak filmiku
        </p>
      )}
    </section>
  );
}

export function CommissionCard({
  wizard,
  feePercent,
  setFeePercent,
  feeSaving,
  resetToTierLoading,
  onSaveFee,
  onResetToTier,
}: {
  wizard: WizardData;
  feePercent: string;
  setFeePercent: (v: string) => void;
  feeSaving: boolean;
  resetToTierLoading: boolean;
  onSaveFee: () => void;
  onResetToTier: () => void;
}) {
  return (
    <section className="aw-profile__card">
      <h2 className="aw-profile__card-title">Prowizja platformy</h2>
      <p className="aw-profile__card-row">
        <span className="aw-profile__label">Obecna prowizja:</span>{' '}
        {wizard.platformFeePercent != null ? (
          <>{wizard.platformFeePercent}% (ustawiona ręcznie)</>
        ) : (
          <>{wizard.tierBasedFee?.feePercent ?? 20}% (z progów)</>
        )}
      </p>
      {wizard.tierBasedFee && (
        <p className="aw-profile__card-row" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Z progów: {wizard.tierBasedFee.meetingsInWindow} spotkań w ostatnich {wizard.tierBasedFee.windowDays} dniach → {wizard.tierBasedFee.feePercent}%
        </p>
      )}
      <div className="aw-profile__card-row aw-profile__card-row--inline">
        <input
          type="number"
          min={0}
          max={100}
          value={feePercent}
          onChange={(e) => setFeePercent(e.target.value)}
          className="aw-profile__fee-input"
        />
        <span>%</span>
        <button
          type="button"
          className="aw-profile__fee-btn"
          onClick={onSaveFee}
          disabled={feeSaving}
        >
          {feeSaving ? 'Zapisywanie…' : 'Zapisz (override)'}
        </button>
      </div>
      <div className="aw-profile__card-row" style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="aw-profile__btn aw-profile__btn--secondary"
          onClick={onResetToTier}
          disabled={resetToTierLoading || wizard.platformFeePercent == null}
          title={wizard.platformFeePercent == null ? 'Specjalista już używa progów' : 'Usuń override, oblicz prowizję z progów'}
        >
          {resetToTierLoading ? '…' : 'Oblicz z progów'}
        </button>
      </div>
    </section>
  );
}

export function ProfileActions({
  wizard,
  featuredLoading,
  onSetFeatured,
}: {
  wizard: WizardData;
  featuredLoading: boolean;
  onSetFeatured: () => void;
}) {
  return (
    <div className="aw-profile__actions">
      <a
        href={`mailto:${wizard.email}`}
        className="aw-profile__btn aw-profile__btn--primary"
      >
        ✉ Napisz e-mail
      </a>
      {!wizard.isFeatured ? (
        <button
          className="aw-profile__btn aw-profile__btn--featured"
          disabled={featuredLoading}
          onClick={onSetFeatured}
        >
          {featuredLoading ? '…' : '✦ Ustaw wyróżnienie (bez płatności)'}
        </button>
      ) : (
        <span className="aw-profile__btn aw-profile__btn--muted">
          Wyróżnienie aktywne
        </span>
      )}
    </div>
  );
}

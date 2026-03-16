'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../../../lib/auth-mock';
import { getUploadUrl } from '../../../../lib/api';
import {
  apiGetAdminWizard,
  apiSetAdminWizardFeatured,
  apiUpdateAdminWizardPlatformFee,
  apiResetWizardPlatformFeeToTier,
  apiApproveWizardVideo,
  apiRejectWizardVideo,
} from '../../../../lib/api-admin';
import '../../../panel-shared.css';
import '../wrozki.css';

export default function AdminWizardProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [user] = useState(() => getStoredUser());
  const [wizard, setWizard] = useState<Awaited<ReturnType<typeof apiGetAdminWizard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [feePercent, setFeePercent] = useState<string>('');
  const [feeSaving, setFeeSaving] = useState(false);
  const [resetToTierLoading, setResetToTierLoading] = useState(false);
  const [videoApproveLoading, setVideoApproveLoading] = useState(false);
  const [videoRejectLoading, setVideoRejectLoading] = useState(false);

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      router.replace('/panel');
      return;
    }
    if (Number.isNaN(id) || id < 1) {
      router.replace('/panel/admin/wrozki');
      return;
    }
    apiGetAdminWizard(user.token, id)
      .then(setWizard)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Nie udało się pobrać danych specjalisty.');
        router.replace('/panel/admin/wrozki');
      })
      .finally(() => setLoading(false));
  }, [user, id, router]);

  useEffect(() => {
    if (wizard?.platformFeePercent != null) {
      setFeePercent(String(wizard.platformFeePercent));
    } else {
      setFeePercent(String(wizard?.tierBasedFee?.feePercent ?? 20));
    }
  }, [wizard?.platformFeePercent, wizard?.tierBasedFee?.feePercent]);

  const handleSetFeatured = async () => {
    if (!user || !wizard) return;
    setFeaturedLoading(true);
    try {
      await apiSetAdminWizardFeatured(user.token, wizard.id);
      toast.success('Wyróżnienie ustawione bez płatności.');
      setWizard((prev) =>
        prev
          ? {
              ...prev,
              isFeatured: true,
              featuredExpiresAt: null, // backend zwraca datę, ale nie odświeżamy
            }
          : null,
      );
      // Odśwież dane, żeby mieć featuredExpiresAt
      const updated = await apiGetAdminWizard(user.token, wizard.id);
      setWizard(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setFeaturedLoading(false);
    }
  };

  const handleResetToTier = async () => {
    if (!user || !wizard) return;
    setResetToTierLoading(true);
    try {
      await apiResetWizardPlatformFeeToTier(user.token, wizard.id);
      toast.success('Prowizja z progów. Specjalista używa teraz naliczania z liczby spotkań.');
      const updated = await apiGetAdminWizard(user.token, wizard.id);
      setWizard(updated);
      setFeePercent(String(updated.tierBasedFee?.feePercent ?? 20));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd resetu');
    } finally {
      setResetToTierLoading(false);
    }
  };

  const handleApproveVideo = async () => {
    if (!user || !wizard) return;
    setVideoApproveLoading(true);
    try {
      await apiApproveWizardVideo(user.token, wizard.id);
      toast.success('Filmik zatwierdzony.');
      const updated = await apiGetAdminWizard(user.token, wizard.id);
      setWizard(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd zatwierdzenia');
    } finally {
      setVideoApproveLoading(false);
    }
  };

  const handleRejectVideo = async () => {
    if (!user || !wizard) return;
    setVideoRejectLoading(true);
    try {
      await apiRejectWizardVideo(user.token, wizard.id);
      toast.success('Filmik odrzucony.');
      const updated = await apiGetAdminWizard(user.token, wizard.id);
      setWizard(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd odrzucenia');
    } finally {
      setVideoRejectLoading(false);
    }
  };

  const handleSaveFee = async () => {
    if (!user || !wizard) return;
    const val = parseInt(feePercent, 10);
    if (Number.isNaN(val) || val < 0 || val > 100) {
      toast.error('Prowizja musi być liczbą 0–100');
      return;
    }
    setFeeSaving(true);
    try {
      await apiUpdateAdminWizardPlatformFee(user.token, wizard.id, val);
      toast.success(`Prowizja ustawiona na ${val}%`);
      setWizard((prev) => (prev ? { ...prev, platformFeePercent: val } : null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd zapisu');
    } finally {
      setFeeSaving(false);
    }
  };

  const formatGrosze = (g: number) => `${(g / 100).toFixed(2)} zł`;
  const formatDate = (s: string) => new Date(s).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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

      <div className="aw-profile__grid">
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
                  onClick={handleApproveVideo}
                  disabled={videoApproveLoading}
                >
                  {videoApproveLoading ? '…' : '✓ Zatwierdź'}
                </button>
                <button
                  type="button"
                  className="aw-profile__btn aw-profile__btn--secondary"
                  onClick={handleRejectVideo}
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
              onClick={handleSaveFee}
              disabled={feeSaving}
            >
              {feeSaving ? 'Zapisywanie…' : 'Zapisz (override)'}
            </button>
          </div>
          <div className="aw-profile__card-row" style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="aw-profile__btn aw-profile__btn--secondary"
              onClick={handleResetToTier}
              disabled={resetToTierLoading || wizard.platformFeePercent == null}
              title={wizard.platformFeePercent == null ? 'Specjalista już używa progów' : 'Usuń override, oblicz prowizję z progów'}
            >
              {resetToTierLoading ? '…' : 'Oblicz z progów'}
            </button>
          </div>
        </section>
      </div>

      {wizard.bio && (
        <section className="aw-profile__card aw-profile__card--full">
          <h2 className="aw-profile__card-title">Opis</h2>
          <p className="aw-profile__bio">{wizard.bio}</p>
        </section>
      )}

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
            onClick={handleSetFeatured}
          >
            {featuredLoading ? '…' : '✦ Ustaw wyróżnienie (bez płatności)'}
          </button>
        ) : (
          <span className="aw-profile__btn aw-profile__btn--muted">
            Wyróżnienie aktywne
          </span>
        )}
      </div>
    </div>
  );
}

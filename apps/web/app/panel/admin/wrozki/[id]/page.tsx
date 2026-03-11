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
        toast.error(err instanceof Error ? err.message : 'Nie udało się pobrać danych wróżki.');
        router.replace('/panel/admin/wrozki');
      })
      .finally(() => setLoading(false));
  }, [user, id, router]);

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
            <span className="aw-profile__featured-badge">✦ Wyróżniona</span>
          )}
        </div>
        <div className="aw-profile__info">
          <h1 className="aw-profile__name">{wizard.username}</h1>
          <p className="aw-profile__joined">
            Dołączyła: {formatDate(wizard.createdAt)}
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
            <span className="aw-profile__label">Dostępna teraz:</span>{' '}
            {wizard.isAvailableNow ? 'Tak' : 'Nie'}
          </p>
          {wizard.isFeatured && wizard.featuredExpiresAt && (
            <p className="aw-profile__card-row">
              <span className="aw-profile__label">Wyróżnienie do:</span>{' '}
              {formatDate(wizard.featuredExpiresAt)}
            </p>
          )}
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

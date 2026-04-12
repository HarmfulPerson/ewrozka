'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/layout/header';
import { Footer } from '../../components/layout/footer';
import { VantaBackground } from '../../components/vanta-background/vanta-background';
import { apiGetWizard, apiGetWizardAdvertisements, WizardDto, AdvertisementDto, getUploadUrl } from '../../lib/api';
import { apiGetWizardReviews, ReviewDto } from '../../lib/api-calendar';
import Image from 'next/image';
import { StarRating } from '../../components/star-rating/StarRating';
import { TopicBadges } from '../../components/topic-badges/topic-badges';
import './wizard-profile.css';
import '../../components/star-rating/star-rating.css';

const PLACEHOLDER_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%231a0a2e' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%238b5cf6' font-size='14' font-family='system-ui'%3EBrak zdjęcia%3C/text%3E%3C/svg%3E";

export default function WizardProfileClient() {
  const params = useParams();
  const [wizard, setWizard] = useState<WizardDto | null>(null);
  const [advertisements, setAdvertisements] = useState<AdvertisementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPages, setReviewsPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const REVIEWS_LIMIT = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // params.id in the route segment may be either the new uid (UUID)
        // or the legacy numeric id during the int-id → uid migration.
        // apiGetWizard handles both internally.
        const wizardResponse = await apiGetWizard(params.id as string);
        setWizard(wizardResponse.wizard);
        // Phase 5: advertisements endpoint now supports uid. Use wizard.uid
        // so the numeric id never leaks on the public profile path.
        const adsResponse = await apiGetWizardAdvertisements(
          wizardResponse.wizard.uid,
        );
        setAdvertisements(adsResponse.advertisements);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchData();
  }, [params.id]);

  useEffect(() => {
    // Phase 5: reviews endpoint now supports uid. Use wizard.uid for the
    // public profile path so the wizard's numeric id doesn't leak.
    if (!wizard) return;
    setReviewsLoading(true);
    apiGetWizardReviews(wizard.uid, reviewsPage, REVIEWS_LIMIT)
      .then((res) => {
        setReviews(res.reviews);
        setReviewsTotal(res.total);
        setReviewsPages(res.pages);
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [wizard, reviewsPage]);

  if (loading) {
    return (
      <div className="wizard-page">
        <Header />
        <main className="wizard-main">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Ładowanie...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!wizard) {
    return (
      <div className="wizard-page">
        <Header />
        <main className="wizard-main">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Specjalista nie znaleziony</p>
        </main>
        <Footer />
      </div>
    );
  }

  const firstPhoto = wizard.image || wizard.image2 || wizard.image3;
  const specializations =
    wizard.topicNames && wizard.topicNames.length > 0
      ? wizard.topicNames
      : ['Tarot', 'Astrologia', 'Runy'];
  const hasRating =
    wizard.avgRating != null && wizard.ratingsCount != null && wizard.ratingsCount > 0;

  return (
    <div className="wizard-page">
      <VantaBackground>
      <Header />
      <main className="wizard-main">
        <div className="wizard-nav">
          <Link href="/ogloszenia" className="wizard-nav__back">← Wróć</Link>
          <div className="wizard-nav__breadcrumbs">
            <Link href="/ogloszenia" className="breadcrumb-link">Specjaliści</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{wizard.username}</span>
          </div>
        </div>

        {/* ── Kompaktowy nagłówek specjalisty ── */}
        <div className="wizard-hero">
          <div className="wizard-hero__avatar">
            <Image
              src={firstPhoto ? getUploadUrl(firstPhoto) : PLACEHOLDER_AVATAR}
              alt={wizard.username}
              width={120}
              height={120}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER_AVATAR;
              }}
            />
          </div>

          <div className="wizard-hero__info">
            <div className="wizard-hero__name-row">
              <h1 className="wizard-hero__name">{wizard.username}</h1>
              {wizard.video && (
                <button
                  type="button"
                  className="wizard-hero__meet-btn"
                  onClick={() => setVideoModalOpen(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Poznaj mnie
                </button>
              )}
            </div>

            <TopicBadges topics={specializations} />

            <div className="wizard-hero__rating">
              {hasRating ? (
                <StarRating avg={wizard.avgRating!} count={wizard.ratingsCount!} />
              ) : (
                <span className="wizard-hero__no-rating">Brak ocen</span>
              )}
            </div>

            <p className="wizard-hero__bio">
              {wizard.bio ||
                'Doświadczony specjalista specjalizujący się w różnych formach wróżbiarstwa.'}
            </p>
          </div>
        </div>

        {/* ── Usługi ── */}
        <section className="wizard-services">
          <h2 className="wizard-services__title">Dostępne usługi</h2>
          {advertisements.length === 0 ? (
            <p className="wizard-services__empty">
              Ten specjalista nie ma jeszcze dostępnych ogłoszeń.
            </p>
          ) : (
            <div className="wizard-services__grid">
              {advertisements.map((ad) => (
                <Link key={ad.uid} href={`/ogloszenie/${ad.uid}`} className="wizard-ad-card">
                  {ad.imageUrl && (
                    <div className="wizard-ad-card__image">
                      <Image
                        src={getUploadUrl(ad.imageUrl)}
                        alt={ad.title}
                        width={300}
                        height={160}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    </div>
                  )}
                  <div className="wizard-ad-card__body">
                    <h3 className="wizard-ad-card__title">{ad.title}</h3>
                    <p className="wizard-ad-card__description">{ad.description}</p>
                    <div className="wizard-ad-card__footer">
                      <span className="wizard-ad-card__price">
                        {(ad.priceGrosze / 100).toFixed(2)} zł
                      </span>
                      <span className="wizard-ad-card__duration">{ad.durationMinutes} min</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Recenzje ── */}
        <section className="wizard-reviews">
          <h2 className="wizard-reviews__title">
            Opinie klientów
            {reviewsTotal > 0 && (
              <span className="wizard-reviews__count">{reviewsTotal}</span>
            )}
          </h2>

          {reviewsLoading ? (
            <div className="wizard-reviews__loading">
              <span className="wizard-reviews__spinner" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="wizard-reviews__empty">Ten specjalista nie ma jeszcze żadnych opinii.</p>
          ) : (
            <>
              <div className="wizard-reviews__list">
                {reviews.map((r) => (
                  <div key={r.uid} className="review-card">
                    <div className="review-card__header">
                      <div className="review-card__avatar">
                        {r.clientUsername.charAt(0).toUpperCase()}
                      </div>
                      <div className="review-card__meta">
                        <span className="review-card__author">{r.clientUsername}</span>
                        <span className="review-card__date">
                          {new Date(r.createdAt).toLocaleDateString('pl-PL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="review-card__stars">
                        {Array.from({ length: 5 }, (_, i) => (
                          <svg
                            key={i}
                            className={`review-star ${i < r.rating ? 'review-star--filled' : 'review-star--empty'}`}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={i < r.rating ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="review-card__comment">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>

              {reviewsPages > 1 && (
                <div className="wizard-reviews__pagination">
                  <button
                    className="wizard-reviews__page-btn"
                    disabled={reviewsPage === 1}
                    onClick={() => setReviewsPage((p) => p - 1)}
                  >
                    ←
                  </button>
                  <span className="wizard-reviews__page-info">
                    {reviewsPage} / {reviewsPages}
                  </span>
                  <button
                    className="wizard-reviews__page-btn"
                    disabled={reviewsPage === reviewsPages}
                    onClick={() => setReviewsPage((p) => p + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </section>

      </main>
      </VantaBackground>
      <Footer />

      {/* ── Modal "Poznaj mnie" ── */}
      {videoModalOpen && wizard?.video && (
        <div
          className="video-modal-overlay"
          onClick={() => {
            setVideoModalOpen(false);
            videoRef.current?.pause();
          }}
        >
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="video-modal__close"
              aria-label="Zamknij"
              onClick={() => {
                setVideoModalOpen(false);
                videoRef.current?.pause();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src={getUploadUrl(wizard.video)}
              controls
              autoPlay
              className="video-modal__video"
            />
          </div>
        </div>
      )}
    </div>
  );
}

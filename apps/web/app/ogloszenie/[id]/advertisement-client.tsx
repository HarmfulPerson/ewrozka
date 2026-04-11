'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Header } from '../../components/layout/header';
import { Footer } from '../../components/layout/footer';
import { VantaBackground } from '../../components/vanta-background/vanta-background';
import { TopicBadges } from '../../components/topic-badges/topic-badges';
import { apiGetAdvertisement, AdvertisementDetailDto, getUploadUrl } from '../../lib/api';
import { getStoredUser } from '../../lib/auth-mock';
import { apiCreateMeetingRequest, apiCreateGuestBooking } from '../../lib/api-meetings';
import { useBooking } from './use-booking';
import { useEditAdvertisement } from './use-edit-advertisement';
import { BookingModal } from './booking-modal';
import { EditModal } from './edit-modal';
import './advertisement.css';

export default function AdvertisementClient() {
  const params = useParams();
  const router = useRouter();
  const [advertisement, setAdvertisement] = useState<AdvertisementDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  const isOwner = !!user && !!advertisement && user.roles?.includes('wizard') && user.uid === advertisement.wizard.uid;
  const isOtherWizard = !!user && user.roles?.includes('wizard') && !isOwner;

  const booking = useBooking(advertisement?.uid);
  const edit = useEditAdvertisement(advertisement, user?.token, (updated) => {
    setAdvertisement(prev => prev ? { ...prev, ...updated } : prev);
  });

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      try {
        // params.id is now an opaque string — may be uid (UUID) or legacy
        // numeric id during the migration. apiGetAdvertisement handles both.
        const response = await apiGetAdvertisement(params.id as string);
        setAdvertisement(response.advertisement);
      } catch (error) {
        console.error('Error fetching advertisement:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  // ── Booking actions ──

  const handleConfirmBooking = async () => {
    if (!booking.selectedSlot || !advertisement || !user) return;
    booking.setSubmitting(true);
    try {
      await apiCreateMeetingRequest(user.token, {
        advertisementUid: advertisement.uid,
        requestedStartsAt: booking.selectedSlot.startsAt,
        message: '',
      });
      booking.close();
      toast.success('Wniosek wysłany! Specjalista musi go zaakceptować.');
    } catch (error) {
      toast.error('Nie udało się wysłać wniosku: ' + (error instanceof Error ? error.message : 'Błąd'));
    } finally {
      booking.setSubmitting(false);
    }
  };

  const handleConfirmGuestBooking = async () => {
    if (!booking.selectedSlot || !advertisement) return;
    if (!booking.validateGuestForm()) return;
    booking.setSubmitting(true);
    try {
      await apiCreateGuestBooking({
        advertisementUid: advertisement.uid,
        guestName: booking.guestForm.name.trim(),
        guestEmail: booking.guestForm.email.trim(),
        guestPhone: booking.guestForm.phone.trim() || undefined,
        message: booking.guestForm.message.trim() || undefined,
        scheduledAt: booking.selectedSlot.startsAt,
      });
      booking.setGuestSuccess(true);
    } catch (err) {
      booking.setGuestErrors({ name: 'Nie udało się wysłać wniosku: ' + (err instanceof Error ? err.message : 'Błąd') });
    } finally {
      booking.setSubmitting(false);
    }
  };

  // ── Loading / not found states ──

  if (loading) {
    return (
      <div className="advertisement-page">
        <Header />
        <main className="advertisement-main">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Ładowanie...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!advertisement) {
    return (
      <div className="advertisement-page">
        <Header />
        <main className="advertisement-main">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Ogłoszenie nie znalezione</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="advertisement-page">
      <VantaBackground>
        <Header />
        <main className="advertisement-main">
          <div className="advertisement-topnav">
            <Link href={`/wrozka/${advertisement.wizard.uid}`} className="advertisement-topnav__back">← Wróć</Link>
            <div className="advertisement-topnav__breadcrumbs">
              <Link href="/ogloszenia" className="breadcrumb-link">Specjaliści</Link>
              <span className="breadcrumb-separator">/</span>
              <Link href={`/wrozka/${advertisement.wizard.uid}`} className="breadcrumb-link">
                {advertisement.wizard.username}
              </Link>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{advertisement.title}</span>
            </div>
          </div>

          <div className="advertisement-body">
            <div className="advertisement-details">
              {advertisement.imageUrl && (
                <div className="advertisement-details__image">
                  <Image
                    src={getUploadUrl(advertisement.imageUrl)}
                    alt={advertisement.title}
                    width={600}
                    height={400}
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                </div>
              )}

              <div className="advertisement-details__body">
                <h1 className="advertisement-details__title">{advertisement.title}</h1>

                <div className="advertisement-details__wizard">
                  <Link href={`/wrozka/${advertisement.wizard.uid}`} className="wizard-link">
                    {advertisement.wizard.image && (
                      <Image
                        src={getUploadUrl(advertisement.wizard.image)}
                        alt={advertisement.wizard.username}
                        width={48}
                        height={48}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                        unoptimized
                      />
                    )}
                    <span>{advertisement.wizard.username}</span>
                  </Link>
                </div>

                {advertisement.wizard.topicNames && advertisement.wizard.topicNames.length > 0 && (
                  <TopicBadges topics={advertisement.wizard.topicNames} />
                )}

                <p className="advertisement-details__description">{advertisement.description}</p>

                <div className="advertisement-details__info">
                  <div className="info-item">
                    <span className="info-label">Cena:</span>
                    <span className="info-value info-value--price">
                      {(advertisement.priceGrosze / 100).toFixed(2)} zł
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Czas trwania:</span>
                    <span className="info-value">{advertisement.durationMinutes} minut</span>
                  </div>
                </div>

                {isOwner ? (
                  <button onClick={edit.open} className="advertisement-details__book-btn advertisement-details__edit-btn">
                    ✏️ Edytuj ogłoszenie
                  </button>
                ) : isOtherWizard ? (
                  <p className="advertisement-details__wizard-notice">
                    Jesteś specjalistą — nie możesz umawiać się na konsultacje.
                  </p>
                ) : (
                  <button onClick={() => booking.open(!!user)} className="advertisement-details__book-btn">
                    Umów się na konsultację
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </VantaBackground>
      <Footer />

      <EditModal edit={edit} />
      <BookingModal
        booking={booking}
        onLogin={() => router.push(`/login?returnUrl=/ogloszenie/${params.id}`)}
        onConfirmBooking={handleConfirmBooking}
        onConfirmGuestBooking={handleConfirmGuestBooking}
      />
    </div>
  );
}

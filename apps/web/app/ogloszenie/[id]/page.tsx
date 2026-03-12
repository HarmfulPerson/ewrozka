'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/layout/header';
import { Footer } from '../../components/layout/footer';
import { apiGetAdvertisement, AdvertisementDetailDto, getUploadUrl } from '../../lib/api';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetAvailableSlots, SlotDto } from '../../lib/api-booking';
import { apiCreateMeetingRequest, apiCreateGuestBooking } from '../../lib/api-meetings';
import { apiUpdateAdvertisement } from '../../lib/api-advertisements';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';
import './advertisement.css';

export default function AdvertisementPage() {
  const params = useParams();
  const router = useRouter();
  const [advertisement, setAdvertisement] = useState<AdvertisementDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  // Czy to moje ogłoszenie
  const isOwner = !!user && !!advertisement && user.roles?.includes('wizard') && user.id === advertisement.wizard.id;
  // Czy jestem wróżką oglądającą cudze ogłoszenie
  const isOtherWizard = !!user && user.roles?.includes('wizard') && !isOwner;

  // === Modal rezerwacji ===
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  // 'choice' | 'slots' | 'guest-form'
  const [bookingStep, setBookingStep] = useState<'choice' | 'slots' | 'guest-form'>('choice');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<SlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Guest form
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [guestSuccess, setGuestSuccess] = useState(false);
  const [guestErrors, setGuestErrors] = useState<{ name?: string; email?: string }>({});

  // === Modal edycji ===
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriceZl, setEditPriceZl] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const fetchAdvertisement = async () => {
      try {
        const id = parseInt(params.id as string, 10);
        const response = await apiGetAdvertisement(id);
        setAdvertisement(response.advertisement);
      } catch (error) {
        console.error('Error fetching advertisement:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAdvertisement();
    }
  }, [params.id]);

  // === Obsługa edycji ===
  const openEditModal = () => {
    if (!advertisement) return;
    setEditTitle(advertisement.title);
    setEditDescription(advertisement.description);
    setEditPriceZl(((advertisement.priceGrosze ?? 0) / 100).toFixed(2));
    setEditDuration(String(advertisement.durationMinutes));
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!advertisement || !user) return;

    const priceZl = parseFloat(editPriceZl.replace(',', '.'));
    const duration = parseInt(editDuration, 10);

    if (!editTitle.trim()) { setEditError('Podaj tytuł.'); return; }
    if (isNaN(priceZl) || priceZl <= 0) { setEditError('Podaj poprawną cenę.'); return; }
    if (isNaN(duration) || duration < 5) { setEditError('Czas trwania musi wynosić co najmniej 5 minut.'); return; }

    setEditSaving(true);
    setEditError('');
    try {
      const res = await apiUpdateAdvertisement(user.token, advertisement.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priceGrosze: Math.round(priceZl * 100),
        durationMinutes: duration,
      });
      setAdvertisement(prev => prev ? { ...prev, ...res.advertisement } : prev);
      setEditModalOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Błąd zapisu');
    } finally {
      setEditSaving(false);
    }
  };

  // === Obsługa rezerwacji ===
  const handleBooking = () => {
    if (!advertisement) return;
    setBookingStep(user ? 'slots' : 'choice');
    setBookingModalOpen(true);
    if (user) loadSlotDates();
  };

  const loadSlotDates = async () => {
    if (!advertisement) return;
    setLoadingDates(true);

    try {
      const today = new Date();
      const threeMonthsLater = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      const fromDate = today.toISOString().split('T')[0] ?? '';
      const toDate = threeMonthsLater.toISOString().split('T')[0] ?? '';
      const response = await apiGetAvailableSlots(advertisement!.id, fromDate, toDate);
      const toLocalDateStr = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      };
      const uniqueDates = [...new Set(response.slots.map(slot => toLocalDateStr(slot.startsAt)))];
      setAvailableDates(uniqueDates);
    } catch (error) {
      console.error('Error fetching available dates:', error);
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  };

  const closeBookingModal = () => {
    setBookingModalOpen(false);
    setBookingStep('choice');
    setSelectedDate(null);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setAvailableDates([]);
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setGuestMessage('');
    setGuestSuccess(false);
    setGuestErrors({});
  };

  const handleChooseGuest = () => {
    setBookingStep('guest-form');
    loadSlotDates();
  };

  const handleChooseLogin = () => {
    router.push(`/login?returnUrl=/ogloszenie/${params.id}`);
  };

  const handleConfirmGuestBooking = async () => {
    if (!selectedSlot || !advertisement) return;
    const errs: { name?: string; email?: string } = {};
    if (!guestName.trim()) errs.name = 'Podaj imię i nazwisko';
    if (!guestEmail.trim() || !guestEmail.includes('@')) errs.email = 'Podaj poprawny adres e-mail';
    if (Object.keys(errs).length > 0) { setGuestErrors(errs); return; }
    setGuestErrors({});
    setSubmitting(true);
    try {
      await apiCreateGuestBooking({
        advertisementId: advertisement.id,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim() || undefined,
        message: guestMessage.trim() || undefined,
        scheduledAt: selectedSlot.startsAt,
      });
      setGuestSuccess(true);
    } catch (err) {
      setGuestErrors({ name: 'Nie udało się wysłać wniosku: ' + (err instanceof Error ? err.message : 'Błąd') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateSelect = async (dateStr: string) => {
    if (!advertisement) return;
    setSelectedDate(dateStr);
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const date = new Date(dateStr);
      const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const fromDate = dateStr;
      const toDate = nextDay.toISOString().split('T')[0] ?? '';
      const response = await apiGetAvailableSlots(advertisement.id, fromDate, toDate);
      setAvailableSlots(response.slots);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot: SlotDto) => {
    setSelectedSlot(slot);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !advertisement || !user) return;
    setSubmitting(true);
    try {
      await apiCreateMeetingRequest(user.token, {
        advertisementId: advertisement.id,
        requestedStartsAt: selectedSlot.startsAt,
        message: '',
      });
      closeBookingModal();
      toast.success('Wniosek wysłany! Wróżka musi go zaakceptować.');
    } catch (error) {
      toast.error('Nie udało się wysłać wniosku: ' + (error instanceof Error ? error.message : 'Błąd'));
    } finally {
      setSubmitting(false);
    }
  };

  const groupDatesByMonth = () => {
    const grouped: { [key: string]: string[] } = {};
    availableDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(dateStr);
    });
    return grouped;
  };

  const formatMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year ?? '0'), parseInt(month ?? '1') - 1, 1);
    return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  };

  /** Formatuje godzinę slotu w lokalnej strefie (zamiast UTC z backendu). */
  const formatSlotTime = (startsAt: string) =>
    new Date(startsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

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

  const groupedDates = groupDatesByMonth();

  return (
    <div className="advertisement-page">
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
          success: { iconTheme: { primary: '#a78bfa', secondary: '#1a1625' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#1a1625' } },
        }}
      />
      <Header />
      <main className="advertisement-main">
        <div className="advertisement-content">
          <div className="advertisement-breadcrumbs">
            <Link href="/ogloszenia" className="breadcrumb-link">Wróżki</Link>
            <span className="breadcrumb-separator">/</span>
            <Link href={`/wrozka/${advertisement.wizard.id}`} className="breadcrumb-link">
              {advertisement.wizard.username}
            </Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{advertisement.title}</span>
          </div>

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
                <Link href={`/wrozka/${advertisement.wizard.id}`} className="wizard-link">
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
                <div className="advertisement-details__topics">
                  {advertisement.wizard.topicNames.map((topic, i) => (
                    <span key={i} className="topic-badge">{topic}</span>
                  ))}
                </div>
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

              {/* CTA — w zależności od roli */}
              {isOwner ? (
                <button
                  onClick={openEditModal}
                  className="advertisement-details__book-btn advertisement-details__edit-btn"
                >
                  ✏️ Edytuj ogłoszenie
                </button>
              ) : isOtherWizard ? (
                <p className="advertisement-details__wizard-notice">
                  Jesteś wróżką — nie możesz umawiać się na konsultacje.
                </p>
              ) : (
                <button
                  onClick={handleBooking}
                  className="advertisement-details__book-btn"
                >
                  Umów się na konsultację
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Modal edycji */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content modal-content--edit" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edytuj ogłoszenie</h3>
              <button className="modal-close" onClick={() => setEditModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="edit-field">
                <label className="edit-label">Tytuł</label>
                <input
                  className="edit-input"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Tytuł ogłoszenia"
                />
              </div>
              <div className="edit-field">
                <label className="edit-label">Opis</label>
                <textarea
                  className="edit-input edit-input--textarea"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={5}
                  placeholder="Opis usługi"
                />
              </div>
              <div className="edit-row">
                <div className="edit-field">
                  <label className="edit-label">Cena (zł)</label>
                  <input
                    className="edit-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPriceZl}
                    onChange={e => setEditPriceZl(e.target.value)}
                    placeholder="np. 50.00"
                  />
                </div>
                <div className="edit-field">
                  <label className="edit-label">Czas trwania (min)</label>
                  <input
                    className="edit-input"
                    type="number"
                    min="5"
                    step="5"
                    value={editDuration}
                    onChange={e => setEditDuration(e.target.value)}
                    placeholder="np. 60"
                  />
                </div>
              </div>
              {editError && <p className="edit-error">{editError}</p>}
            </div>
            <div className="modal-footer">
              <button className="modal-button modal-button--cancel" onClick={() => setEditModalOpen(false)}>
                Anuluj
              </button>
              <button
                className="modal-button modal-button--primary"
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rezerwacji */}
      {bookingModalOpen && (
        <div className="modal-overlay" onClick={closeBookingModal}>
          <div className="modal-content modal-content--booking" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {bookingStep === 'choice' ? 'Umów konsultację' : bookingStep === 'guest-form' ? 'Rezerwacja jako gość' : 'Wybierz termin'}
              </h3>
              <button className="modal-close" onClick={closeBookingModal}>✕</button>
            </div>

            {/* ── Krok 1: Wybór gość / zaloguj się ── */}
            {bookingStep === 'choice' && (
              <div className="modal-body booking-choice">
                <p className="booking-choice__hint">Jak chcesz się umówić?</p>
                <button className="booking-choice__btn" onClick={handleChooseLogin}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Zaloguj się</span>
                  <small>Pełna historia wizyt, powiadomienia</small>
                </button>
                <button className="booking-choice__btn booking-choice__btn--ghost" onClick={handleChooseGuest}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    <path d="M19 11l2 2-2 2"/>
                  </svg>
                  <span>Kontynuuj jako gość</span>
                  <small>Tylko imię, e-mail i numer telefonu</small>
                </button>
              </div>
            )}

            {/* ── Krok 2a: Wybór terminu (zalogowany) ── */}
            {bookingStep === 'slots' && (
              <div className="modal-body">
                {loadingDates ? (
                  <p className="booking-loading">Ładowanie dostępnych terminów...</p>
                ) : availableDates.length === 0 ? (
                  <p className="booking-empty">Brak dostępnych terminów w najbliższych miesiącach</p>
                ) : (
                  <>
                    <div className="booking-dates">
                      <h4 className="booking-dates__title">Dostępne dni</h4>
                      {Object.entries(groupedDates).map(([monthKey, dates]) => (
                        <div key={monthKey} className="booking-month">
                          <h5 className="booking-month__name">{formatMonthName(monthKey)}</h5>
                          <div className="booking-month__dates">
                            {dates.map((dateStr) => {
                              const date = new Date(dateStr);
                              const isSelected = dateStr === selectedDate;
                              return (
                                <button
                                  key={dateStr}
                                  className={`booking-date ${isSelected ? 'booking-date--selected' : ''}`}
                                  onClick={() => handleDateSelect(dateStr)}
                                >
                                  <span className="booking-date__day">{date.toLocaleDateString('pl-PL', { weekday: 'short' })}</span>
                                  <span className="booking-date__num">{date.getDate()}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedDate && (
                      <div className="booking-slots">
                        <h4 className="booking-slots__title">Dostępne godziny</h4>
                        {loadingSlots ? (
                          <p className="booking-slots__loading">Ładowanie...</p>
                        ) : availableSlots.length === 0 ? (
                          <p className="booking-slots__empty">Brak dostępnych terminów w tym dniu</p>
                        ) : (
                          <div className="booking-slots__grid">
                            {availableSlots.map((slot, i) => (
                              <button
                                key={i}
                                className={`booking-slot ${selectedSlot?.startsAt === slot.startsAt ? 'booking-slot--selected' : ''}`}
                                onClick={() => handleSlotSelect(slot)}
                              >
                                {formatSlotTime(slot.startsAt)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Krok 2b: Formularz gościa ── */}
            {bookingStep === 'guest-form' && !guestSuccess && (
              <div className="modal-body">
                {/* Wybór terminu */}
                {!selectedSlot ? (
                  loadingDates ? (
                    <p className="booking-loading">Ładowanie terminów...</p>
                  ) : availableDates.length === 0 ? (
                    <p className="booking-empty">Brak dostępnych terminów</p>
                  ) : (
                    <>
                      <p className="guest-form__label" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Wybierz termin:</p>
                      <div className="booking-dates">
                        {Object.entries(groupedDates).map(([monthKey, dates]) => (
                          <div key={monthKey} className="booking-month">
                            <h5 className="booking-month__name">{formatMonthName(monthKey)}</h5>
                            <div className="booking-month__dates">
                              {dates.map((dateStr) => (
                                <button
                                  key={dateStr}
                                  className={`booking-date ${dateStr === selectedDate ? 'booking-date--selected' : ''}`}
                                  onClick={() => handleDateSelect(dateStr)}
                                >
                                  <span className="booking-date__day">{new Date(dateStr).toLocaleDateString('pl-PL', { weekday: 'short' })}</span>
                                  <span className="booking-date__num">{new Date(dateStr).getDate()}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedDate && (
                        <div className="booking-slots">
                          {loadingSlots ? <p className="booking-slots__loading">Ładowanie...</p> : (
                            <div className="booking-slots__grid">
                              {availableSlots.map((slot: SlotDto, i) => (
                                <button key={i}
                                  className="booking-slot"
                                  onClick={() => handleSlotSelect(slot)}>
                                  {formatSlotTime(slot.startsAt)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )
                ) : (
                  /* Formularz danych gościa */
                  <div className="guest-form">
                    <p className="guest-form__slot">
                      Wybrany termin: <strong>{new Date(selectedSlot.startsAt).toLocaleString('pl-PL', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>
                      <button className="guest-form__change-slot" onClick={() => setSelectedSlot(null)}>Zmień</button>
                    </p>
                    <div className="guest-form__field">
                      <label>Imię i nazwisko *</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={e => { setGuestName(e.target.value); setGuestErrors(p => ({ ...p, name: undefined })); }}
                        placeholder="Jan Kowalski"
                        className={guestErrors.name ? 'guest-form__input--error' : ''}
                      />
                      {guestErrors.name && <span className="guest-form__error">{guestErrors.name}</span>}
                    </div>
                    <div className="guest-form__field">
                      <label>E-mail *</label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={e => { setGuestEmail(e.target.value); setGuestErrors(p => ({ ...p, email: undefined })); }}
                        placeholder="jan@email.com"
                        className={guestErrors.email ? 'guest-form__input--error' : ''}
                      />
                      {guestErrors.email && <span className="guest-form__error">{guestErrors.email}</span>}
                    </div>
                    <div className="guest-form__field">
                      <label>Numer telefonu</label>
                      <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+48 600 000 000" />
                    </div>
                    <div className="guest-form__field">
                      <label>Wiadomość (opcjonalnie)</label>
                      <textarea rows={3} value={guestMessage} onChange={e => setGuestMessage(e.target.value)} placeholder="Napisz coś o czym chcesz porozmawiać..." />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Sukces ── */}
            {bookingStep === 'guest-form' && guestSuccess && (
              <div className="modal-body booking-success">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
                <h3>Wniosek wysłany!</h3>
                <p>Wróżka sprawdzi Twój wniosek i – jeśli zaakceptuje – wyślemy Ci e-mail z linkiem do płatności.</p>
                <button className="modal-button modal-button--primary" onClick={closeBookingModal}>Zamknij</button>
              </div>
            )}

            {/* Footer z przyciskami */}
            {bookingStep === 'slots' && (
              <div className="modal-footer">
                <button className="modal-button modal-button--cancel" onClick={closeBookingModal}>Anuluj</button>
                <button className="modal-button modal-button--primary"
                  onClick={handleConfirmBooking} disabled={!selectedSlot || submitting}>
                  {submitting ? 'Wysyłanie...' : 'Wyślij wniosek'}
                </button>
              </div>
            )}
            {bookingStep === 'guest-form' && !guestSuccess && selectedSlot && (
              <div className="modal-footer">
                <button className="modal-button modal-button--cancel" onClick={closeBookingModal}>Anuluj</button>
                <button className="modal-button modal-button--primary"
                  onClick={handleConfirmGuestBooking} disabled={submitting}>
                  {submitting ? 'Wysyłanie...' : 'Wyślij wniosek'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

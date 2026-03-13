'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { Appearance } from '@stripe/stripe-js';
import { Header } from '../../../components/layout/header';
import { Footer } from '../../../components/layout/footer';
import { apiGetGuestBookingDetails } from '../../../lib/api-meetings';
import './guest-payment.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001').replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;
  return `${apiBase}/${path}`;
}

interface BookingDetails {
  id: string;
  guestName: string;
  wizardName: string;
  advertisementTitle: string;
  scheduledAt: string;
  durationMinutes: number;
  priceGrosze: number;
  status: string;
}

// ── Formularz wbudowany ───────────────────────────────────────────────────────

function GuestCheckoutForm({
  bookingId,
  onSuccess,
}: {
  bookingId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');

  const verifyAndSucceed = async (paymentIntentId: string) => {
    try {
      const res = await fetch(apiUrl('guest-bookings/verify-payment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      });
      const data = await res.json();
      return data.success as boolean;
    } catch {
      return false;
    }
  };

  const pollUntilPaid = async (paymentIntentId: string) => {
    setPolling(true);
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      if (await verifyAndSucceed(paymentIntentId)) {
        setPolling(false);
        onSuccess();
        return;
      }
    }
    setPolling(false);
    setLoading(false);
    setError('Płatność nie została potwierdzona w czasie. Sprawdź e-mail lub odśwież stronę.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/guest/platnosc/sukces`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Błąd płatności');
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      await verifyAndSucceed(paymentIntent.id);
      onSuccess();
    } else if (paymentIntent?.status === 'processing') {
      pollUntilPaid(paymentIntent.id);
    } else {
      setError('Nieoczekiwany status. Spróbuj ponownie.');
      setLoading(false);
    }
  };

  if (polling) {
    return (
      <div className="gp-processing">
        <div className="gp-spinner" />
        <p className="gp-processing__title">Oczekiwanie na potwierdzenie</p>
        <p className="gp-processing__desc">
          Zatwierdź płatność w aplikacji bankowej. Strona zaktualizuje się automatycznie.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="gp-form">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="gp-error">{error}</p>}
      <button
        type="submit"
        className="gp-submit-btn"
        disabled={!stripe || loading}
      >
        {loading ? <span className="gp-spinner gp-spinner--sm" /> : 'Zapłać'}
      </button>
    </form>
  );
}

// ── Strona główna ─────────────────────────────────────────────────────────────

export default function GuestPaymentPage() {
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [initError, setInitError] = useState('');
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    (async () => {
      try {
        const details = await apiGetGuestBookingDetails(bookingId);
        setBooking(details);

        if (details.status === 'accepted') {
          const res = await fetch(
            apiUrl(`guest-bookings/${bookingId}/payment-intent`),
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) },
          );
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j?.message ?? `HTTP ${res.status}`);
          }
          const { clientSecret: cs } = await res.json();
          setClientSecret(cs);
        }
      } catch (e) {
        setInitError(e instanceof Error ? e.message : 'Błąd inicjowania płatności');
      } finally {
        setLoadingPage(false);
      }
    })();
  }, [bookingId]);

  const appearance: Appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#a78bfa',
      colorBackground: '#1e1a2e',
      colorText: '#e2e0f0',
      colorDanger: '#f87171',
      fontFamily: 'inherit',
      borderRadius: '10px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': { border: '1px solid rgba(167,139,250,0.25)', boxShadow: 'none' },
      '.Input:focus': { border: '1px solid #a78bfa', boxShadow: '0 0 0 2px rgba(167,139,250,0.2)' },
      '.Tab': { border: '1px solid rgba(167,139,250,0.2)' },
      '.Tab--selected': { border: '1px solid #a78bfa', boxShadow: '0 0 0 2px rgba(167,139,250,0.15)' },
    },
  };

  const renderContent = () => {
    if (loadingPage) return (
      <div className="gp-state">
        <div className="gp-spinner" />
        <p>Ładowanie szczegółów płatności...</p>
      </div>
    );

    if (initError) return (
      <div className="gp-state">
        <div className="gp-state__icon">❌</div>
        <h2>Błąd</h2>
        <p>{initError}</p>
      </div>
    );

    if (paid) return (
      <div className="gp-state">
        <div className="gp-state__icon">✅</div>
        <h2>Płatność zakończona!</h2>
        <p>Link do spotkania został wysłany na Twój adres e-mail. Sprawdź skrzynkę (również SPAM).</p>
      </div>
    );

    if (booking?.status === 'paid' || booking?.status === 'completed') return (
      <div className="gp-state">
        <div className="gp-state__icon">✅</div>
        <h2>Spotkanie już opłacone</h2>
        <p>Link do spotkania został wysłany na Twój adres e-mail.</p>
      </div>
    );

    if (booking?.status === 'rejected') return (
      <div className="gp-state">
        <div className="gp-state__icon">❌</div>
        <h2>Rezerwacja została anulowana</h2>
        <p>Termin został odwołany przez wróżkę. Nie możesz już opłacić tej rezerwacji. Wybierz inny termin.</p>
      </div>
    );

    if (booking?.status !== 'accepted') return (
      <div className="gp-state">
        <div className="gp-state__icon">ℹ️</div>
        <h2>Link nieaktualny</h2>
        <p>Rezerwacja może być oczekująca na akceptację.</p>
      </div>
    );

    return (
      <div className="gp-layout">
        {/* Lewa kolumna – szczegóły */}
        <div className="gp-details">
          <div className="gp-details__icon">✨</div>
          <h1 className="gp-details__title">Opłać spotkanie</h1>
          <p className="gp-details__welcome">Cześć <strong>{booking?.guestName}</strong>!</p>

          <div className="gp-details__rows">
            <div className="gp-detail-row">
              <span>Usługa</span>
              <strong>{booking?.advertisementTitle}</strong>
            </div>
            <div className="gp-detail-row">
              <span>Wróżka</span>
              <strong>{booking?.wizardName}</strong>
            </div>
            <div className="gp-detail-row">
              <span>Termin</span>
              <strong>
                {booking && new Date(booking.scheduledAt).toLocaleString('pl-PL', {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </strong>
            </div>
            <div className="gp-detail-row">
              <span>Czas trwania</span>
              <strong>{booking?.durationMinutes} minut</strong>
            </div>
            <div className="gp-detail-row gp-detail-row--price">
              <span>Do zapłaty</span>
              <strong className="gp-price">
                {booking && (booking.priceGrosze / 100).toFixed(2)} zł
              </strong>
            </div>
          </div>
        </div>

        {/* Prawa kolumna – formularz */}
        <div className="gp-form-col">
          <h2 className="gp-form-col__title">Dane płatności</h2>
          {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, locale: 'pl', appearance }}>
              <GuestCheckoutForm bookingId={bookingId} onSuccess={() => setPaid(true)} />
            </Elements>
          ) : (
            <div className="gp-state">
              <div className="gp-spinner" />
              <p>Inicjowanie płatności...</p>
            </div>
          )}
          <p className="gp-secure">🔒 Płatność obsługiwana przez Stripe · karta, BLIK, Przelewy24</p>
        </div>
      </div>
    );
  };

  return (
    <div className="gp-page">
      <Header />
      <main className="gp-main">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
}

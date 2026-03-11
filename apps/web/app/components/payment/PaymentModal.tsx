'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import './PaymentModal.css';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

async function apiCreatePaymentIntent(
  token: string,
  appointmentId: number,
): Promise<{ clientSecret: string }> {
  const res = await fetch(`${API_URL}/api/stripe/payment-intent`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appointmentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Wewnętrzny formularz płatności ────────────────────────────────────────
interface CheckoutFormProps {
  /** Używany wyłącznie w przepływie spotkań – przy featured przekazujemy 0. */
  appointmentId: number;
  onSuccess: (appointmentId: number) => void;
  onCancel: () => void;
}

function CheckoutForm({ appointmentId, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  /** Wywołaj backend, żeby zaktualizował status spotkania i potwierdź sukces. */
  const verifyAndSucceed = async (paymentIntentId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/stripe/verify-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      });
      const data = await res.json();
      // zwróć potwierdzony appointmentId lub fallback na prop
      return (data.appointmentId as number | undefined) ?? appointmentId;
    } catch {
      // nawet jeśli weryfikacja się nie uda, przekaż znany appointmentId
      return appointmentId;
    }
  };

  /** Polling dla BLIK/P24 — czekamy aż backend potwierdzi sukces. */
  const pollUntilPaid = async (paymentIntentId: string) => {
    setIsPolling(true);
    const maxAttempts = 60; // max 2 minuty (60 × 2s)
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`${API_URL}/api/stripe/verify-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId }),
        });
        const data = await res.json();
        if (data.success) {
          setIsPolling(false);
          onSuccess((data.appointmentId as number | undefined) ?? appointmentId);
          return;
        }
      } catch {
        // ignoruj błędy sieci podczas pollingu, próbuj dalej
      }
    }
    // timeout
    setIsPolling(false);
    setIsLoading(false);
    setErrorMsg('Płatność nie została potwierdzona w czasie. Sprawdź swój e-mail lub odśwież stronę.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setErrorMsg('');

    const returnUrl = `${window.location.origin}/platnosc/sukces?appointment_id=${appointmentId}`;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMsg(error.message || 'Wystąpił błąd podczas płatności');
      setIsLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      // Karta / BLIK synchroniczny — weryfikuj backend PRZED wywołaniem onSuccess,
      // żeby appointment.status był już 'paid' gdy fetchData() odpytuje API.
      const confirmedId = await verifyAndSucceed(paymentIntent.id);
      onSuccess(confirmedId);
    } else if (paymentIntent?.status === 'processing') {
      // BLIK / P24 asynchroniczny — czekamy na potwierdzenie w aplikacji bankowej
      pollUntilPaid(paymentIntent.id);
    } else {
      setErrorMsg('Nieoczekiwany status płatności. Spróbuj ponownie.');
      setIsLoading(false);
    }
  };

  if (isPolling) {
    return (
      <div className="pm-processing">
        <div className="pm-processing__spinner" />
        <p className="pm-processing__title">Oczekiwanie na potwierdzenie</p>
        <p className="pm-processing__desc">
          Zatwierdź płatność w swojej aplikacji bankowej.
          Ta strona zaktualizuje się automatycznie.
        </p>
      </div>
    );
  }

  return (
    <form className="pm-form" onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {errorMsg && <p className="pm-error">{errorMsg}</p>}
      <div className="pm-actions">
        <button
          type="button"
          className="pm-btn pm-btn--cancel"
          onClick={onCancel}
          disabled={isLoading}
        >
          Anuluj
        </button>
        <button
          type="submit"
          className="pm-btn pm-btn--pay"
          disabled={!stripe || isLoading}
        >
          {isLoading ? <span className="pm-spinner" /> : 'Zapłać'}
        </button>
      </div>
    </form>
  );
}

// ── Główny Modal ──────────────────────────────────────────────────────────
interface PaymentModalProps {
  token: string;
  amountZl: string;
  title: string;
  onClose: () => void;
  onSuccess: (appointmentId: number) => void;
  /** Jeśli podany – przepływ spotkania (używa POST /stripe/payment-intent). */
  appointmentId?: number;
  /** Jeśli podany – dowolny dostawca clientSecret (nadpisuje appointmentId). */
  clientSecretLoader?: () => Promise<{ clientSecret: string }>;
}

export function PaymentModal({
  token,
  appointmentId,
  amountZl,
  title,
  onClose,
  onSuccess,
  clientSecretLoader,
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const loader = clientSecretLoader
      ? clientSecretLoader
      : () => apiCreatePaymentIntent(token, appointmentId!);

    loader()
      .then(({ clientSecret: cs }) => setClientSecret(cs))
      .catch((err) => setInitError(err.message || 'Nie udało się zainicjować płatności'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appearance: import('@stripe/stripe-js').Appearance = {
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
      '.Input': {
        border: '1px solid rgba(167,139,250,0.25)',
        boxShadow: 'none',
      },
      '.Input:focus': {
        border: '1px solid #a78bfa',
        boxShadow: '0 0 0 2px rgba(167,139,250,0.2)',
      },
      '.Tab': {
        border: '1px solid rgba(167,139,250,0.2)',
      },
      '.Tab--selected': {
        border: '1px solid #a78bfa',
        boxShadow: '0 0 0 2px rgba(167,139,250,0.15)',
      },
    },
  };

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Nagłówek */}
        <div className="pm-header">
          <div>
            <h2 className="pm-title">Płatność</h2>
            <p className="pm-subtitle">{title}</p>
          </div>
          <div className="pm-amount">{amountZl}</div>
          <button className="pm-close" onClick={onClose} aria-label="Zamknij">✕</button>
        </div>

        {/* Treść */}
        <div className="pm-body">
          {initError ? (
            <p className="pm-error">{initError}</p>
          ) : !clientSecret ? (
            <div className="pm-loading">
              <span className="pm-spinner pm-spinner--lg" />
              <span>Inicjowanie płatności…</span>
            </div>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, locale: 'pl', appearance }}
            >
              <CheckoutForm
                appointmentId={appointmentId ?? 0}
                onSuccess={onSuccess}
                onCancel={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from '@stripe/react-connect-js';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import './StripeOnboarding.css';

function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;
  return `${apiBase}/${path}`;
}

interface StripeOnboardingProps {
  token: string;
  onComplete: () => void;
  onExit?: () => void;
}

export function StripeOnboarding({ token, onComplete, onExit }: StripeOnboardingProps) {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [step, setStep] = useState<'intro' | 'form' | 'done'>('intro');

  const initStripe = useCallback(async () => {
    setInitError(null);
    try {
      const instance = loadConnectAndInitialize({
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
        locale: 'pl-PL',
        fetchClientSecret: async () => {
          const res = await fetch(apiUrl('stripe/connect/account-session'), {
            method: 'POST',
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Błąd inicjowania sesji Stripe');
          }
          const { clientSecret } = await res.json();
          return clientSecret;
        },
        appearance: {
          overlays: 'drawer',
          variables: {
            colorPrimary: '#7c3aed',
            colorBackground: '#1a1625',
            colorText: '#e2e0f0',
            colorDanger: '#f87171',
            fontFamily: 'inherit',
            borderRadius: '10px',
            spacingUnit: '10px',
          },
        },
      });
      setStripeConnectInstance(instance);
      setStep('form');
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Błąd inicjowania');
    }

    
  }, [token]);

  const handleExit = () => {
    if (onExit) onExit();
  };

  if (step === 'done') {
    return (
      <div className="so-page">
        <div className="so-card">
          <div className="so-done-icon">✅</div>
          <h2 className="so-done-title">Konto gotowe!</h2>
          <p className="so-done-desc">
            Twoje konto płatnicze zostało skonfigurowane. Możesz teraz wypłacać zarobki.
          </p>
          <button className="so-btn so-btn--primary" onClick={onComplete}>
            Przejdź do portfela →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'intro') {
    return (
      <div className="so-page">
        <div className="so-card so-card--wide">
          {/* Nagłówek */}
          <div className="so-header">
            <div className="so-header__icon">💳</div>
            <div>
              <h2 className="so-header__title">Konfiguracja konta wypłat</h2>
              <p className="so-header__sub">Krok 1 z 1 · Zajmuje ok. 3–5 minut</p>
            </div>
          </div>

          {/* Informacje */}
          <div className="so-info-grid">
            <div className="so-info-item">
              <span className="so-info-item__icon">🔒</span>
              <div>
                <div className="so-info-item__title">Bezpieczne</div>
                <div className="so-info-item__desc">Dane przetwarzane przez Stripe — lidera płatności online</div>
              </div>
            </div>
            <div className="so-info-item">
              <span className="so-info-item__icon">🏦</span>
              <div>
                <div className="so-info-item__title">Wypłaty na konto bankowe</div>
                <div className="so-info-item__desc">Środki trafiają na Twój rachunek w 1–7 dni roboczych</div>
              </div>
            </div>
            <div className="so-info-item">
              <span className="so-info-item__icon">📋</span>
              <div>
                <div className="so-info-item__title">Co będzie potrzebne</div>
                <div className="so-info-item__desc">Numer konta bankowego, dane osobowe, numer telefonu</div>
              </div>
            </div>
            <div className="so-info-item">
              <span className="so-info-item__icon">💰</span>
              <div>
                <div className="so-info-item__title">Prowizja platformy</div>
                <div className="so-info-item__desc">20% od każdego spotkania — 80% trafia do Ciebie</div>
              </div>
            </div>
          </div>

          {initError && <p className="so-error">{initError}</p>}

          <div className="so-actions">
            {onExit && (
              <button className="so-btn so-btn--ghost" onClick={handleExit}>
                Później
              </button>
            )}
            <button className="so-btn so-btn--primary" onClick={initStripe}>
              Rozpocznij konfigurację →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // step === 'form'
  return (
    <div className="so-page">
      <div className="so-card so-card--wide so-card--form">
        <div className="so-form-header">
          <div>
            <h2 className="so-form-header__title">Konfiguracja konta wypłat</h2>
            <p className="so-form-header__sub">Wypełnij formularz weryfikacyjny Stripe</p>
          </div>
          {onExit && (
            <button className="so-form-close" onClick={handleExit} aria-label="Zamknij">✕</button>
          )}
        </div>

        <div className="so-form-notice">
          <span className="so-form-notice__icon">ℹ️</span>
          Formularz pochodzi od Stripe — Twoim danych nie widzimy i nie przechowujemy ich po naszej stronie.
        </div>

        {stripeConnectInstance && (
          <div className="so-stripe-embed">
            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
              <ConnectAccountOnboarding
                onExit={() => {
                  // Użytkownik wyszedł z formularza — odśwież status
                  setStep('done');
                }}
              />
            </ConnectComponentsProvider>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import './sukces.css';

function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;
  return `${apiBase}/${path}`;
}

async function verifyStripeSession(sessionId: string): Promise<void> {
  try {
    await fetch(apiUrl('stripe/verify-session'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // webhook mógł już zaktualizować status
  }
}

async function verifyPaymentIntent(paymentIntentId: string): Promise<void> {
  try {
    await fetch(apiUrl('stripe/verify-payment-intent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId }),
    });
  } catch {
    // webhook mógł już zaktualizować status
  }
}

function SukcesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Stary flow (Checkout Session)
  const sessionId = searchParams.get('session_id');
  // Nowy flow (Payment Element + redirect dla P24/BLIK)
  const paymentIntent = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  const [verified, setVerified] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const run = async () => {
      // Sprawdź czy płatność nie została anulowana
      if (redirectStatus && redirectStatus !== 'succeeded') {
        setFailed(true);
        setVerified(true);
        return;
      }

      if (paymentIntent) {
        await verifyPaymentIntent(paymentIntent);
      } else if (sessionId) {
        await verifyStripeSession(sessionId);
      }

      setVerified(true);
    };
    run();
  }, [sessionId, paymentIntent, redirectStatus]);

  useEffect(() => {
    if (!verified) return;
    const target = failed ? '/panel/moje-spotkania?payment=cancelled' : '/panel/moje-spotkania';
    const timer = setTimeout(() => {
      router.replace(target);
    }, failed ? 3000 : 2500);
    return () => clearTimeout(timer);
  }, [verified, failed, router]);

  if (failed) {
    return (
      <div className="sukces-container">
        <div className="sukces-card sukces-card--failed">
          <div className="sukces-icon">❌</div>
          <h1 className="sukces-title">Płatność nieudana</h1>
          <p className="sukces-desc">
            Płatność została anulowana lub nie powiodła się. Spróbuj ponownie.
          </p>
          <p className="sukces-redirect">Za chwilę zostaniesz przekierowany...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sukces-container">
      <div className="sukces-card">
        <div className="sukces-icon">✅</div>
        <h1 className="sukces-title">Płatność zakończona pomyślnie!</h1>
        <p className="sukces-desc">
          Twoje spotkanie zostało opłacone. Link do spotkania będzie dostępny
          5 minut przed jego rozpoczęciem.
        </p>
        <p className="sukces-redirect">
          Za chwilę zostaniesz przekierowany na listę spotkań...
        </p>
      </div>
    </div>
  );
}

export default function SukcesPage() {
  return (
    <Suspense fallback={<div className="sukces-container"><p>Ładowanie...</p></div>}>
      <SukcesContent />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthFormShell } from '../../components/auth/auth-form-shell';
import { apiVerifyEmail } from '../../lib/api';
import './weryfikacja-emaila.css';

type Status = 'loading' | 'success' | 'error';

function WeryfikacjaContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Brak tokenu weryfikacyjnego w linku.');
      return;
    }

    apiVerifyEmail(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message || 'Konto zostało aktywowane.');
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(
          err instanceof Error
            ? err.message
            : 'Nie udało się zweryfikować adresu e-mail.',
        );
      });
  }, [token]);

  return (
    <AuthFormShell
      centered
      title={
        status === 'success'
          ? 'Konto aktywowane!'
          : status === 'error'
            ? 'Weryfikacja nieudana'
            : 'Weryfikacja konta…'
      }
      subtitle={
        status === 'loading'
          ? 'Trwa potwierdzanie adresu e-mail…'
          : undefined
      }
    >
      <div className="verify-email">
        {status === 'loading' && (
          <div className="verify-email__spinner" aria-label="Ładowanie" />
        )}

        {status === 'success' && (
          <>
            <div className="verify-email__icon verify-email__icon--success" aria-hidden>
              ✓
            </div>
            <p className="verify-email__text">{message}</p>
            <Link href="/login" className="auth-form__submit verify-email__btn">
              Zaloguj się
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="verify-email__icon verify-email__icon--error" aria-hidden>
              ✕
            </div>
            <p className="verify-email__text verify-email__text--error">{message}</p>
            <Link href="/rejestracja" className="auth-form__submit verify-email__btn verify-email__btn--outline">
              Zarejestruj się ponownie
            </Link>
          </>
        )}
      </div>
    </AuthFormShell>
  );
}

export default function WeryfikacjaEmailaPage() {
  return (
    <Suspense>
      <WeryfikacjaContent />
    </Suspense>
  );
}

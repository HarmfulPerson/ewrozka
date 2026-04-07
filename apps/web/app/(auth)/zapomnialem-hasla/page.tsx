'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthFormShell } from '../../components/auth/auth-form-shell';
import { apiForgotPassword } from '../../lib/api';
import '../weryfikacja-emaila/weryfikacja-emaila.css';

type Status = 'idle' | 'loading' | 'sent';

export default function ZapomnialemHaslaPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.querySelector('#email') as HTMLInputElement)?.value?.trim();
    if (!email) {
      setError('Podaj adres e-mail.');
      return;
    }
    setStatus('loading');
    try {
      await apiForgotPassword(email);
      setSentEmail(email);
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(
        err instanceof Error ? err.message : 'Wystąpił błąd. Spróbuj ponownie.',
      );
    }
  };

  if (status === 'sent') {
    return (
      <AuthFormShell
        centered
        title="Sprawdź e-mail"
        subtitle="Wysłaliśmy link do resetu hasła"
      >
        <div className="verify-email">
          <div className="verify-email__icon verify-email__icon--success" aria-hidden>
            &#9993;
          </div>
          <p className="verify-email__text">
            Jeśli konto z adresem <strong>{sentEmail}</strong> istnieje,
            wysłaliśmy na nie link do zmiany hasła. Sprawdź skrzynkę (również folder spam).
          </p>
          <Link href="/login" className="auth-form__submit verify-email__btn">
            Wróć do logowania
          </Link>
        </div>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Przypomnij hasło"
      subtitle="Podaj e-mail, a wyślemy Ci link do resetu"
      backHref="/login"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-form__field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="twoj@email.pl"
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          className="auth-form__submit"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Wysyłanie…' : 'Wyślij link resetujący'}
        </button>
        <p className="auth-form__footer">
          Pamiętasz hasło?{' '}
          <Link href="/login" className="auth-form__link">
            Zaloguj się
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
}

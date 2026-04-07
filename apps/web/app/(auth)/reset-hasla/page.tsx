'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthFormShell } from '../../components/auth/auth-form-shell';
import { apiResetPassword } from '../../lib/api';
import './reset-hasla.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

function ResetHaslaContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'idle' : 'error');
  const [error, setError] = useState<string | null>(
    token ? null : 'Brak tokenu resetowania w linku.',
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const password = (form.querySelector('#password') as HTMLInputElement)?.value;
    const confirm = (form.querySelector('#confirm') as HTMLInputElement)?.value;

    if (!password || password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }
    if (password !== confirm) {
      setError('Hasła nie są identyczne.');
      return;
    }

    setStatus('loading');
    try {
      await apiResetPassword(token, password);
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się zmienić hasła. Spróbuj ponownie.',
      );
    }
  };

  if (status === 'success') {
    return (
      <AuthFormShell centered title="Hasło zmienione!" subtitle="Możesz się teraz zalogować">
        <div className="verify-email">
          <div className="verify-email__icon verify-email__icon--success" aria-hidden>
            &#10003;
          </div>
          <p className="verify-email__text">
            Twoje hasło zostało pomyślnie zmienione.
          </p>
          <Link href="/login" className="auth-form__submit verify-email__btn">
            Zaloguj się
          </Link>
        </div>
      </AuthFormShell>
    );
  }

  if (status === 'error' && !token) {
    return (
      <AuthFormShell centered title="Nieprawidłowy link" subtitle="Brak tokenu resetowania">
        <div className="verify-email">
          <div className="verify-email__icon verify-email__icon--error" aria-hidden>
            &#10005;
          </div>
          <p className="verify-email__text verify-email__text--error">{error}</p>
          <Link
            href="/zapomnialem-hasla"
            className="auth-form__submit verify-email__btn verify-email__btn--outline"
          >
            Poproś o nowy link
          </Link>
        </div>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Ustaw nowe hasło"
      subtitle="Wpisz nowe hasło do swojego konta"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-form__field">
          <label htmlFor="password">Nowe hasło</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <div className="auth-form__field">
          <label htmlFor="confirm">Powtórz hasło</label>
          <input
            id="confirm"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <button
          type="submit"
          className="auth-form__submit"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Zapisywanie…' : 'Zmień hasło'}
        </button>
      </form>
    </AuthFormShell>
  );
}

export default function ResetHaslaPage() {
  return (
    <Suspense>
      <ResetHaslaContent />
    </Suspense>
  );
}

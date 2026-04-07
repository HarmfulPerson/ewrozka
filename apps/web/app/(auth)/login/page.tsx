'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthFormShell } from '../../components/auth/auth-form-shell';
import { apiLogin, getApiBaseUrl } from '../../lib/api';
import { setStoredUser, userFromApi } from '../../lib/auth-mock';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.183l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  google_auth_failed: 'Logowanie przez Google nie powiodło się. Spróbuj ponownie.',
  session_expired: 'Twoja sesja wygasła. Zaloguj się ponownie, aby kontynuować.',
  WIZARD_PENDING:
    'Twoje konto oczekuje na zatwierdzenie przez administratora. Poinformujemy Cię, gdy zostanie aktywowane.',
  WIZARD_REJECTED:
    'Niestety Twój wniosek o konto specjalisty został odrzucony. Skontaktuj się z nami, aby uzyskać więcej informacji.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const errorParam = searchParams.get('error');
  const [error, setError] = useState<string | null>(
    errorParam ? ERROR_MESSAGES[errorParam] ?? errorParam : null
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.querySelector('#email') as HTMLInputElement)?.value?.trim();
    const password = (form.querySelector('#password') as HTMLInputElement)?.value;
    if (!email || !password) {
      setError('Wypełnij e-mail i hasło.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiLogin({ email, password });
      setStoredUser(userFromApi(res.user));
      const redirectTo = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/panel';
      router.push(redirectTo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logowanie nie powiodło się.';
      if (msg.includes('WIZARD_PENDING')) {
        setError('Twoje konto oczekuje na zatwierdzenie przez administratora. Poinformujemy Cię, gdy zostanie aktywowane.');
      } else if (msg.includes('WIZARD_REJECTED')) {
        setError('Niestety Twój wniosek o konto specjalisty został odrzucony. Skontaktuj się z nami, aby uzyskać więcej informacji.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
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
      <div className="auth-form__field">
        <label htmlFor="password">Hasło</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>
      <div className="auth-form__forgot">
        <Link href="/zapomnialem-hasla" className="auth-form__link">
          Nie pamiętasz hasła?
        </Link>
      </div>
      <button
        type="submit"
        className="auth-form__submit"
        disabled={loading}
      >
        {loading ? 'Logowanie…' : 'Zaloguj się'}
      </button>

      <div className="auth-form__divider">
        <span>lub</span>
      </div>

      <button
        type="button"
        className="auth-form__google"
        onClick={() => {
          window.location.href = `${getApiBaseUrl()}/auth/google`;
        }}
      >
        <GoogleIcon />
        Kontynuuj z Google
      </button>

      <p className="auth-form__footer">
        Nie masz konta?{' '}
        <Link href="/rejestracja" className="auth-form__link">
          Zarejestruj się
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthFormShell
      title="Zaloguj się"
      subtitle="Wejdź na swoje konto eWróżka"
    >
      <Suspense fallback={<p style={{ textAlign: 'center' }}>Ładowanie…</p>}>
        <LoginForm />
      </Suspense>
    </AuthFormShell>
  );
}

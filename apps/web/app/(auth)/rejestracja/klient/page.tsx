'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthFormShell } from '../../../components/auth/auth-form-shell';
import { apiRegister } from '../../../lib/api';

export default function RejestracjaKlientPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.querySelector('#email') as HTMLInputElement)?.value?.trim();
    const password = (form.querySelector('#password') as HTMLInputElement)?.value;
    const firstName = (form.querySelector('#firstName') as HTMLInputElement)?.value?.trim();
    const lastName = (form.querySelector('#lastName') as HTMLInputElement)?.value?.trim();
    const gender = (form.querySelector('#gender') as HTMLSelectElement)?.value as '' | 'female' | 'male';
    if (!email || !password) {
      setError('Wypełnij e-mail i hasło.');
      return;
    }
    const username =
      firstName && lastName
        ? `${firstName}_${lastName}`.toLowerCase().replace(/\s+/g, '_')
        : email.replace(/@.*$/, '');
    setLoading(true);
    try {
      await apiRegister({
        username,
        email,
        password,
        roleNames: ['client'],
        ...(gender && { gender }),
      });
      router.push(`/sprawdz-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejestracja nie powiodła się.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormShell
      title="Rejestracja klienta"
      subtitle="Wypełnij dane, aby założyć konto i umawiać się na konsultacje"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-form__row">
          <div className="auth-form__field">
            <label htmlFor="firstName">Imię</label>
            <input id="firstName" type="text" placeholder="Jan" />
          </div>
          <div className="auth-form__field">
            <label htmlFor="lastName">Nazwisko</label>
            <input id="lastName" type="text" placeholder="Nowak" />
          </div>
        </div>
        <div className="auth-form__field">
          <label htmlFor="gender">Płeć</label>
          <select id="gender" className="auth-form__select">
            <option value="">— Wybierz —</option>
            <option value="female">Kobieta</option>
            <option value="male">Mężczyzna</option>
          </select>
        </div>
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
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          className="auth-form__submit"
          disabled={loading}
        >
          {loading ? 'Rejestracja…' : 'Załóż konto'}
        </button>
        <p className="auth-form__footer">
          <Link href="/rejestracja" className="auth-form__link">
            ← Wybierz inny typ konta
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
}

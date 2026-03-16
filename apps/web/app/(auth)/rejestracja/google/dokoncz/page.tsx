'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthFormShell } from '../../../../components/auth/auth-form-shell';
import {
  apiCompleteGoogleRegistration,
  apiGetGoogleTempProfile,
  apiGetTopics,
  type TopicDto,
} from '../../../../lib/api';
import { setStoredUser, userFromApi } from '../../../../lib/auth-mock';
import { TopicIcon } from '../../../../components/topic-icon/topic-icon';
import '../../wrozka/wrozka-registration.css';

type Step = 'role' | 'form' | 'success';
type Role = 'client' | 'wizard';

function DokonczGoogleRejestracjaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const temp = searchParams.get('temp');

  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<{
    email: string;
    displayName: string;
    picture?: string;
  } | null>(null);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!temp) {
      setError('Brak tokena. Użyj ponownie logowania przez Google.');
      return;
    }
    apiGetGoogleTempProfile(temp)
      .then(setProfile)
      .catch(() => setError('Token wygasł. Zaloguj się ponownie przez Google.'));
    apiGetTopics().then(setTopics).catch(() => {});
  }, [temp]);

  const selectRole = (r: Role) => {
    setRole(r);
    setStep('form');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!temp || !role) return;
    setError(null);

    const form = e.currentTarget;
    const username = (form.querySelector('#username') as HTMLInputElement)?.value?.trim();
    const bio = (form.querySelector('#bio') as HTMLTextAreaElement)?.value?.trim();
    const gender = (form.querySelector('input[name="gender"]:checked') as HTMLInputElement)?.value as '' | 'female' | 'male';

    if (role === 'wizard') {
      if (!bio || bio.length < 20) {
        setError('Opis musi mieć co najmniej 20 znaków.');
        return;
      }
      const phoneDigits = phone.replace(/\D/g, '').slice(0, 9);
      if (phoneDigits.length !== 9) {
        setError('Numer telefonu musi składać się z 9 cyfr.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await apiCompleteGoogleRegistration({
        tempToken: temp,
        role,
        username: username || undefined,
        bio: role === 'wizard' ? bio : undefined,
        phone: role === 'wizard' ? phone.replace(/\D/g, '').slice(0, 9) : undefined,
        topicIds: role === 'wizard' && selectedTopics.length > 0 ? selectedTopics : undefined,
        ...(gender && { gender }),
      });

      if ('user' in res) {
        setStoredUser(userFromApi(res.user));
        router.push('/panel');
      } else {
        setStep('success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejestracja nie powiodła się.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (id: number) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  if (error && !profile && !temp) {
    return (
      <AuthFormShell title="Błąd" subtitle="">
        <p className="auth-form__error">{error}</p>
        <Link href="/login" className="auth-form__link">
          ← Wróć do logowania
        </Link>
      </AuthFormShell>
    );
  }

  if (step === 'success') {
    return (
      <AuthFormShell title="" subtitle="" centered>
        <div className="wrozka-reg__success">
          <div className="wrozka-reg__success-icon">🔮</div>
          <h2 className="wrozka-reg__success-title">Zgłoszenie złożone!</h2>
          <p className="wrozka-reg__success-text">
            Twój wniosek o konto specjalisty został przyjęty i oczekuje na weryfikację.
          </p>
          <Link href="/login" className="wrozka-reg__success-btn">
            Przejdź do logowania
          </Link>
        </div>
      </AuthFormShell>
    );
  }

  if (!profile) {
    return (
      <AuthFormShell title="Dokończ rejestrację" subtitle="">
        <p style={{ textAlign: 'center' }}>Ładowanie…</p>
      </AuthFormShell>
    );
  }

  if (step === 'role') {
    return (
      <AuthFormShell
        title="Dokończ rejestrację"
        subtitle={`Zalogowano jako ${profile.email}. Wybierz typ konta:`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          {profile.picture && (
            <img
              src={profile.picture}
              alt=""
              width={48}
              height={48}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          <div>
            <p style={{ fontWeight: 600, margin: 0 }}>{profile.displayName}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              {profile.email}
            </p>
          </div>
        </div>
        <div className="auth-choice">
          <button
            type="button"
            className="auth-choice__card"
            onClick={() => selectRole('client')}
            style={{ border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <span className="auth-choice__icon">☆</span>
            <h3 className="auth-choice__title">Jestem klientem</h3>
            <p className="auth-choice__desc">
              Szukam konsultacji ze specjalistą. Szybka rejestracja, minimum danych.
            </p>
            <span className="auth-choice__cta">Wybierz <span className="auth-choice__arrow">→</span></span>
          </button>
          <button
            type="button"
            className="auth-choice__card"
            onClick={() => selectRole('wizard')}
            style={{ border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <span className="auth-choice__icon">✦</span>
            <h3 className="auth-choice__title">Oferuję konsultacje</h3>
            <p className="auth-choice__desc">
              Oferuję konsultacje. Uzupełnij dane – wniosek zostanie zweryfikowany.
            </p>
            <span className="auth-choice__cta">Wybierz <span className="auth-choice__arrow">→</span></span>
          </button>
        </div>
        <p className="auth-form__footer" style={{ marginTop: '1rem' }}>
          <Link href="/login" className="auth-form__link">
            ← Anuluj, wróć do logowania
          </Link>
        </p>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title={role === 'client' ? 'Rejestracja klienta' : 'Rejestracja specjalisty'}
      subtitle={
        role === 'client'
          ? 'Uzupełnij dane (opcjonalnie)'
          : 'Wypełnij pola – wniosek zostanie zweryfikowany przez administratora'
      }
    >
      <form className="auth-form wrozka-reg__form" onSubmit={handleSubmit}>
        {error && (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-form__field">
          <span className="auth-form__label">Płeć</span>
          <div className="auth-form__radio-group" role="radiogroup" aria-label="Płeć">
            <label className="auth-form__radio-label">
              <input type="radio" name="gender" value="female" className="auth-form__radio" />
              <span className="auth-form__radio-text">Kobieta</span>
            </label>
            <label className="auth-form__radio-label">
              <input type="radio" name="gender" value="male" className="auth-form__radio" />
              <span className="auth-form__radio-text">Mężczyzna</span>
            </label>
          </div>
        </div>
        <div className="auth-form__field">
          <label htmlFor="username">Pseudonim</label>
          <input
            id="username"
            type="text"
            placeholder={profile.displayName || profile.email.split('@')[0]}
            minLength={3}
            maxLength={60}
          />
          <small className="wrozka-reg__field-hint">
            {role === 'client'
              ? 'Opcjonalne – widoczne na profilu'
              : 'Nazwa widoczna publicznie'}
          </small>
        </div>

        {role === 'wizard' && (
          <>
            <div className="auth-form__field">
              <label htmlFor="phone">
                Numer telefonu <span className="wrozka-reg__required">*</span>
              </label>
              <div className="wrozka-reg__phone-wrap">
                <span className="wrozka-reg__phone-prefix">+48</span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="123456789"
                  maxLength={9}
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))
                  }
                  required
                  className="wrozka-reg__phone-input"
                />
              </div>
            </div>
            <div className="auth-form__field">
              <label htmlFor="bio">
                Opis / Kim jesteś? <span className="wrozka-reg__required">*</span>
              </label>
              <textarea
                id="bio"
                className="wrozka-reg__bio"
                placeholder="Opisz siebie, swoje umiejętności (min. 20 znaków)"
                rows={4}
                required
              />
            </div>
            {topics.length > 0 && (
              <div className="auth-form__field">
                <label>Specjalizacje</label>
                <div className="wrozka-reg__topics">
                  {topics.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`wrozka-reg__topic${selectedTopics.includes(t.id) ? ' wrozka-reg__topic--active' : ''}`}
                      onClick={() => toggleTopic(t.id)}
                    >
                      <TopicIcon name={t.name} size={15} />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? 'Rejestracja…' : role === 'client' ? 'Załóż konto' : 'Wyślij zgłoszenie'}
        </button>
        <p className="auth-form__footer">
          <button
            type="button"
            className="auth-form__link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => setStep('role')}
          >
            ← Wybierz inny typ konta
          </button>
        </p>
      </form>
    </AuthFormShell>
  );
}

export default function DokonczGoogleRejestracjaPage() {
  return (
    <Suspense
      fallback={
        <AuthFormShell title="Dokończ rejestrację" subtitle="">
          <p style={{ textAlign: 'center' }}>Ładowanie…</p>
        </AuthFormShell>
      }
    >
      <DokonczGoogleRejestracjaForm />
    </Suspense>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AuthFormShell } from '../../../components/auth/auth-form-shell';
import {
  apiGetTopics,
  apiSubmitWizardApplication,
  apiUploadWizardApplicationPhoto,
  type TopicDto,
} from '../../../lib/api';
import './wrozka-registration.css';

type Step = 'form' | 'success';

export default function RejestracjaWrozkaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phone, setPhone] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGetTopics().then(setTopics).catch(() => {});
  }, []);

  const handlePhotoChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Proszę wybrać plik graficzny (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Zdjęcie nie może przekraczać 5 MB.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const toggleTopic = (id: number) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const username  = (form.querySelector('#username') as HTMLInputElement)?.value?.trim();
    const email     = (form.querySelector('#email')    as HTMLInputElement)?.value?.trim();
    const password  = (form.querySelector('#password') as HTMLInputElement)?.value;
    const bio       = (form.querySelector('#bio')      as HTMLTextAreaElement)?.value?.trim();

    if (!username || username.length < 3) {
      setError('Pseudonim musi mieć co najmniej 3 znaki.');
      return;
    }
    if (!/^[a-zA-Z0-9_\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]+$/.test(username)) {
      setError('Pseudonim może zawierać litery, cyfry, spacje, myślniki i podkreślniki.');
      return;
    }
    if (!email || !password) {
      setError('Podaj adres e-mail i hasło.');
      return;
    }
    if (!bio || bio.length < 20) {
      setError('Opis musi mieć co najmniej 20 znaków.');
      return;
    }
    if (!photoFile) {
      setError('Dodaj zdjęcie profilowe.');
      return;
    }
    if (!/^\d{9}$/.test(phone)) {
      setError('Numer telefonu musi składać się z dokładnie 9 cyfr (bez +48).');
      return;
    }

    setLoading(true);
    try {
      // 1. Utwórz wniosek (bez zdjęcia) – otrzymujemy UUID
      const { id } = await apiSubmitWizardApplication({
        username,
        email,
        password,
        bio,
        phone,
        topicIds: selectedTopics,
      });

      // 2. Prześlij zdjęcie do wniosku
      if (photoFile) {
        await apiUploadWizardApplicationPhoto(id, photoFile);
      }

      setStep('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Rejestracja nie powiodła się.';
      if (
        msg.includes('already') ||
        msg.includes('E001') ||
        msg.includes('exists') ||
        msg.includes('istnieje')
      ) {
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <AuthFormShell title="" subtitle="" centered>
        <div className="wrozka-reg__success">
          <div className="wrozka-reg__success-icon">🔮</div>
          <h2 className="wrozka-reg__success-title">Zgłoszenie złożone!</h2>
          <p className="wrozka-reg__success-text">
            Twój wniosek o konto wróżki został przyjęty i oczekuje na weryfikację przez
            administratora.
          </p>
          <p className="wrozka-reg__success-text wrozka-reg__success-text--muted">
            Gdy Twoje konto zostanie zaakceptowane, będziesz mogła się zalogować.
            Czas rozpatrzenia wniosku: do&nbsp;48&nbsp;godzin.
          </p>
          <Link href="/login" className="wrozka-reg__success-btn">
            Przejdź do logowania
          </Link>
        </div>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Rejestracja wróżki"
      subtitle="Wypełnij wszystkie pola – Twój profil zostanie zweryfikowany przez administratora"
    >
      <form className="auth-form wrozka-reg__form" onSubmit={handleSubmit}>
        {error && (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        )}

        {/* Zdjęcie profilowe */}
        <div className="wrozka-reg__photo-section">
          <p className="wrozka-reg__section-label">Zdjęcie profilowe <span className="wrozka-reg__required">*</span></p>
          <div
            className={`wrozka-reg__photo-drop${dragOver ? ' wrozka-reg__photo-drop--over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handlePhotoChange(e.dataTransfer.files[0] ?? null);
            }}
          >
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Podgląd zdjęcia"
                fill
                className="wrozka-reg__photo-preview"
              />
            ) : (
              <div className="wrozka-reg__photo-placeholder">
                <span className="wrozka-reg__photo-icon">📷</span>
                <span className="wrozka-reg__photo-hint">
                  Kliknij lub przeciągnij zdjęcie<br />
                  <small>JPG, PNG, WebP · maks. 5 MB</small>
                </span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="wrozka-reg__file-input"
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />
          {photoFile && (
            <button
              type="button"
              className="wrozka-reg__photo-remove"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
            >
              Usuń zdjęcie
            </button>
          )}
        </div>

        {/* Pseudonim */}
        <div className="auth-form__field">
          <label htmlFor="username">
            Pseudonim <span className="wrozka-reg__required">*</span>
          </label>
          <input
            id="username"
            type="text"
            placeholder="np. Wróżka Luna"
            minLength={3}
            maxLength={60}
            required
          />
          <small className="wrozka-reg__field-hint">
            Nazwa widoczna publicznie na Twoim profilu
          </small>
        </div>

        <div className="auth-form__field">
          <label htmlFor="email">E-mail <span className="wrozka-reg__required">*</span></label>
          <input id="email" type="email" placeholder="twoj@email.pl" autoComplete="email" required />
        </div>

        <div className="auth-form__field">
          <label htmlFor="password">Hasło <span className="wrozka-reg__required">*</span></label>
          <input id="password" type="password" placeholder="Minimum 6 znaków" autoComplete="new-password" required />
        </div>

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
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              required
              className="wrozka-reg__phone-input"
            />
          </div>
          <small className="wrozka-reg__field-hint">
            Numer widoczny tylko dla administratora
          </small>
        </div>

        {/* Bio */}
        <div className="auth-form__field">
          <label htmlFor="bio">
            Opis / Kim jesteś? <span className="wrozka-reg__required">*</span>
          </label>
          <textarea
            id="bio"
            className="wrozka-reg__bio"
            placeholder="Opisz siebie, swoje umiejętności i doświadczenie… (min. 20 znaków)"
            rows={4}
            required
          />
        </div>

        {/* Specjalizacje */}
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
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? 'Wysyłanie zgłoszenia…' : 'Wyślij zgłoszenie'}
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

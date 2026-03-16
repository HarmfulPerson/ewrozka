import Link from 'next/link';
import { AuthFormShell } from '../../components/auth/auth-form-shell';

export default function RejestracjaPage() {
  return (
    <AuthFormShell
      title="Dołącz do eWróżka"
      subtitle="Wybierz typ konta i załóż je w kilku krokach"
      backHref="/"
    >
      <div className="auth-choice">
        <Link href="/rejestracja/wrozka" className="auth-choice__card">
          <span className="auth-choice__icon" aria-hidden>
            ✦
          </span>
          <h3 className="auth-choice__title">Oferuję konsultacje</h3>
          <p className="auth-choice__desc">
            Oferuję konsultacje, tarot lub horoskopy. Chcę przyjmować klientów
            przez portal.
          </p>
          <span className="auth-choice__cta">Załóż konto specjalisty <span className="auth-choice__arrow">→</span></span>
        </Link>
        <Link href="/rejestracja/klient" className="auth-choice__card">
          <span className="auth-choice__icon" aria-hidden>
            ☆
          </span>
          <h3 className="auth-choice__title">Jestem klientem</h3>
          <p className="auth-choice__desc">
            Szukam konsultacji ze specjalistą, tarotu lub horoskopu. Chcę znaleźć
            sprawdzonych specjalistów.
          </p>
          <span className="auth-choice__cta">Załóż konto klienta <span className="auth-choice__arrow">→</span></span>
        </Link>
      </div>
      <p className="auth-form__footer auth-form__footer--center">
        Masz już konto?{' '}
        <Link href="/login" className="auth-form__link">
          Zaloguj się
        </Link>
      </p>
    </AuthFormShell>
  );
}

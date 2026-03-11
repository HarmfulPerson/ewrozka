'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AuthFormShell } from '../../components/auth/auth-form-shell';
import './sprawdz-email.css';

function SprawdzEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  return (
    <AuthFormShell
      centered
      title="Sprawdź skrzynkę"
      subtitle="Wysłaliśmy Ci wiadomość z linkiem aktywacyjnym"
    >
      <div className="check-email">
        <div className="check-email__icon" aria-hidden>
          ✉
        </div>
        <p className="check-email__text">
          Na adres{' '}
          {email ? (
            <strong className="check-email__address">{email}</strong>
          ) : (
            'podany adres e-mail'
          )}{' '}
          wysłaliśmy wiadomość z linkiem aktywacyjnym. Kliknij go, aby potwierdzić konto i móc się zalogować.
        </p>
        <p className="check-email__hint">
          Nie widzisz e-maila? Sprawdź folder <strong>Spam</strong> lub{' '}
          <strong>Oferty</strong>. Może minąć kilka minut.
        </p>
        <Link href="/login" className="auth-form__submit check-email__btn">
          Przejdź do logowania
        </Link>
      </div>
    </AuthFormShell>
  );
}

export default function SprawdzEmailPage() {
  return (
    <Suspense>
      <SprawdzEmailContent />
    </Suspense>
  );
}

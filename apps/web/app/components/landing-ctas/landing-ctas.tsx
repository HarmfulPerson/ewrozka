'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredUser } from '../../lib/auth-mock';

export function LandingCtas() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getStoredUser());
  }, []);

  if (loggedIn) {
    return (
      <div className="landing__ctas">
        <Link href="/panel" className="landing__cta landing__cta--primary">
          Przejdź do panelu
        </Link>
        <Link href="/ogloszenia" className="landing__cta landing__cta--secondary">
          Przeglądaj wróżki
        </Link>
      </div>
    );
  }

  return (
    <div className="landing__ctas">
      <Link href="/rejestracja" className="landing__cta landing__cta--primary">
        Załóż konto
      </Link>
      <Link href="/login" className="landing__cta landing__cta--secondary">
        Zaloguj się
      </Link>
    </div>
  );
}

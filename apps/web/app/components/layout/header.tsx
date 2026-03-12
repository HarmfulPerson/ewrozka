'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearStoredUser, getStoredUser } from '../../lib/auth-mock';
import { useRouter } from 'next/navigation';
import './header.css';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const router = useRouter();

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const handleLogout = () => {
    clearStoredUser();
    router.push('/');
  };

  return (
    <header className="header">
      <div className="header__inner">
        <Link href="/" className="header__logo" aria-label="eWróżka – strona główna">
          <Image src="/logo.png" alt="eWróżka" width={130} height={40} priority />
        </Link>

        <button
          className="header__burger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="header__burger-bar" />
          <span className="header__burger-bar" />
          <span className="header__burger-bar" />
        </button>

        {menuOpen && (
          <div
            className="header__backdrop"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <nav
          className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`}
          aria-hidden={!menuOpen}
        >
          <Link href="/ogloszenia" className="header__link header__link--ghost">
            Wróżki
          </Link>
          <Link href="/kontakt" className="header__link header__link--ghost">
            Kontakt
          </Link>
          {user ? (
            <>
              <Link href="/panel" className="header__link header__link--ghost">
                Panel
              </Link>
              <button
                onClick={handleLogout}
                className="header__link header__link--ghost"
              >
                Wyloguj
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="header__link header__link--ghost">
                Logowanie
              </Link>
              <Link
                href="/rejestracja"
                className="header__link header__link--accent"
              >
                Rejestracja
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

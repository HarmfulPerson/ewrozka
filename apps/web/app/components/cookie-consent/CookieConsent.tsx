'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './cookie-consent.css';

const STORAGE_KEY = 'ewrozka_cookie_consent';

export interface CookiePreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

interface ConsentRecord {
  accepted: boolean;
  categories: CookiePreferences;
  timestamp: string;
}

function loadConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentRecord;
  } catch {
    return null;
  }
}

function saveConsent(categories: CookiePreferences) {
  const record: ConsentRecord = {
    accepted: true,
    categories,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: record }));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = loadConsent();
    if (!consent) {
      // Krótkie opóźnienie żeby nie migało przy hydratacji
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  // Umożliwia otwarcie z zewnątrz (np. z footera)
  useEffect(() => {
    const handler = () => {
      const consent = loadConsent();
      if (consent) {
        setAnalytics(consent.categories.analytics);
        setMarketing(consent.categories.marketing);
      }
      setExpanded(true);
      setVisible(true);
    };
    window.addEventListener('openCookieSettings', handler);
    return () => window.removeEventListener('openCookieSettings', handler);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    saveConsent({ necessary: true, analytics: true, marketing: true });
    setVisible(false);
  };

  const acceptNecessary = () => {
    saveConsent({ necessary: true, analytics: false, marketing: false });
    setVisible(false);
  };

  const saveCustom = () => {
    saveConsent({ necessary: true, analytics, marketing });
    setVisible(false);
  };

  return (
    <div className="cc-backdrop" role="dialog" aria-modal="true" aria-label="Ustawienia plików cookie">
      <div className={`cc-box${expanded ? ' cc-box--expanded' : ''}`}>

        {/* ── Nagłówek ── */}
        <div className="cc-header">
          <div className="cc-header__icon" aria-hidden="true">🍪</div>
          <div className="cc-header__text">
            <h2 className="cc-title">Twoja prywatność ma znaczenie</h2>
            <p className="cc-desc">
              Używamy plików cookie, aby zapewnić prawidłowe działanie serwisu,
              analizować ruch oraz personalizować treści.
              Możesz zaakceptować wszystkie lub dostosować swoje preferencje.
              Dowiedz się więcej w{' '}
              <Link href="/polityka-cookies" className="cc-link" onClick={() => setVisible(false)}>
                Polityce cookies
              </Link>
              {' '}i{' '}
              <Link href="/polityka-prywatnosci" className="cc-link" onClick={() => setVisible(false)}>
                Polityce prywatności
              </Link>.
            </p>
          </div>
        </div>

        {/* ── Panel zarządzania kategoriami ── */}
        {expanded && (
          <div className="cc-categories">

            <div className="cc-category">
              <div className="cc-category__info">
                <span className="cc-category__name">Niezbędne</span>
                <span className="cc-category__desc">
                  Wymagane do prawidłowego działania strony (sesja, logowanie, koszyk).
                  Nie można ich wyłączyć.
                </span>
              </div>
              <div className="cc-toggle cc-toggle--locked" title="Zawsze włączone">
                <span className="cc-toggle__thumb" />
              </div>
            </div>

            <div className="cc-category">
              <div className="cc-category__info">
                <span className="cc-category__name">Analityczne</span>
                <span className="cc-category__desc">
                  Pomagają nam zrozumieć, jak użytkownicy korzystają z serwisu
                  (np. Google Analytics, statystyki ruchu).
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={analytics}
                className={`cc-toggle${analytics ? ' cc-toggle--on' : ''}`}
                onClick={() => setAnalytics((v) => !v)}
              >
                <span className="cc-toggle__thumb" />
              </button>
            </div>

            <div className="cc-category">
              <div className="cc-category__info">
                <span className="cc-category__name">Marketingowe</span>
                <span className="cc-category__desc">
                  Używane do wyświetlania spersonalizowanych reklam i śledzenia
                  skuteczności kampanii marketingowych.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={marketing}
                className={`cc-toggle${marketing ? ' cc-toggle--on' : ''}`}
                onClick={() => setMarketing((v) => !v)}
              >
                <span className="cc-toggle__thumb" />
              </button>
            </div>

          </div>
        )}

        {/* ── Przyciski akcji ── */}
        <div className="cc-actions">
          {expanded ? (
            <>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={acceptNecessary}>
                Tylko niezbędne
              </button>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={saveCustom}>
                Zapisz wybór
              </button>
              <button type="button" className="cc-btn cc-btn--primary" onClick={acceptAll}>
                Akceptuj wszystkie
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="cc-btn cc-btn--ghost"
                onClick={() => setExpanded(true)}
              >
                Zarządzaj preferencjami
              </button>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={acceptNecessary}>
                Tylko niezbędne
              </button>
              <button type="button" className="cc-btn cc-btn--primary" onClick={acceptAll}>
                Akceptuj wszystkie
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

/** Wywołuje otwarcie panelu z footera/ustawień */
export function openCookieSettings() {
  window.dispatchEvent(new Event('openCookieSettings'));
}

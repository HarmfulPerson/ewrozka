'use client';

import { openCookieSettings } from './CookieConsent';

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="footer__link footer__link--btn"
      onClick={openCookieSettings}
    >
      Ustawienia cookies
    </button>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import './page-transition.css';

/**
 * Strony które chcą trzymać overlay do momentu załadowania danych powinny:
 *   window.dispatchEvent(new CustomEvent('ewrozka:panel-loading'))  — na start fetchowania
 *   window.dispatchEvent(new CustomEvent('ewrozka:panel-ready'))    — po zakończeniu
 */
export default function PanelPageTransition() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  // Czy strona docelowa zgłosiła, że jeszcze się ładuje
  const extendedRef = useRef(false);
  // Czy pathname już się zmieniło (czekamy na panel-ready)
  const awaitingReadyRef = useRef(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    if (decideTimer.current) { clearTimeout(decideTimer.current); decideTimer.current = null; }
  };

  const doHide = () => {
    clearTimers();
    awaitingReadyRef.current = false;
    extendedRef.current = false;
    setHiding(true);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setHiding(false);
    }, 300);
  };

  // Nasłuchuj zdarzeń od stron panelu
  useEffect(() => {
    const onLoading = () => {
      extendedRef.current = true;
    };

    const onReady = () => {
      extendedRef.current = false;
      // Jeśli pathname już się zmieniło i czekamy → ukryj teraz
      if (awaitingReadyRef.current) {
        doHide();
      }
    };

    window.addEventListener('ewrozka:panel-loading', onLoading);
    window.addEventListener('ewrozka:panel-ready', onReady);
    return () => {
      window.removeEventListener('ewrozka:panel-loading', onLoading);
      window.removeEventListener('ewrozka:panel-ready', onReady);
    };
  // doHide jest stabilna przez ref pattern
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wykryj zmianę pathname
  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    if (!visible) return;

    // Krótkie okno (100ms) żeby strona docelowa zdążyła zamontować się
    // i ewentualnie wywołać ewrozka:panel-loading
    decideTimer.current = setTimeout(() => {
      if (extendedRef.current) {
        // Strona sygnalizuje, że się ładuje → czekaj na panel-ready
        awaitingReadyRef.current = true;
        // Bezpiecznik: max 6s
        hideTimer.current = setTimeout(doHide, 6000);
      } else {
        // Brak extended loading → chowaj normalnie
        doHide();
      }
    }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Interceptuj kliknięcia w linki wewnątrz panelu
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href) return;
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (href.startsWith('#')) return;

      const targetPath = href.split('?')[0].split('#')[0];
      const currentPath = pathname.split('?')[0].split('#')[0];
      if (targetPath === currentPath) return;

      // Tylko przejścia wewnątrz panelu
      if (!targetPath.startsWith('/panel') || !currentPath.startsWith('/panel')) return;

      clearTimers();
      extendedRef.current = false;
      awaitingReadyRef.current = false;
      setHiding(false);
      setVisible(true);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className={`ppt-overlay${hiding ? ' ppt-overlay--hiding' : ''}`} aria-hidden="true">
      <div className="ppt-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.svg" alt="" className="ppt-logo__img" />
      </div>
    </div>
  );
}

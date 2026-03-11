'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import './page-transition.css';

export default function PageTransition() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gdy pathname się zmienia – chowaj overlay
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (visible) {
        setHiding(true);
        hideTimer.current = setTimeout(() => {
          setVisible(false);
          setHiding(false);
        }, 350);
      }
    }
  }, [pathname, visible]);

  // Interceptuj kliknięcia w linki wewnętrzne
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      // Pomiń linki otwierające nową kartę / zewnętrzne
      if (anchor.target === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href) return;
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (href.startsWith('#')) return;

      // Pomiń jeśli to ta sama ścieżka (bez query/hash)
      const targetPath = (href.split('?')[0] ?? href).split('#')[0] ?? href;
      const currentPath = (pathname.split('?')[0] ?? pathname).split('#')[0] ?? pathname;
      if (targetPath === currentPath) return;

      // Pomiń przejścia wewnątrz panelu – tam działa PanelPageTransition
      if (targetPath.startsWith('/panel') && currentPath.startsWith('/panel')) return;

      // Pokaż loader
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setHiding(false);
      setVisible(true);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  // Bezpiecznik – po 4s chowamy na siłę (żeby nie zostało zawieszone)
  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => {
      setHiding(true);
      setTimeout(() => { setVisible(false); setHiding(false); }, 350);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`pt-overlay${hiding ? ' pt-overlay--hiding' : ''}`} aria-hidden="true">
      <div className="pt-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.svg" alt="" className="pt-logo__img" />
      </div>
    </div>
  );
}

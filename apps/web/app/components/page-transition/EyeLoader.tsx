'use client';

import './page-transition.css';

interface EyeLoaderProps {
  visible: boolean;
}

/**
 * Ten sam overlay z pulsującym okiem co przy przejściach między stronami,
 * ale sterowany propsem `visible` – do użycia podczas ładowania danych.
 */
export default function EyeLoader({ visible }: EyeLoaderProps) {
  if (!visible) return null;

  return (
    <div className="pt-overlay" aria-hidden="true">
      <div className="pt-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.svg" alt="" className="pt-logo__img" />
      </div>
    </div>
  );
}

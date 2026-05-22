'use client';

import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import './password-input.css';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  function PasswordInput({ className, ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    const fieldClass = ['password-input__field', className]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="password-input">
        <input
          {...rest}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={fieldClass}
        />
        <button
          type="button"
          className="password-input__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    );
  },
);

function EyeIcon() {
  return (
    <svg
      className="password-input__icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {/* Migdał oka — krzywa Beziera dla eleganckiego kształtu */}
      <path d="M2.5 12c1.7-3.7 5.4-7 9.5-7s7.8 3.3 9.5 7c-1.7 3.7-5.4 7-9.5 7s-7.8-3.3-9.5-7Z" />
      {/* Tęczówka */}
      <circle cx="12" cy="12" r="2.6" />
      {/* Subtelny "magiczny" błysk w rogu — mała 4-pkt gwiazdka */}
      <path d="M18.2 6.3l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="password-input__icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {/* Ten sam migdał oka, ale przekreślony */}
      <path d="M2.5 12c1.7-3.7 5.4-7 9.5-7s7.8 3.3 9.5 7c-1.7 3.7-5.4 7-9.5 7s-7.8-3.3-9.5-7Z" />
      <circle cx="12" cy="12" r="2.6" />
      <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
  );
}

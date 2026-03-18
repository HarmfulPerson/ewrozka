'use client';

import { Toaster } from 'react-hot-toast';

export function GlobalToaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--bg-secondary, #1a1625)',
          color: 'var(--text-primary, #e2e0f0)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: '12px',
          fontSize: '0.9rem',
        },
        success: {
          iconTheme: { primary: '#a78bfa', secondary: '#1a1625' },
        },
        error: {
          iconTheme: { primary: '#f87171', secondary: '#1a1625' },
        },
      }}
    />
  );
}

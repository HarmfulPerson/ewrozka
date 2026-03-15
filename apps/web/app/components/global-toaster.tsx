'use client';

import { Toaster } from 'react-hot-toast';

export function GlobalToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        },
      }}
    />
  );
}

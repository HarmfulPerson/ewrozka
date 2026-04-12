'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { setStoredUser, userFromApi } from '../../lib/auth-mock';
import { apiGetCurrentUser } from '../../lib/api';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch the full user profile before storing — we need the uid
    // (returned from the API) for all downstream lookups.
    apiGetCurrentUser(token)
      .then(({ user }) => {
        setStoredUser(userFromApi({ ...user, token }));
        router.push('/panel');
      })
      .catch(() => {
        router.push('/login?error=google_callback_failed');
      });
  }, [searchParams, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      color: 'var(--text-primary)'
    }}>
      <p>Logowanie...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--text-primary)'
      }}>
        <p>Logowanie...</p>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}

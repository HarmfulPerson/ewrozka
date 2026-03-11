'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { setStoredUser } from '../../lib/auth-mock';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      setStoredUser({
        token,
        email: '',
        username: '',
        bio: '',
        image: '',
        roles: [],
        id: 0,
        topicIds: [],
        topicNames: [],
      });

      router.push('/panel');
    } else {
      router.push('/login');
    }
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

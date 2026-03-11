'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { setStoredUser } from '../../lib/auth-mock';

export default function AuthCallbackPage() {
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

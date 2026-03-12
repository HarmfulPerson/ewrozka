'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiGetCurrentUser } from '../../../lib/api';
import { setStoredUser, userFromApi } from '../../../lib/auth-mock';

function LoginSuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const returnUrl = searchParams.get('returnUrl');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Brak tokena. Przekierowanie do logowania…');
      router.replace('/login');
      return;
    }

    apiGetCurrentUser(token)
      .then((res) => {
        const user = userFromApi({ ...res.user, token });
        setStoredUser(user);
        const redirect = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/panel';
        router.replace(redirect);
      })
      .catch(() => {
        setError('Sesja wygasła. Przekierowanie do logowania…');
        router.replace('/login');
      });
  }, [token, returnUrl, router]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p>Logowanie…</p>
    </div>
  );
}

export default function LoginSuccessPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: 'center', padding: '2rem' }}>Logowanie…</p>}>
      <LoginSuccessHandler />
    </Suspense>
  );
}

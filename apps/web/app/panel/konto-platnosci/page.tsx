'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../../lib/auth-mock';
import { StripeOnboarding } from '../../components/stripe-onboarding/StripeOnboarding';

export default function KontoPlatnosciPage() {
  const router = useRouter();
  const [user, setUser] = useState(() => getStoredUser());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const u = getStoredUser();
    if (!u) {
      router.push('/login?returnUrl=/panel/konto-platnosci');
      return;
    }
    setUser(u);
  }, [router]);

  if (!mounted || !user) return null;

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Konto płatności</h1>
        <p className="panel-page__subtitle" style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Skonfiguruj konto bankowe, aby wypłacać swoje zarobki
        </p>
      </div>

      <StripeOnboarding
        token={user.token}
        onComplete={() => router.push('/panel/portfel')}
        onExit={() => router.push('/panel/portfel')}
      />
    </div>
  );
}

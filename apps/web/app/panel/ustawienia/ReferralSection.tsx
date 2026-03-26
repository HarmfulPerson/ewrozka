'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetReferralStats } from '../../lib/api';

export function ReferralSection() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    apiGetReferralStats(user.token)
      .then((data) => {
        setReferralCode(data.referralCode);
        setReferralCount(data.referralCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const referralUrl = referralCode
    ? `${window.location.origin}/rejestracja?ref=${referralCode}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success('Link skopiowany!');
    } catch {
      toast.error('Nie udało się skopiować');
    }
  };

  if (loading) {
    return (
      <section className="ustawienia-section">
        <h2 className="ustawienia-section__title">Polecaj znajomym</h2>
        <p className="referral-loading">Ładowanie...</p>
      </section>
    );
  }

  return (
    <section className="ustawienia-section">
      <h2 className="ustawienia-section__title">Polecaj znajomym</h2>
      <p className="ustawienia-section__hint">
        Udostępnij swój link polecający. Każda rejestracja z tego linku zostanie zliczona.
      </p>

      <div className="referral-stats">
        <div className="referral-stats__count">
          <span className="referral-stats__number">{referralCount}</span>
          <span className="referral-stats__label">
            {referralCount === 1
              ? 'osoba'
              : referralCount >= 2 && referralCount <= 4
                ? 'osoby'
                : 'osób'}{' '}
            zarejestrowało się z Twojego linku
          </span>
        </div>
      </div>

      <div className="referral-link">
        <input
          type="text"
          readOnly
          value={referralUrl}
          className="referral-link__input"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className="referral-link__copy"
          onClick={handleCopy}
        >
          Kopiuj
        </button>
      </div>
    </section>
  );
}

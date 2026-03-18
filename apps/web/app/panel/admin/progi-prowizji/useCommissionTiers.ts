'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../../../lib/auth-mock';
import {
  apiGetCommissionTierConfig,
  apiUpdateCommissionTierConfig,
  type CommissionTierConfig,
} from '../../../lib/api-admin';

export type TierRow = { minMeetings: number; maxMeetings: number | null; feePercent: number };

function tiersOverlap(tiers: TierRow[]): boolean {
  for (let i = 0; i < tiers.length; i++) {
    for (let j = i + 1; j < tiers.length; j++) {
      const a = tiers[i];
      const b = tiers[j];
      const maxA = a?.maxMeetings ?? Infinity;
      const maxB = b?.maxMeetings ?? Infinity;
      if ((a?.minMeetings ?? 0) <= maxB && maxA >= (b?.minMeetings ?? 0)) return true;
    }
  }
  return false;
}

const DEFAULT_TIERS: TierRow[] = [
  { minMeetings: 0, maxMeetings: 29, feePercent: 20 },
  { minMeetings: 30, maxMeetings: 59, feePercent: 18 },
  { minMeetings: 60, maxMeetings: 99, feePercent: 16 },
  { minMeetings: 100, maxMeetings: null, feePercent: 14 },
];

export function useCommissionTiers() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [config, setConfig] = useState<CommissionTierConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [windowDays, setWindowDays] = useState(90);
  const [tiers, setTiers] = useState<TierRow[]>(DEFAULT_TIERS);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/login?returnUrl=/panel/admin/progi-prowizji');
      return;
    }
    if (!stored.roles?.includes('admin')) {
      router.push('/panel');
      return;
    }
    setUser(stored);
  }, [router]);

  useEffect(() => {
    if (!user?.token) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGetCommissionTierConfig(user!.token);
        setConfig(data);
        setWindowDays(data.windowDays);
        setTiers(
          data.tiers.length > 0
            ? data.tiers.map((t) => ({
                minMeetings: t.minMeetings,
                maxMeetings: t.maxMeetings,
                feePercent: t.feePercent,
              }))
            : DEFAULT_TIERS,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd ładowania');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.token]);

  const handleSave = async () => {
    if (!user?.token) return;
    if (windowDays < 1 || windowDays > 365) {
      setError('Okres musi być 1–365 dni.');
      return;
    }
    for (const t of tiers) {
      if (t.feePercent < 0 || t.feePercent > 100) {
        setError(`Prowizja ${t.feePercent}% musi być 0–100.`);
        return;
      }
      if (t.maxMeetings != null && t.maxMeetings < t.minMeetings) {
        setError('Maks. spotkań nie może być mniejsze od min. w tym samym progu.');
        return;
      }
    }
    if (tiersOverlap(tiers)) {
      setError('Progi nie mogą na siebie zachodzić – każdy zakres musi być osobny.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiUpdateCommissionTierConfig(user!.token, {
        windowDays,
        tiers: tiers.map((t) => ({
          minMeetings: t.minMeetings,
          maxMeetings: t.maxMeetings,
          feePercent: t.feePercent,
        })),
      });
      setSuccess('Konfiguracja zapisana.');
      setConfig({ windowDays, tiers });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const nextMin = last ? (last.maxMeetings ?? last.minMeetings) + 1 : 0;
    setTiers([...tiers, { minMeetings: nextMin, maxMeetings: null, feePercent: last?.feePercent ?? 14 }]);
  };

  const removeTier = (i: number) => {
    setTiers(tiers.filter((_, idx) => idx !== i));
  };

  const updateTier = (i: number, field: keyof TierRow, value: number | null) => {
    const next = [...tiers];
    const current = next[i];
    if (field === 'maxMeetings') {
      next[i] = {
        minMeetings: current?.minMeetings ?? 0,
        maxMeetings: value === 0 || value == null ? null : value,
        feePercent: current?.feePercent ?? 0,
      };
    } else {
      next[i] = {
        minMeetings: field === 'minMeetings' ? (value ?? 0) : current?.minMeetings ?? 0,
        maxMeetings: current?.maxMeetings ?? 0,
        feePercent: field === 'feePercent' ? (value ?? 0) : current?.feePercent ?? 0,
      };
    }
    setTiers(next);
  };

  return {
    user,
    loading,
    saving,
    error,
    success,
    windowDays,
    setWindowDays,
    tiers,
    handleSave,
    addTier,
    removeTier,
    updateTier,
  };
}

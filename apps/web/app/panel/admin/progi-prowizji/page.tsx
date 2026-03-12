'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../../../lib/auth-mock';
import {
  apiGetCommissionTierConfig,
  apiUpdateCommissionTierConfig,
  type CommissionTierConfig,
} from '../../../lib/api-admin';
import '../wrozki/wrozki.css';

type TierRow = { minMeetings: number; maxMeetings: number | null; feePercent: number };

function tiersOverlap(tiers: TierRow[]): boolean {
  for (let i = 0; i < tiers.length; i++) {
    for (let j = i + 1; j < tiers.length; j++) {
      const a = tiers[i];
      const b = tiers[j];
      const maxA = a.maxMeetings ?? Infinity;
      const maxB = b.maxMeetings ?? Infinity;
      if (a.minMeetings <= maxB && maxA >= b.minMeetings) return true;
    }
  }
  return false;
}

export default function ProgiProwizjiPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [config, setConfig] = useState<CommissionTierConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [windowDays, setWindowDays] = useState(90);
  const [tiers, setTiers] = useState<TierRow[]>([
    { minMeetings: 0, maxMeetings: 29, feePercent: 20 },
    { minMeetings: 30, maxMeetings: 59, feePercent: 18 },
    { minMeetings: 60, maxMeetings: 99, feePercent: 16 },
    { minMeetings: 100, maxMeetings: null, feePercent: 14 },
  ]);

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
            : [
                { minMeetings: 0, maxMeetings: 29, feePercent: 20 },
                { minMeetings: 30, maxMeetings: 59, feePercent: 18 },
                { minMeetings: 60, maxMeetings: 99, feePercent: 16 },
                { minMeetings: 100, maxMeetings: null, feePercent: 14 },
              ],
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

  if (!user || loading) {
    return (
      <div className="panel-page">
        <div className="panel-page__head">
          <h1 className="panel-page__title">Progi prowizji</h1>
        </div>
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Progi prowizji</h1>
        <p className="aw-profile__card-row" style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Prowizja wróżek zależy od liczby zakończonych spotkań w ostatnich N dniach.
        </p>
      </div>

      {error && <div className="aw-profile__msg aw-profile__msg--error">{error}</div>}
      {success && <div className="aw-profile__msg aw-profile__msg--success">{success}</div>}

      <section className="aw-profile__card" style={{ maxWidth: 640 }}>
        <h2 className="aw-profile__card-title">Okres naliczania</h2>
        <p className="aw-profile__card-row">
          <span className="aw-profile__label">Ostatnie dni:</span>
          <input
            type="number"
            min={1}
            max={365}
            value={windowDays}
            onChange={(e) => setWindowDays(parseInt(e.target.value, 10) || 90)}
            className="aw-profile__fee-input aw-profile__input-number"
          />
        </p>
        <p className="aw-profile__card-row" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Spotkania zakończone w tym okresie decydują o progu prowizji.
        </p>
      </section>

      <section className="aw-profile__card" style={{ maxWidth: 640 }}>
        <h2 className="aw-profile__card-title">Progi (min–max spotkań → prowizja %)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tiers.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="number"
                min={0}
                value={t.minMeetings}
                onChange={(e) => updateTier(i, 'minMeetings', parseInt(e.target.value, 10) || 0)}
                className="aw-profile__input-number"
                style={{ width: 70 }}
              />
              <span>–</span>
              <input
                type="number"
                min={t.minMeetings}
                placeholder="∞"
                value={t.maxMeetings ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  const v = raw === '' ? null : parseInt(raw, 10);
                  updateTier(i, 'maxMeetings', v);
                }}
                className="aw-profile__input-number"
                style={{ width: 70 }}
              />
              <span>spotkań →</span>
              <input
                type="number"
                min={0}
                max={100}
                value={t.feePercent}
                onChange={(e) => updateTier(i, 'feePercent', parseInt(e.target.value, 10) || 0)}
                className="aw-profile__input-number"
                style={{ width: 60 }}
              />
              <span>%</span>
              {tiers.length > 1 && (
                <button
                  type="button"
                  className="aw-profile__btn aw-profile__btn--secondary"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => removeTier(i)}
                >
                  Usuń
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="aw-profile__btn aw-profile__btn--secondary"
          style={{ marginTop: '0.75rem' }}
          onClick={addTier}
        >
          + Dodaj próg
        </button>
      </section>

      <div className="aw-profile__actions">
        <button
          type="button"
          className="aw-profile__btn aw-profile__btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Zapisywanie…' : 'Zapisz konfigurację'}
        </button>
      </div>
    </div>
  );
}

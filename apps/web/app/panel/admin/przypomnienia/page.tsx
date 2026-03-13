'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../../../lib/auth-mock';
import {
  apiGetReminderConfig,
  apiUpdateReminderConfig,
  type ReminderConfig,
} from '../../../lib/api-admin';
import '../wrozki/wrozki.css';

export default function PrzypomnieniaPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [enabled48h, setEnabled48h] = useState(true);
  const [enabled24h, setEnabled24h] = useState(true);
  const [enabled1h, setEnabled1h] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/login?returnUrl=/panel/admin/przypomnienia');
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
        const data = await apiGetReminderConfig(user!.token);
        setConfig(data);
        setEnabled48h(data.enabled48h);
        setEnabled24h(data.enabled24h);
        setEnabled1h(data.enabled1h);
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
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiUpdateReminderConfig(user!.token, {
        enabled48h,
        enabled24h,
        enabled1h,
      });
      setSuccess('Konfiguracja zapisana.');
      setConfig({ enabled48h, enabled24h, enabled1h });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="panel-page">
        <div className="panel-page__head">
          <h1 className="panel-page__title">Przypomnienia o spotkaniach</h1>
        </div>
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Przypomnienia o spotkaniach</h1>
        <p className="aw-profile__card-row" style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          E-maile z przypomnieniami są wysyłane tylko dla zaakceptowanych lub opłaconych spotkań.
          Dla nieopłaconych – przypomnienie zawiera link do płatności.
        </p>
      </div>

      {error && <div className="aw-profile__msg aw-profile__msg--error">{error}</div>}
      {success && <div className="aw-profile__msg aw-profile__msg--success">{success}</div>}

      <section className="aw-profile__card" style={{ maxWidth: 640 }}>
        <h2 className="aw-profile__card-title">Interwały przypomnień</h2>
        <p className="aw-profile__card-row" style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Zaznacz, w jakim czasie przed spotkaniem wysyłać przypomnienie:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label className="aw-profile__checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled48h}
              onChange={(e) => setEnabled48h(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
            <span><strong>48 godzin</strong> przed spotkaniem</span>
          </label>
          <label className="aw-profile__checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled24h}
              onChange={(e) => setEnabled24h(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
            <span><strong>24 godziny</strong> przed spotkaniem</span>
          </label>
          <label className="aw-profile__checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled1h}
              onChange={(e) => setEnabled1h(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
            <span><strong>1 godzina</strong> przed spotkaniem</span>
          </label>
        </div>
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

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
import './przypomnienia.css';

export default function PrzypomnieniaPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [enabled1, setEnabled1] = useState(true);
  const [enabled2, setEnabled2] = useState(true);
  const [enabled3, setEnabled3] = useState(true);
  const [hours1, setHours1] = useState(48);
  const [hours2, setHours2] = useState(24);
  const [hours3, setHours3] = useState(1);

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
        setEnabled1(data.enabled48h);
        setEnabled2(data.enabled24h);
        setEnabled3(data.enabled1h);
        setHours1(data.hoursSlot1 ?? 48);
        setHours2(data.hoursSlot2 ?? 24);
        setHours3(data.hoursSlot3 ?? 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Blad ladowania');
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
        enabled48h: enabled1,
        enabled24h: enabled2,
        enabled1h: enabled3,
        hoursSlot1: hours1,
        hoursSlot2: hours2,
        hoursSlot3: hours3,
      });
      setSuccess('Konfiguracja zapisana.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad zapisu');
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

  const slots = [
    { label: 'Przypomnienie 1', enabled: enabled1, setEnabled: setEnabled1, hours: hours1, setHours: setHours1 },
    { label: 'Przypomnienie 2', enabled: enabled2, setEnabled: setEnabled2, hours: hours2, setHours: setHours2 },
    { label: 'Przypomnienie 3', enabled: enabled3, setEnabled: setEnabled3, hours: hours3, setHours: setHours3 },
  ];

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Przypomnienia o spotkaniach</h1>
        <p className="aw-profile__card-row" style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          E-maile z przypomnieniami sa wysylane tylko dla zaakceptowanych lub oplaconych spotkan.
          Dla nieoplaconych — przypomnienie zawiera link do platnosci.
        </p>
      </div>

      {error && <div className="aw-profile__msg aw-profile__msg--error">{error}</div>}
      {success && <div className="aw-profile__msg aw-profile__msg--success">{success}</div>}

      <section className="aw-profile__card" style={{ maxWidth: 640 }}>
        <h2 className="aw-profile__card-title">Sloty przypomnien</h2>
        <p className="aw-profile__card-row" style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Kazdy slot to osobne przypomnienie wysylane przed spotkaniem.
          Wlacz/wylacz i ustaw ile godzin przed spotkaniem ma zostac wyslane.
        </p>

        <div className="reminder-slots">
          {slots.map((slot, i) => (
            <div key={i} className={`reminder-slot${slot.enabled ? '' : ' reminder-slot--disabled'}`}>
              <div className="reminder-slot__header">
                <span className="reminder-slot__label">{slot.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={slot.enabled}
                  className={`reminder-toggle${slot.enabled ? ' reminder-toggle--on' : ''}`}
                  onClick={() => slot.setEnabled(!slot.enabled)}
                >
                  <span className="reminder-toggle__thumb" />
                  <span className="reminder-toggle__text">{slot.enabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>
              <div className="reminder-slot__body">
                <label className="reminder-slot__hours-label">
                  Wyslij
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={slot.hours}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1) slot.setHours(v);
                    }}
                    className="reminder-slot__hours-input"
                    disabled={!slot.enabled}
                  />
                  {slot.hours === 1 ? 'godzine' : 'godzin'} przed spotkaniem
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="aw-profile__actions">
        <button
          type="button"
          className="aw-profile__btn aw-profile__btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Zapisywanie...' : 'Zapisz konfiguracje'}
        </button>
      </div>
    </div>
  );
}

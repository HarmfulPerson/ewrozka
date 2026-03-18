'use client';

import type { TierRow } from './useCommissionTiers';

export function WindowDaysSection({
  windowDays,
  setWindowDays,
}: {
  windowDays: number;
  setWindowDays: (v: number) => void;
}) {
  return (
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
  );
}

export function TiersSection({
  tiers,
  onUpdate,
  onRemove,
  onAdd,
}: {
  tiers: TierRow[];
  onUpdate: (i: number, field: keyof TierRow, value: number | null) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
}) {
  return (
    <section className="aw-profile__card" style={{ maxWidth: 640 }}>
      <h2 className="aw-profile__card-title">Progi (min–max spotkań → prowizja %)</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {tiers.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="number"
              min={0}
              value={t.minMeetings}
              onChange={(e) => onUpdate(i, 'minMeetings', parseInt(e.target.value, 10) || 0)}
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
                onUpdate(i, 'maxMeetings', v);
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
              onChange={(e) => onUpdate(i, 'feePercent', parseInt(e.target.value, 10) || 0)}
              className="aw-profile__input-number"
              style={{ width: 60 }}
            />
            <span>%</span>
            {tiers.length > 1 && (
              <button
                type="button"
                className="aw-profile__btn aw-profile__btn--secondary"
                style={{ marginLeft: 'auto' }}
                onClick={() => onRemove(i)}
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
        onClick={onAdd}
      >
        + Dodaj próg
      </button>
    </section>
  );
}

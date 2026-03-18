'use client';

import { DAY_SHORT } from './constants';

interface AddAvailabilityModalProps {
  submitting: boolean;
  formError: string | null;
  selectedDays: number[];
  toggleDay: (i: number) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  repeat: boolean;
  setRepeat: (v: boolean) => void;
  repeatWeeks: number;
  setRepeatWeeks: (v: number) => void;
  timeSlots: string[];
  handleAdd: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function AddAvailabilityModal({
  submitting, formError, selectedDays, toggleDay,
  startTime, setStartTime, endTime, setEndTime,
  repeat, setRepeat, repeatWeeks, setRepeatWeeks,
  timeSlots, handleAdd, onClose,
}: AddAvailabilityModalProps) {
  return (
    <div className="wnioski-modal-overlay" onClick={() => !submitting && onClose()}>
      <div className="wnioski-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="wnioski-modal__header">
          <h3 className="wnioski-modal__title">Dodaj blok dostępności</h3>
          <button className="wnioski-modal__close" onClick={() => !submitting && onClose()}>✕</button>
        </div>
        <form onSubmit={handleAdd}>
          <div className="wnioski-modal__body">
            {formError && <p className="wnioski-modal__error" style={{ marginBottom: '0.75rem' }}>{formError}</p>}

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Wybierz dni tygodnia</p>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {DAY_SHORT.map((name, i) => (
                <button
                  key={i} type="button"
                  className={`wnioski-filter-btn${selectedDays.includes(i) ? ' wnioski-filter-btn--active' : ''}`}
                  onClick={() => toggleDay(i)}
                >{name}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Od</label>
                <select className="wnioski-pagination__select" style={{ width: '100%', padding: '0.5rem' }} value={startTime} onChange={e => setStartTime(e.target.value)}>
                  {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Do</label>
                <select className="wnioski-pagination__select" style={{ width: '100%', padding: '0.5rem' }} value={endTime} onChange={e => setEndTime(e.target.value)}>
                  {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-primary)', cursor: 'pointer', marginBottom: repeat ? '0.75rem' : 0 }}>
              <input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
              Powtarzaj przez kolejne tygodnie
            </label>

            {repeat && (
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Liczba tygodni</label>
                <input type="number" min={1} max={12} value={repeatWeeks} onChange={e => setRepeatWeeks(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                  className="wnioski-pagination__select" style={{ width: '80px', padding: '0.5rem', textAlign: 'center' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                  Łącznie do {selectedDays.length * repeatWeeks} bloków
                </p>
              </div>
            )}
          </div>
          <div className="wnioski-modal__footer">
            <button type="button" className="wnioski-btn wnioski-btn--cancel" onClick={() => onClose()} disabled={submitting}>Anuluj</button>
            <button type="submit" className="wnioski-btn wnioski-btn--accept" style={{ padding: '0.5rem 1rem' }} disabled={submitting || selectedDays.length === 0}>
              {submitting ? 'Dodawanie…' : 'Dodaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

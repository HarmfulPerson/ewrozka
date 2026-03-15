'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import {
  apiGetMyAvailability,
  apiCreateAvailability,
  apiDeleteAvailability,
  AvailabilityDto,
} from '../../lib/api-calendar';
import '../wnioski/wnioski.css';
import '../panel-shared.css';

const PAGE_SIZES = [10, 20, 50, 100];
const VALID_FILTERS = ['', 'upcoming', 'past'];
const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const DAY_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

function fmtDate(d: Date) {
  return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DostepnoscPage() {
  const [user] = useState(() => getStoredUser());
  const [availabilities, setAvailabilities] = useState<AvailabilityDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState('upcoming');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);

  // Add modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [repeat, setRepeat] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<AvailabilityDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetMyAvailability(user.token, {
        filter: filterType || undefined,
        limit, offset, sortOrder,
      });
      setAvailabilities(data.availabilities);
      setTotal(data.total);
    } catch {
      toast.error('Nie udało się załadować dostępności');
    } finally {
      setLoading(false);
    }
  }, [user, filterType, offset, limit, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Sort toggle ──
  const toggleSort = () => {
    setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    setOffset(0);
  };

  // ── Add availability ──
  const openAddModal = () => {
    setSelectedDays([]); setStartTime('09:00'); setEndTime('17:00');
    setRepeat(false); setRepeatWeeks(1); setFormError(null);
    setAddModalOpen(true);
  };

  const toggleDay = (i: number) => {
    setSelectedDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort());
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);
    setSubmitting(true);
    try {
      if (selectedDays.length === 0) throw new Error('Wybierz przynajmniej jeden dzień');
      const [sH = 0, sM = 0] = startTime.split(':').map(Number);
      const [eH = 0, eM = 0] = endTime.split(':').map(Number);
      if (eH * 60 + eM <= sH * 60 + sM) throw new Error('Godzina zakończenia musi być po godzinie rozpoczęcia');

      const now = new Date();
      const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
      const weekStart = getWeekStart();
      const weeks = repeat ? repeatWeeks : 1;
      let added = 0;

      for (let w = 0; w < weeks; w++) {
        for (const dayIdx of selectedDays) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + dayIdx + w * 7);
          dayDate.setHours(0, 0, 0, 0);
          if (dayDate < todayMidnight) continue;

          const start = new Date(dayDate); start.setHours(sH, sM, 0, 0);
          const end = new Date(dayDate); end.setHours(eH, eM, 0, 0);

          if (dayDate.getTime() === todayMidnight.getTime() && start < now) {
            throw new Error(`Godzina ${startTime} na dziś już minęła`);
          }
          await apiCreateAvailability(user.token, { startsAt: start.toISOString(), endsAt: end.toISOString() });
          added++;
        }
      }
      if (added === 0) throw new Error('Nie dodano żadnych bloków — dni w przeszłości');
      toast.success(`Dodano ${added} ${added === 1 ? 'blok' : added < 5 ? 'bloki' : 'bloków'} dostępności`);
      setAddModalOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Błąd');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──
  const confirmDelete = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await apiDeleteAvailability(user.token, deleteTarget.id);
      toast.success('Dostępność usunięta');
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd usuwania');
    } finally {
      setDeleting(false);
    }
  };

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  // ── Render ──
  if (loading && availabilities.length === 0) {
    return (
      <div className="panel-page wnioski-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page wnioski-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Moja dostępność</h1>
        <button className="wnioski-btn wnioski-btn--accept" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={openAddModal}>
          + Dodaj
        </button>
      </div>

      <div className="wnioski-toolbar">
        <div className="wnioski-filters">
          {([
            ['', 'Wszystkie'],
            ['upcoming', 'Nadchodzące'],
            ['past', 'Przeszłe'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              className={`wnioski-filter-btn${filterType === value ? ' wnioski-filter-btn--active' : ''}`}
              onClick={() => { setFilterType(value); setOffset(0); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="wnioski-table-wrap">
        {availabilities.length === 0 ? (
          <p className="wnioski-empty">Brak bloków dostępności dla wybranego filtra</p>
        ) : (
          <table className="wnioski-table">
            <thead>
              <tr>
                <th data-sortable onClick={toggleSort}>
                  <span className="wnioski-th-inner">
                    Data
                    <span className={`wnioski-sort-arrow wnioski-sort-arrow--active`}>
                      {sortOrder === 'ASC' ? '▲' : '▼'}
                    </span>
                  </span>
                </th>
                <th>Godziny</th>
                <th>Czas trwania</th>
                <th style={{ width: 100 }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {availabilities.map(avail => {
                const start = new Date(avail.startsAt);
                const end = new Date(avail.endsAt);
                const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
                const isPast = end < new Date();

                return (
                  <tr key={avail.id} style={isPast ? { opacity: 0.5 } : undefined}>
                    <td>
                      <span className="wnioski-cell-client">{fmtDate(start)}</span>
                    </td>
                    <td className="wnioski-cell-date">
                      {fmtTime(start)} – {fmtTime(end)}
                    </td>
                    <td>
                      {durationMin >= 60
                        ? `${Math.floor(durationMin / 60)} h${durationMin % 60 > 0 ? ` ${durationMin % 60} min` : ''}`
                        : `${durationMin} min`
                      }
                    </td>
                    <td>
                      <button
                        className="wnioski-btn wnioski-btn--reject"
                        onClick={() => setDeleteTarget(avail)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="wnioski-pagination">
        <div className="wnioski-pagination__per-page">
          <span className="wnioski-pagination__label">Wierszy:</span>
          <select
            className="wnioski-pagination__select"
            value={limit}
            onChange={e => { setLimit(Number(e.target.value)); setOffset(0); }}
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="wnioski-pagination__nav">
          <button className="wnioski-pagination__btn" onClick={() => setOffset(0)} disabled={currentPage === 1}>«</button>
          <button className="wnioski-pagination__btn" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={currentPage === 1}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] ?? 0) > 1) acc.push('dots');
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === 'dots' ? (
                <span key={`dots-${idx}`} className="wnioski-pagination__dots">…</span>
              ) : (
                <button key={item} className={`wnioski-pagination__btn${item === currentPage ? ' wnioski-pagination__btn--active' : ''}`} onClick={() => setOffset((item - 1) * limit)}>{item}</button>
              )
            )}
          <button className="wnioski-pagination__btn" onClick={() => setOffset(offset + limit)} disabled={currentPage === totalPages}>›</button>
          <button className="wnioski-pagination__btn" onClick={() => setOffset((totalPages - 1) * limit)} disabled={currentPage === totalPages}>»</button>
        </div>

        <span className="wnioski-pagination__info">
          {total > 0 ? `${offset + 1}–${Math.min(offset + limit, total)} z ${total}` : '0 z 0'}
        </span>
      </div>

      {/* Modal dodawania */}
      {addModalOpen && (
        <div className="wnioski-modal-overlay" onClick={() => !submitting && setAddModalOpen(false)}>
          <div className="wnioski-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="wnioski-modal__header">
              <h3 className="wnioski-modal__title">Dodaj blok dostępności</h3>
              <button className="wnioski-modal__close" onClick={() => !submitting && setAddModalOpen(false)}>✕</button>
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
                <button type="button" className="wnioski-btn wnioski-btn--cancel" onClick={() => setAddModalOpen(false)} disabled={submitting}>Anuluj</button>
                <button type="submit" className="wnioski-btn wnioski-btn--accept" style={{ padding: '0.5rem 1rem' }} disabled={submitting || selectedDays.length === 0}>
                  {submitting ? 'Dodawanie…' : 'Dodaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal usuwania */}
      {deleteTarget && (
        <div className="wnioski-modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="wnioski-modal" onClick={e => e.stopPropagation()}>
            <div className="wnioski-modal__header">
              <h3 className="wnioski-modal__title">Potwierdź usunięcie</h3>
              <button className="wnioski-modal__close" onClick={() => !deleting && setDeleteTarget(null)}>✕</button>
            </div>
            <div className="wnioski-modal__body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Czy na pewno chcesz usunąć ten blok dostępności?
              </p>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {fmtDate(new Date(deleteTarget.startsAt))} · {fmtTime(new Date(deleteTarget.startsAt))} – {fmtTime(new Date(deleteTarget.endsAt))}
              </p>
            </div>
            <div className="wnioski-modal__footer">
              <button className="wnioski-btn wnioski-btn--cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Anuluj</button>
              <button className="wnioski-btn wnioski-btn--reject" style={{ padding: '0.5rem 1rem' }} onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Usuwanie…' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

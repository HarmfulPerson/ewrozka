'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import {
  apiGetMyAvailability,
  apiCreateAvailability,
  apiDeleteAvailability,
  AvailabilityDto,
} from '../../lib/api-calendar';
import './dostepnosc.css';
import '../panel-shared.css';

function formatDate(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}
function formatTime(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function DostepnoscPage() {
  const [user] = useState(() => getStoredUser());
  const [availabilities, setAvailabilities] = useState<AvailabilityDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchingList, setFetchingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [repeat, setRepeat] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [availabilityToDelete, setAvailabilityToDelete] = useState<AvailabilityDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Pagination, filter and sort state
  const [filterType, setFilterType] = useState<string>('upcoming');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  const DAY_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const fetchAvailabilities = async (isInitialLoad = false) => {
    if (!user) return;
    if (isInitialLoad) setLoading(true);
    else setFetchingList(true);

    try {
      const data = await apiGetMyAvailability(user.token, {
        filter: filterType || undefined,
        limit,
        offset,
        sortOrder,
      });
      setAvailabilities(data.availabilities);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować dostępności');
    } finally {
      if (isInitialLoad) setLoading(false);
      else setFetchingList(false);
    }
  };

  useEffect(() => { fetchAvailabilities(true); }, [user]);
  useEffect(() => { if (!loading) fetchAvailabilities(false); }, [filterType, sortOrder, offset, limit]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const openAddModal = () => {
    setSelectedDays([]);
    setStartTime('09:00');
    setEndTime('17:00');
    setRepeat(false);
    setRepeatWeeks(1);
    setFormError(null);
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (submitting) return;
    setAddModalOpen(false);
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort(),
    );
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFormError(null);
    setSubmitting(true);

    try {
      if (selectedDays.length === 0) throw new Error('Wybierz przynajmniej jeden dzień');
      if (!startTime || !endTime) throw new Error('Wybierz godziny');

      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      if (endH * 60 + endM <= startH * 60 + startM) {
        throw new Error('Godzina zakończenia musi być po godzinie rozpoczęcia');
      }

      const now = new Date();
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      const weekStart = getWeekStart();
      const weeks = repeat ? repeatWeeks : 1;
      let addedCount = 0;

      for (let week = 0; week < weeks; week++) {
        for (const dayIndex of selectedDays) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + dayIndex + week * 7);
          dayDate.setHours(0, 0, 0, 0);

          // Pomiń dni przed dzisiaj (częściowy tydzień bieżący)
          if (dayDate < todayMidnight) continue;

          const start = new Date(dayDate);
          start.setHours(startH, startM, 0, 0);
          const end = new Date(dayDate);
          end.setHours(endH, endM, 0, 0);

          // Jeśli to dziś i godzina już minęła → błąd
          if (dayDate.getTime() === todayMidnight.getTime() && start < now) {
            throw new Error(`Godzina ${startTime} na dziś już minęła — wybierz późniejszą godzinę lub odznacz dzień bieżący`);
          }

          await apiCreateAvailability(user.token, {
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
          });
          addedCount++;
        }
      }

      if (addedCount === 0) {
        throw new Error('Nie dodano żadnych bloków — wszystkie wybrane dni są w przeszłości bieżącego tygodnia');
      }

      toast.success(`Dodano ${addedCount} ${addedCount === 1 ? 'blok' : addedCount < 5 ? 'bloki' : 'bloków'} dostępności`);
      setAddModalOpen(false);
      await fetchAvailabilities(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Nie udało się dodać dostępności');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (avail: AvailabilityDto) => {
    setAvailabilityToDelete(avail);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setAvailabilityToDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!user || !availabilityToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDeleteAvailability(user.token, availabilityToDelete.id);
      toast.success('Dostępność została usunięta');
      await fetchAvailabilities(false);
      closeDeleteModal();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Nie udało się usunąć dostępności');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="panel-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Moja dostępność</h1>
        <button className="dostepnosc-add-btn" onClick={openAddModal}>
          + Dodaj dostępność
        </button>
      </div>

      {error && <div className="dostepnosc-alert dostepnosc-alert--error">{error}</div>}

      <section className="dostepnosc-section dostepnosc-section--scrollable" ref={listRef}>
        <div className="dostepnosc-filters">
          <div className="panel-select">
            <span className="panel-select__label">Pokaż:</span>
            <div className="panel-select__control">
              <select
                className="panel-select__dropdown"
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setOffset(0); }}
              >
                <option value="">Wszystkie</option>
                <option value="upcoming">Nadchodzące</option>
                <option value="past">Przeszłe</option>
              </select>
            </div>
          </div>

          <div className="panel-select">
            <span className="panel-select__label">Sortuj:</span>
            <div className="panel-select__control">
              <select
                className="panel-select__dropdown"
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value as 'ASC' | 'DESC'); setOffset(0); }}
              >
                <option value="ASC">Data rosnąco ↑</option>
                <option value="DESC">Data malejąco ↓</option>
              </select>
            </div>
          </div>
        </div>

        {availabilities.length === 0 && !fetchingList ? (
          <p className="dostepnosc-empty">
            Nie masz jeszcze żadnych bloków dostępności dla wybranego filtra
          </p>
        ) : (
          <>
            {fetchingList && (
              <div className="dostepnosc-list" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Ładowanie...
              </div>
            )}
            {!fetchingList && (
              <div className="dostepnosc-list">
                {availabilities.map((avail) => {
                  const start = new Date(avail.startsAt);
                  const end = new Date(avail.endsAt);
                  return (
                    <div key={avail.id} className="dostepnosc-item">
                      <div className="dostepnosc-item__info">
                        <div className="dostepnosc-item__date">
                          {formatDate(start)} {formatTime(start)} – {formatTime(end)}
                        </div>
                        <div className="dostepnosc-item__duration">
                          {Math.round((end.getTime() - start.getTime()) / 60000)} min
                        </div>
                      </div>
                      <button
                        className="dostepnosc-item__delete"
                        onClick={() => openDeleteModal(avail)}
                      >
                        Usuń
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="panel-pagination">
                <div className="panel-pagination__controls">
                  <button
                    className="panel-pagination__btn panel-pagination__btn--arrow"
                    onClick={() => { setOffset(Math.max(0, offset - limit)); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    disabled={currentPage === 1}
                    aria-label="Poprzednia strona"
                  >
                    ←
                  </button>
                  <span className="panel-pagination__info">Strona {currentPage} z {totalPages}</span>
                  <button
                    className="panel-pagination__btn panel-pagination__btn--arrow"
                    onClick={() => { setOffset(offset + limit); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    disabled={currentPage === totalPages}
                    aria-label="Następna strona"
                  >
                    →
                  </button>
                </div>
                <div className="panel-pagination__per-page">
                  <span className="panel-pagination__per-page-label">Na stronie:</span>
                  <select
                    className="panel-pagination__per-page-select"
                    value={limit}
                    onChange={(e) => { setLimit(parseInt(e.target.value)); setOffset(0); }}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Add Availability Modal */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Dodaj blok dostępności</h3>
              <button className="modal-close" onClick={closeAddModal}>✕</button>
            </div>

            <form onSubmit={handleAddAvailability}>
              <div className="modal-body">
                {formError && (
                  <div className="dostepnosc-alert dostepnosc-alert--error" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}

                <div className="dostepnosc-form__field">
                  <label className="dostepnosc-form__label">Wybierz dni tygodnia</label>
                  <div className="dostepnosc-days">
                    {DAY_NAMES.map((name, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`dostepnosc-day${selectedDays.includes(i) ? ' dostepnosc-day--selected' : ''}`}
                        onClick={() => toggleDay(i)}
                      >
                        <span className="dostepnosc-day__short">{DAY_SHORT[i]}</span>
                        <span className="dostepnosc-day__name">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dostepnosc-form__row">
                  <div className="dostepnosc-form__field">
                    <label className="dostepnosc-form__label">Godzina rozpoczęcia</label>
                    <div className="panel-select__control">
                      <select
                        className="panel-select__dropdown"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      >
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="dostepnosc-form__field">
                    <label className="dostepnosc-form__label">Godzina zakończenia</label>
                    <div className="panel-select__control">
                      <select
                        className="panel-select__dropdown"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      >
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="dostepnosc-form__field">
                  <label className="dostepnosc-form__checkbox-label">
                    <input
                      type="checkbox"
                      className="dostepnosc-form__checkbox"
                      checked={repeat}
                      onChange={(e) => setRepeat(e.target.checked)}
                    />
                    Powtarzaj przez kolejne tygodnie
                  </label>
                </div>

                {repeat && (
                  <div className="dostepnosc-form__field">
                    <label className="dostepnosc-form__label">Liczba tygodni</label>
                    <input
                      type="number"
                      className="dostepnosc-form__input"
                      min="1"
                      max="12"
                      value={repeatWeeks}
                      onChange={(e) => setRepeatWeeks(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                    />
                    <p className="dostepnosc-form__hint">
                      Tydzień 1 – od dziś do niedzieli (minione dni bieżącego tygodnia są pomijane).
                      Kolejne tygodnie – pełne, od poniedziałku.
                      Łącznie do {selectedDays.length * repeatWeeks} bloków.
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-button modal-button--cancel"
                  onClick={closeAddModal}
                  disabled={submitting}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="modal-button modal-button--primary"
                  disabled={submitting || selectedDays.length === 0}
                >
                  {submitting ? 'Dodawanie...' : 'Dodaj dostępność'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && availabilityToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Potwierdź usunięcie</h3>
              <button className="modal-close" onClick={closeDeleteModal}>✕</button>
            </div>
            <div className="modal-body">
              <p>Czy na pewno chcesz usunąć ten blok dostępności?</p>
              <div className="modal-info">
                <strong>{formatDate(new Date(availabilityToDelete.startsAt))}</strong>
                <span>
                  {formatTime(new Date(availabilityToDelete.startsAt))} – {formatTime(new Date(availabilityToDelete.endsAt))}
                </span>
              </div>
              {deleteError && (
                <p className="modal-error">{deleteError}</p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="modal-button modal-button--cancel"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Anuluj
              </button>
              <button
                className="modal-button modal-button--danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Usuwanie...' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

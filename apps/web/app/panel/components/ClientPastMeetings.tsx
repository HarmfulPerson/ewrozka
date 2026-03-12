'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  apiGetCompletedAppointments,
  apiRateAppointment,
  type AppointmentDto,
} from '../../lib/api-calendar';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ClientPastMeetingsProps {
  token: string;
}

const PAGE_SIZE = 5;

export function ClientPastMeetings({ token }: ClientPastMeetingsProps) {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [unratedOnly, setUnratedOnly] = useState(false);
  const [hoverRating, setHoverRating] = useState<Record<number, number>>({});
  const [submittingRating, setSubmittingRating] = useState<number | null>(null);
  const [pendingRating, setPendingRating] = useState<Record<number, { stars: number; comment: string }>>({});

  const fetchData = useCallback(() => {
    setLoading(true);
    apiGetCompletedAppointments(token, {
      limit: PAGE_SIZE,
      offset,
      unratedOnly,
    })
      .then((res) => {
        setAppointments(res.appointments || []);
        setTotal(res.total);
      })
      .catch(() => {
        setAppointments([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [token, offset, unratedOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectStar = (apt: AppointmentDto, stars: number) => {
    setPendingRating((prev) => ({
      ...prev,
      [apt.id]: { stars, comment: prev[apt.id]?.comment ?? '' },
    }));
  };

  const handleSubmitRating = async (apt: AppointmentDto) => {
    const pending = pendingRating[apt.id];
    if (!pending) return;
    setSubmittingRating(apt.id);
    try {
      await apiRateAppointment(token, apt.id, pending.stars, pending.comment || undefined);
      toast.success(
        `Oceniłeś spotkanie na ${pending.stars} ${pending.stars === 1 ? 'gwiazdkę' : pending.stars < 5 ? 'gwiazdki' : 'gwiazdek'}!`,
      );
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, rating: pending.stars } : a)),
      );
      setPendingRating((prev) => {
        const next = { ...prev };
        delete next[apt.id];
        return next;
      });
      if (unratedOnly && total <= 1) fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zapisać oceny');
    } finally {
      setSubmittingRating(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <section className="dashboard__section">
      <div className="dashboard__section-head">
        <h2 className="dashboard__section-title">
          <span className="dashboard__section-icon">✓</span>
          Odbyte spotkania
        </h2>
        <Link href="/panel/moje-spotkania" className="dashboard__section-link">
          Zobacz wszystkie →
        </Link>
      </div>

      <div className="dashboard__past-toolbar">
        <label className="dashboard__past-filter">
          <input
            type="checkbox"
            checked={unratedOnly}
            onChange={(e) => {
              setUnratedOnly(e.target.checked);
              setOffset(0);
            }}
          />
          <span>Nieocenione</span>
        </label>
      </div>

      {loading ? (
        <div className="dashboard__loading">Ładowanie…</div>
      ) : appointments.length === 0 ? (
        <div className="dashboard__empty">
          <span>
            {unratedOnly ? 'Brak nieocenionych spotkań' : 'Brak odbyte spotkań'}
          </span>
        </div>
      ) : (
        <div className="dashboard__table-wrap">
          <table className="dashboard__table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Wróżka</th>
                <th>Oferta</th>
                <th>Ocena</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => {
                const displayRating = hoverRating[apt.id] ?? apt.rating ?? 0;
                const isSubmitting = submittingRating === apt.id;
                const hasPending = !!pendingRating[apt.id];

                return (
                  <tr key={apt.id}>
                    <td>
                      <span className="dashboard__table-date">{formatDate(apt.startsAt)}</span>
                      <span className="dashboard__table-time">{formatTime(apt.startsAt)}</span>
                    </td>
                    <td>{apt.wrozkaUsername || '—'}</td>
                    <td>{apt.advertisementTitle || 'Konsultacja'}</td>
                    <td>
                      {apt.rating != null ? (
                        <div className="dashboard__apt-rating-stars dashboard__apt-rating-stars--inline">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`dashboard__apt-star ${star <= apt.rating! ? 'dashboard__apt-star--filled' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="dashboard__table-rating">
                          <div className="dashboard__apt-rating-stars dashboard__apt-rating-stars--inline">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                disabled={isSubmitting}
                                className={`dashboard__apt-star dashboard__apt-star--btn ${star <= (pendingRating[apt.id]?.stars ?? displayRating) ? 'dashboard__apt-star--filled' : ''}`}
                                onMouseEnter={() =>
                                  setHoverRating((prev) => ({ ...prev, [apt.id]: star }))
                                }
                                onMouseLeave={() =>
                                  setHoverRating((prev) => {
                                    const next = { ...prev };
                                    delete next[apt.id];
                                    return next;
                                  })
                                }
                                onClick={() => handleSelectStar(apt, star)}
                                aria-label={`Oceń na ${star}`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          {hasPending && (
                            <div className="dashboard__table-rating-actions">
                              <textarea
                                className="dashboard__apt-rating-comment"
                                placeholder="Komentarz (opcjonalnie)"
                                rows={1}
                                value={pendingRating[apt.id]?.comment ?? ''}
                                onChange={(e) =>
                                  setPendingRating((prev) => ({
                                    ...prev,
                                    [apt.id]: {
                                      stars: prev[apt.id]?.stars ?? 0,
                                      comment: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <button
                                type="button"
                                className="dashboard__apt-rating-submit"
                                disabled={isSubmitting}
                                onClick={() => handleSubmitRating(apt)}
                              >
                                {isSubmitting ? '…' : 'Zapisz'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && !loading && (
        <div className="dashboard__pagination">
          <button
            type="button"
            className="dashboard__pagination-btn"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={currentPage <= 1}
          >
            ←
          </button>
          <span className="dashboard__pagination-info">
            {currentPage} / {totalPages} ({total})
          </span>
          <button
            type="button"
            className="dashboard__pagination-btn"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={currentPage >= totalPages}
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}

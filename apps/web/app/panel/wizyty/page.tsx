'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetMyAppointments, AppointmentDto } from '../../lib/api-calendar';
import { apiPayForAppointment } from '../../lib/api-meetings';
import './wizyty.css';
import '../panel-shared.css';

export default function WizytyPage() {
  const [user] = useState(() => getStoredUser());
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('upcoming');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetMyAppointments(user.token, {
        filter: filterType || undefined,
        limit,
        offset,
      });
      setAppointments(data.appointments);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować wizyt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user, filterType, offset, limit]);

  const handlePay = async (id: number) => {
    if (!user) return;
    setPayingId(id);
    setError(null);
    setSuccess(null);
    
    try {
      await apiPayForAppointment(user.token, id);
      setSuccess('Płatność została przetworzona! Spotkanie zostało potwierdzone.');
      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się przetworzyć płatności');
    } finally {
      setPayingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; className: string } } = {
      accepted: { label: 'Oczekuje na płatność', className: 'wizyty-status--pending' },
      paid: { label: 'Opłacone', className: 'wizyty-status--paid' },
      completed: { label: 'Zakończone', className: 'wizyty-status--completed' },
    };
    
    const config = statusMap[status] || { label: status, className: '' };
    return <span className={`wizyty-status ${config.className}`}>{config.label}</span>;
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="panel-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Moje wizyty</h1>
        <p className="panel-page__subtitle">
          Tutaj możesz opłacić zaakceptowane konsultacje i zobaczyć nadchodzące spotkania
        </p>
      </div>

      {error && <div className="wizyty-alert wizyty-alert--error">{error}</div>}
      {success && <div className="wizyty-alert wizyty-alert--success">{success}</div>}

      <div className="wizyty-filters">
        <div className="panel-select">
          <span className="panel-select__label">Pokaż:</span>
          <div className="panel-select__control">
            <select
              className="panel-select__dropdown"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">Wszystkie</option>
              <option value="upcoming">Nadchodzące (opłacone)</option>
              <option value="pending">Oczekujące na płatność</option>
              <option value="paid">Opłacone</option>
              <option value="completed">Zakończone</option>
            </select>
          </div>
        </div>
      </div>

      <section className="wizyty-section">
        {appointments.length === 0 ? (
          <div className="wizyty-empty">
            <p>Nie masz jeszcze żadnych wizyt dla wybranego filtra</p>
            <Link href="/ogloszenia" className="wizyty-empty__link">
              Przejdź do wróżek
            </Link>
          </div>
        ) : (
          <>
            <div className="wizyty-list">
              {appointments.map((appointment) => {
                const isPaying = payingId === appointment.id;
                const date = new Date(appointment.startsAt);
                const canPay = appointment.status === 'accepted';
                
                return (
                  <div key={appointment.id} className="wizyty-card">
                    <div className="wizyty-card__header">
                      <div>
                        <h3 className="wizyty-card__title">{appointment.advertisementTitle}</h3>
                        <span className="wizyty-card__wizard">
                          Wróżka: <strong>{appointment.wrozkaUsername}</strong>
                        </span>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>

                    <div className="wizyty-card__body">
                      <div className="wizyty-card__datetime">
                        <div className="wizyty-card__date">
                          📅 {date.toLocaleDateString('pl-PL', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="wizyty-card__time">
                          🕐 {date.toLocaleTimeString('pl-PL', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>

                      <div className="wizyty-card__details">
                        <div className="wizyty-detail">
                          <span className="wizyty-detail__label">Czas trwania:</span>
                          <span className="wizyty-detail__value">{appointment.durationMinutes} minut</span>
                        </div>
                        <div className="wizyty-detail">
                          <span className="wizyty-detail__label">Cena:</span>
                          <span className="wizyty-detail__value wizyty-detail__value--price">
                            {(appointment.priceGrosze / 100).toFixed(2)} zł
                          </span>
                        </div>
                      </div>
                    </div>

                    {canPay && (
                      <div className="wizyty-card__actions">
                        <button
                          className="wizyty-card__button wizyty-card__button--pay"
                          onClick={() => handlePay(appointment.id)}
                          disabled={isPaying}
                        >
                          {isPaying ? 'Przetwarzanie...' : '💳 Zapłać teraz'}
                        </button>
                      </div>
                    )}

                    {appointment.status === 'paid' && appointment.meetingToken && (
                      <div className="wizyty-card__meeting">
                        <div className="wizyty-card__meeting-header">
                          <span className="wizyty-card__meeting-label">Link do spotkania:</span>
                          <Link
                            href={`/spotkanie/${appointment.meetingToken}`}
                            className="wizyty-card__meeting-link"
                            target="_blank"
                          >
                            🎥 Dołącz do spotkania
                          </Link>
                        </div>
                        <div className="wizyty-card__meeting-token">
                          Token: <code>{appointment.meetingToken}</code>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="panel-pagination">
                <div className="panel-pagination__controls">
                  <button
                    className="panel-pagination__btn"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={currentPage === 1}
                  >
                    ← Poprzednia
                  </button>
                  <span className="panel-pagination__info">
                    Strona {currentPage} z {totalPages}
                  </span>
                  <button
                    className="panel-pagination__btn"
                    onClick={() => setOffset(offset + limit)}
                    disabled={currentPage === totalPages}
                  >
                    Następna →
                  </button>
                </div>
                
                <div className="panel-pagination__per-page">
                  <span className="panel-pagination__per-page-label">Na stronie:</span>
                  <select
                    className="panel-pagination__per-page-select"
                    value={limit}
                    onChange={(e) => handleLimitChange(parseInt(e.target.value))}
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
    </div>
  );
}

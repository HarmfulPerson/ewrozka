'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetMyClientRequests, MeetingRequestDto } from '../../lib/api-meetings';
import './moje-wnioski.css';
import '../panel-shared.css';

export default function MojeWnioskiPage() {
  const [user] = useState(() => getStoredUser());
  const [requests, setRequests] = useState<MeetingRequestDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetMyClientRequests(user.token, {
        status: statusFilter || undefined,
        limit,
        offset,
      });
      setRequests(data.requests);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować wniosków');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, statusFilter, offset, limit]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Oczekuje na akceptację',
      accepted: 'Zaakceptowane',
      rejected: 'Odrzucone',
    };
    return labels[status] || status;
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
  };

  if (loading && requests.length === 0) {
    return (
      <div className="panel-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Moje wnioski</h1>
        <p className="panel-page__subtitle">
          Tutaj możesz śledzić status swoich wniosków o konsultacje
        </p>
      </div>

      {error && <div className="moje-wnioski-alert moje-wnioski-alert--error">{error}</div>}

      <div className="moje-wnioski-filters">
        <div className="panel-select">
          <span className="panel-select__label">Status:</span>
          <div className="panel-select__control">
            <select
              className="panel-select__dropdown"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">Wszystkie</option>
              <option value="pending">Oczekujące na akceptację</option>
              <option value="accepted">Zaakceptowane</option>
              <option value="rejected">Odrzucone</option>
            </select>
          </div>
        </div>
      </div>

      <section className="moje-wnioski-section">
        {requests.length === 0 ? (
          <div className="moje-wnioski-empty">
            <p>Nie masz jeszcze żadnych wniosków o spotkanie</p>
            <Link href="/ogloszenia" className="moje-wnioski-empty__link">
              Przejdź do wróżek
            </Link>
          </div>
        ) : (
          <>
            <div className="moje-wnioski-list">
              {requests.map((request) => {
                const date = request.requestedStartsAt ? new Date(request.requestedStartsAt) : null;
                
                return (
                  <div key={request.id} className="moje-wnioski-card">
                    <div className="moje-wnioski-card__header">
                      <div>
                        <h3 className="moje-wnioski-card__title">{request.advertisementTitle}</h3>
                        <span className="moje-wnioski-card__wrozka">
                          Wróżka: <strong>{request.wrozkaUsername}</strong>
                        </span>
                      </div>
                      <span className={`moje-wnioski-card__status moje-wnioski-card__status--${request.status}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </div>

                    <div className="moje-wnioski-card__body">
                      {date ? (
                        <div className="moje-wnioski-card__datetime">
                          <div className="moje-wnioski-card__date">
                            📅 {date.toLocaleDateString('pl-PL', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="moje-wnioski-card__time">
                            🕐 {date.toLocaleTimeString('pl-PL', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="moje-wnioski-card__no-date">
                          Data do ustalenia
                        </div>
                      )}

                      {request.message && (
                        <div className="moje-wnioski-card__message">
                          <strong>Twoja wiadomość:</strong> {request.message}
                        </div>
                      )}

                      {request.createdAt && (
                        <div className="moje-wnioski-card__created">
                          Wysłano: {new Date(request.createdAt).toLocaleString('pl-PL')}
                        </div>
                      )}

                      {request.status === 'accepted' && (
                        <div className="moje-wnioski-card__info">
                          ℹ️ Wniosek został zaakceptowany. Przejdź do "Moje wizyty", aby opłacić konsultację.
                        </div>
                      )}
                    </div>
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

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetMyAppointments, apiRateAppointment, AppointmentDto } from '../../lib/api-calendar';
import { apiGetMyClientRequests } from '../../lib/api-meetings';
import { PaymentModal } from '../../components/payment/PaymentModal';
import './moje-spotkania.css';
import '../panel-shared.css';

type MeetingItem = {
  type: 'request' | 'appointment';
  id: number;
  title: string;
  wrozkaUsername: string;
  date: Date | null;
  status: string;
  priceGrosze?: number;
  durationMinutes?: number;
  meetingToken?: string | null;
  message?: string;
  createdAt?: Date;
  rating?: number | null;
};

export default function MojeSpotkania() {
  const [user] = useState(() => getStoredUser());
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);

  // Stan gwiazdek: { [appointmentId]: hoveredStar }
  const [hoverRating, setHoverRating] = useState<Record<number, number>>({});
  const [submittingRating, setSubmittingRating] = useState<number | null>(null);
  // Pending ocena (wybrane gwiazdki + komentarz przed zapisem)
  const [pendingRating, setPendingRating] = useState<Record<number, { stars: number; comment: string }>>({});

  // Modal płatności
  const [paymentModal, setPaymentModal] = useState<{
    appointmentId: number;
    amountZl: string;
    title: string;
  } | null>(null);

  const canJoinMeeting = (startsAt: Date): { canJoin: boolean; reason?: string } => {
    const now = new Date();
    const meetingStart = new Date(startsAt);
    const fiveMinutesBefore = new Date(meetingStart.getTime() - 5 * 60 * 1000);
    const meetingEnd = new Date(meetingStart.getTime() + 60 * 60 * 1000);

    if (now > meetingEnd) {
      return { canJoin: false, reason: 'Spotkanie się zakończyło' };
    }

    if (now < fiveMinutesBefore) {
      const timeUntil = Math.floor((fiveMinutesBefore.getTime() - now.getTime()) / 1000 / 60);
      return {
        canJoin: false,
        reason: `Dostępne za ${timeUntil} min (5 min przed rozpoczęciem)`,
      };
    }

    return { canJoin: true };
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [requestsData, appointmentsData] = await Promise.all([
        apiGetMyClientRequests(user.token, { limit: 100 }),
        apiGetMyAppointments(user.token, { limit: 100 }),
      ]);

      const requestItems: MeetingItem[] = requestsData.requests
        .filter((req) => req.status !== 'accepted')
        .map((req) => ({
          type: 'request' as const,
          id: req.id,
          title: req.advertisementTitle || 'Konsultacja',
          wrozkaUsername: req.wrozkaUsername || 'Wróżka',
          date: req.requestedStartsAt ? new Date(req.requestedStartsAt) : null,
          status: req.status,
          message: req.message,
          createdAt: req.createdAt ? new Date(req.createdAt) : undefined,
        }));

      const appointmentItems: MeetingItem[] = appointmentsData.appointments.map((apt) => ({
        type: 'appointment' as const,
        id: apt.id,
        title: apt.advertisementTitle || 'Konsultacja',
        wrozkaUsername: apt.wrozkaUsername || 'Wróżka',
        date: new Date(apt.startsAt),
        status: apt.status,
        priceGrosze: apt.priceGrosze,
        durationMinutes: apt.durationMinutes,
        meetingToken: apt.meetingToken,
        rating: apt.rating,
      }));

      let allItems = [...requestItems, ...appointmentItems];

      if (filterType === 'pending') {
        allItems = allItems.filter(
          (item) => item.type === 'request' && item.status === 'pending',
        );
      } else if (filterType === 'accepted') {
        allItems = allItems.filter(
          (item) => item.type === 'appointment' && item.status === 'accepted',
        );
      } else if (filterType === 'paid') {
        allItems = allItems.filter(
          (item) => item.type === 'appointment' && item.status === 'paid',
        );
      } else if (filterType === 'completed') {
        allItems = allItems.filter(
          (item) => item.type === 'appointment' && item.status === 'completed',
        );
      }

      allItems.sort((a, b) => {
        const dateA = a.date || a.createdAt || new Date(0);
        const dateB = b.date || b.createdAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setTotal(allItems.length);
      setItems(allItems.slice(offset, offset + limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterType, offset, limit]);

  const handlePay = (item: MeetingItem) => {
    setPaymentModal({
      appointmentId: item.id,
      amountZl: item.priceGrosze ? `${(item.priceGrosze / 100).toFixed(2)} zł` : 'Płatność',
      title: item.title,
    });
  };

  const handlePaymentSuccess = (paidAppointmentId: number) => {
    setPaymentModal(null);
    toast.success('Płatność zakończona pomyślnie!');
    // Natychmiastowa aktualizacja UI — nie czekamy na fetchData
    setItems((prev) =>
      prev.map((item) =>
        item.type === 'appointment' && item.id === paidAppointmentId
          ? { ...item, status: 'paid' }
          : item,
      ),
    );
    // Pełna synchronizacja z serwerem w tle
    fetchData();
  };

  const handleSelectStar = (item: MeetingItem, stars: number) => {
    setPendingRating((prev) => ({
      ...prev,
      [item.id]: { stars, comment: prev[item.id]?.comment ?? '' },
    }));
  };

  const handleSubmitRating = async (item: MeetingItem) => {
    if (!user) return;
    const pending = pendingRating[item.id];
    if (!pending) return;
    setSubmittingRating(item.id);
    try {
      await apiRateAppointment(user.token, item.id, pending.stars, pending.comment || undefined);
      toast.success(`Oceniłeś spotkanie na ${pending.stars} ${pending.stars === 1 ? 'gwiazdkę' : pending.stars < 5 ? 'gwiazdki' : 'gwiazdek'}!`);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id && i.type === 'appointment' ? { ...i, rating: pending.stars } : i)),
      );
      setPendingRating((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zapisać oceny');
    } finally {
      setSubmittingRating(null);
    }
  };

  const getStatusInfo = (item: MeetingItem) => {
    if (item.type === 'request') {
      const statusMap: Record<string, { label: string; className: string }> = {
        pending: { label: 'Oczekuje na akceptację', className: 'moje-spotkania-status--pending' },
        accepted: { label: 'Zaakceptowane', className: 'moje-spotkania-status--accepted' },
        rejected: { label: 'Odrzucone', className: 'moje-spotkania-status--rejected' },
      };
      return statusMap[item.status] || { label: item.status, className: '' };
    } else {
      const statusMap: Record<string, { label: string; className: string }> = {
        accepted: { label: 'Do opłacenia', className: 'moje-spotkania-status--to-pay' },
        paid: { label: 'Opłacone', className: 'moje-spotkania-status--paid' },
        completed: { label: 'Zakończone', className: 'moje-spotkania-status--completed' },
      };
      return statusMap[item.status] || { label: item.status, className: '' };
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
  };

  if (loading && items.length === 0) {
    return (
      <div className="panel-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <div>
          <h1 className="panel-page__title">Moje spotkania</h1>
          <p className="panel-page__subtitle">
            Tutaj znajdziesz wszystkie swoje wnioski o konsultacje i umówione spotkania
          </p>
        </div>
      </div>

      {error && <div className="moje-spotkania-alert moje-spotkania-alert--error">{error}</div>}

      <div className="moje-spotkania-filters">
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
              <option value="pending">Oczekujące na akceptację</option>
              <option value="accepted">Do opłacenia</option>
              <option value="paid">Opłacone</option>
              <option value="completed">Zakończone</option>
            </select>
          </div>
        </div>
      </div>

      <section className="moje-spotkania-section">
        {items.length === 0 ? (
          <div className="moje-spotkania-empty">
            <p>Nie masz jeszcze żadnych spotkań dla wybranego filtra</p>
            <Link href="/ogloszenia" className="moje-spotkania-empty__link">
              Przejdź do wróżek
            </Link>
          </div>
        ) : (
          <>
            <div className="moje-spotkania-list">
              {items.map((item) => {
                const isPaying = paymentModal?.appointmentId === item.id;
                const statusInfo = getStatusInfo(item);
                const canPay = item.type === 'appointment' && item.status === 'accepted';
                const hasToken =
                  item.type === 'appointment' && item.status === 'paid' && item.meetingToken;
                const meetingAccess =
                  hasToken && item.date ? canJoinMeeting(item.date) : { canJoin: false };
                const isCompleted = item.type === 'appointment' && item.status === 'completed';
                const currentHover = hoverRating[item.id] ?? 0;
                const displayRating = currentHover || item.rating || 0;
                const isSubmitting = submittingRating === item.id;

                return (
                  <div key={`${item.type}-${item.id}`} className="moje-spotkania-card">
                    <div className="moje-spotkania-card__header">
                      <div>
                        <h3 className="moje-spotkania-card__title">{item.title}</h3>
                        <span className="moje-spotkania-card__wrozka">
                          Wróżka: <strong>{item.wrozkaUsername}</strong>
                        </span>
                      </div>
                      <span className={`moje-spotkania-status ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="moje-spotkania-card__body">
                      {item.date ? (
                        <div className="moje-spotkania-card__datetime">
                          <div className="moje-spotkania-card__date">
                            📅{' '}
                            {item.date.toLocaleDateString('pl-PL', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="moje-spotkania-card__time">
                            🕐{' '}
                            {item.date.toLocaleTimeString('pl-PL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="moje-spotkania-card__no-date">Data do ustalenia</div>
                      )}

                      {item.type === 'appointment' &&
                        item.durationMinutes &&
                        item.priceGrosze !== undefined && (
                          <div className="moje-spotkania-card__details">
                            <div className="moje-spotkania-detail">
                              <span className="moje-spotkania-detail__label">Czas trwania:</span>
                              <span className="moje-spotkania-detail__value">
                                {item.durationMinutes} minut
                              </span>
                            </div>
                            <div className="moje-spotkania-detail">
                              <span className="moje-spotkania-detail__label">Cena:</span>
                              <span className="moje-spotkania-detail__value moje-spotkania-detail__value--price">
                                {(item.priceGrosze / 100).toFixed(2)} zł
                              </span>
                            </div>
                          </div>
                        )}

                      {item.message && (
                        <div className="moje-spotkania-card__message">
                          <strong>Twoja wiadomość:</strong> {item.message}
                        </div>
                      )}

                      {item.createdAt && item.type === 'request' && (
                        <div className="moje-spotkania-card__created">
                          Wysłano: {item.createdAt.toLocaleString('pl-PL')}
                        </div>
                      )}
                    </div>

                    {canPay && (
                      <div className="moje-spotkania-card__actions">
                        <button
                          className="moje-spotkania-card__button moje-spotkania-card__button--pay"
                          onClick={() => handlePay(item)}
                          disabled={isPaying}
                        >
                          💳 Zapłać teraz
                        </button>
                      </div>
                    )}

                    {hasToken && (
                      <div className="moje-spotkania-card__actions">
                        {meetingAccess.canJoin ? (
                          <Link
                            href={`/spotkanie/${item.meetingToken}`}
                            className="moje-spotkania-card__button moje-spotkania-card__button--meeting"
                          >
                            🎥 Dołącz do spotkania
                          </Link>
                        ) : (
                          <div className="moje-spotkania-card__meeting-wrapper">
                            <div className="moje-spotkania-card__button moje-spotkania-card__button--meeting-disabled">
                              🎥 Dołącz do spotkania
                            </div>
                            <div className="moje-spotkania-tooltip">
                              <span className="moje-spotkania-tooltip__icon">ℹ</span>
                              <span className="moje-spotkania-tooltip__text">
                                {meetingAccess.reason}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {isCompleted && (
                      <div className="moje-spotkania-card__rating">
                        {item.rating != null ? (
                          <div className="moje-spotkania-rating">
                            <span className="moje-spotkania-rating__label">Twoja ocena:</span>
                            <div className="moje-spotkania-rating__stars moje-spotkania-rating__stars--static">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`moje-spotkania-star moje-spotkania-star--static ${star <= item.rating! ? 'moje-spotkania-star--filled' : ''}`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="moje-spotkania-rating">
                            <span className="moje-spotkania-rating__label">
                              Oceń spotkanie:
                            </span>
                            <div className="moje-spotkania-rating__stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  disabled={isSubmitting}
                                  className={`moje-spotkania-star ${star <= (pendingRating[item.id]?.stars ?? displayRating) ? 'moje-spotkania-star--filled' : ''}`}
                                  onMouseEnter={() =>
                                    setHoverRating((prev) => ({ ...prev, [item.id]: star }))
                                  }
                                  onMouseLeave={() =>
                                    setHoverRating((prev) => {
                                      const next = { ...prev };
                                      delete next[item.id];
                                      return next;
                                    })
                                  }
                                  onClick={() => handleSelectStar(item, star)}
                                  aria-label={`Oceń na ${star}`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            {pendingRating[item.id] && (
                              <div className="moje-spotkania-rating__comment-wrap">
                                <textarea
                                  className="moje-spotkania-rating__comment"
                                  placeholder="Dodaj komentarz (opcjonalnie)..."
                                  rows={2}
                                  value={pendingRating[item.id].comment}
                                  onChange={(e) =>
                                    setPendingRating((prev) => ({
                                      ...prev,
                                      [item.id]: { ...prev[item.id], comment: e.target.value },
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  className="moje-spotkania-rating__submit"
                                  disabled={isSubmitting}
                                  onClick={() => handleSubmitRating(item)}
                                >
                                  {isSubmitting ? 'Zapisywanie…' : 'Zapisz ocenę'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
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

      {paymentModal && user && (
        <PaymentModal
          token={user.token}
          appointmentId={paymentModal.appointmentId}
          amountZl={paymentModal.amountZl}
          title={paymentModal.title}
          onClose={() => setPaymentModal(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useWizyty } from './useWizyty';
import { WizytyCard } from './WizytyCard';
import './wizyty.css';
import '../panel-shared.css';

export default function WizytyPage() {
  const {
    appointments,
    loading,
    error,
    success,
    payingId,
    filterType,
    offset,
    limit,
    totalPages,
    currentPage,
    setOffset,
    handlePay,
    handleLimitChange,
    handleFilterChange,
  } = useWizyty();

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
              onChange={(e) => handleFilterChange(e.target.value)}
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
              {appointments.map((appointment) => (
                <WizytyCard
                  key={appointment.id}
                  appointment={appointment}
                  payingId={payingId}
                  onPay={handlePay}
                />
              ))}
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

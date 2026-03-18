'use client';

import Link from 'next/link';
import { useMojeWnioski } from './useMojeWnioski';
import { WnioskiCard } from './WnioskiCard';
import './moje-wnioski.css';
import '../panel-shared.css';

export default function MojeWnioskiPage() {
  const {
    requests,
    loading,
    error,
    statusFilter,
    offset,
    limit,
    totalPages,
    currentPage,
    setOffset,
    handleLimitChange,
    handleStatusFilterChange,
  } = useMojeWnioski();

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
              onChange={(e) => handleStatusFilterChange(e.target.value)}
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
              {requests.map((request) => (
                <WnioskiCard key={request.id} request={request} />
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

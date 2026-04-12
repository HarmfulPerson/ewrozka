'use client';

import { TransactionDto } from '../../lib/api-payment';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface TransactionHistoryProps {
  listLoading: boolean;
  transactions: TransactionDto[];
  sortBy: 'date' | 'amount';
  setSortBy: (v: 'date' | 'amount') => void;
  sortOrder: 'ASC' | 'DESC';
  setSortOrder: (v: 'ASC' | 'DESC') => void;
  limit: number;
  setLimit: (v: number) => void;
  offset: number;
  setOffset: (v: number) => void;
  currentPage: number;
  totalPages: number;
  total: number;
}

export function TransactionHistory({
  listLoading,
  transactions,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  limit,
  setLimit,
  offset,
  setOffset,
  currentPage,
  totalPages,
  total,
}: TransactionHistoryProps) {
  return (
    <div className="portfel-history">
      <div className="portfel-history__head">
        <h2 className="portfel-history__title">Historia wpływów</h2>
        <div className="portfel-history__filters">
          <div className="panel-select">
            <span className="panel-select__label">Sortuj:</span>
            <div className="panel-select__control">
              <select
                className="panel-select__dropdown"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as 'date' | 'amount'); setOffset(0); }}
              >
                <option value="date">Data</option>
                <option value="amount">Kwota</option>
              </select>
            </div>
          </div>
          <div className="panel-select">
            <div className="panel-select__control">
              <select
                className="panel-select__dropdown"
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value as 'ASC' | 'DESC'); setOffset(0); }}
              >
                <option value="DESC">Malejąco ↓</option>
                <option value="ASC">Rosnąco ↑</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {listLoading ? (
        <div className="panel-inline-spinner"><span className="panel-spinner" /></div>
      ) : transactions.length === 0 ? (
        <div className="portfel-empty">Brak transakcji</div>
      ) : (
        <>
          <div className="portfel-history__list">
            {transactions.map((t) => (
              <div key={t.uid} className="portfel-history__row">
                <span className="portfel-history__amount">
                  +{(t.wizardAmount / 100).toFixed(2)} zł
                </span>
                <span className="portfel-history__title-text">
                  {t.advertisementTitle || 'Konsultacja'}
                </span>
                <span className="portfel-history__date">{formatDate(t.createdAt)}</span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="panel-pagination">
              <div className="panel-pagination__controls">
                <button className="panel-pagination__btn" onClick={() => setOffset(offset - limit)} disabled={offset === 0}>← Poprzednia</button>
                <span className="panel-pagination__info">Strona {currentPage} z {totalPages}</span>
                <button className="panel-pagination__btn" onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}>Następna →</button>
              </div>
              <div className="panel-pagination__per-page">
                <span className="panel-pagination__per-page-label">Na stronie:</span>
                <select className="panel-pagination__per-page-select" value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

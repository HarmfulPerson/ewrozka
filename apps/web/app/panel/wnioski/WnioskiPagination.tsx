'use client';

import { PAGE_SIZES } from './types';

interface WnioskiPaginationProps {
  total: number;
  offset: number;
  limit: number;
  currentPage: number;
  totalPages: number;
  onOffsetChange: (offset: number) => void;
  onLimitChange: (limit: number) => void;
}

export function WnioskiPagination({
  total, offset, limit, currentPage, totalPages,
  onOffsetChange, onLimitChange,
}: WnioskiPaginationProps) {
  return (
    <div className="wnioski-pagination">
      <div className="wnioski-pagination__per-page">
        <span className="wnioski-pagination__label">Wierszy:</span>
        <select
          className="wnioski-pagination__select"
          value={limit}
          onChange={e => { onLimitChange(Number(e.target.value)); onOffsetChange(0); }}
        >
          {PAGE_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="wnioski-pagination__nav">
        <button className="wnioski-pagination__btn"
          onClick={() => onOffsetChange(0)}
          disabled={currentPage === 1}>
          «
        </button>
        <button className="wnioski-pagination__btn"
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          disabled={currentPage === 1}>
          ‹
        </button>

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
              <button
                key={item}
                className={`wnioski-pagination__btn${item === currentPage ? ' wnioski-pagination__btn--active' : ''}`}
                onClick={() => onOffsetChange((item - 1) * limit)}
              >
                {item}
              </button>
            )
          )}

        <button className="wnioski-pagination__btn"
          onClick={() => onOffsetChange(offset + limit)}
          disabled={currentPage === totalPages}>
          ›
        </button>
        <button className="wnioski-pagination__btn"
          onClick={() => onOffsetChange((totalPages - 1) * limit)}
          disabled={currentPage === totalPages}>
          »
        </button>
      </div>

      <span className="wnioski-pagination__info">
        {total > 0 ? `${offset + 1}–${Math.min(offset + limit, total)} z ${total}` : '0 z 0'}
      </span>
    </div>
  );
}

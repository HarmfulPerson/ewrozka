'use client';

const PAGE_SIZES = [10, 20, 50, 100];

interface MeetingsPaginationProps {
  total: number;
  offset: number;
  setOffset: (v: number) => void;
  limit: number;
  setLimit: (v: number) => void;
  currentPage: number;
  totalPages: number;
}

export function MeetingsPagination({
  total,
  offset,
  setOffset,
  limit,
  setLimit,
  currentPage,
  totalPages,
}: MeetingsPaginationProps) {
  return (
    <div className="wnioski-pagination">
      <div className="wnioski-pagination__per-page">
        <span className="wnioski-pagination__label">Wierszy:</span>
        <select
          className="wnioski-pagination__select"
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setOffset(0); }}
        >
          {PAGE_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="wnioski-pagination__nav">
        <button className="wnioski-pagination__btn"
          onClick={() => setOffset(0)}
          disabled={currentPage === 1}>«</button>
        <button className="wnioski-pagination__btn"
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={currentPage === 1}>‹</button>

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
                onClick={() => setOffset((item - 1) * limit)}
              >{item}</button>
            )
          )}

        <button className="wnioski-pagination__btn"
          onClick={() => setOffset(offset + limit)}
          disabled={currentPage === totalPages}>›</button>
        <button className="wnioski-pagination__btn"
          onClick={() => setOffset((totalPages - 1) * limit)}
          disabled={currentPage === totalPages}>»</button>
      </div>

      <span className="wnioski-pagination__info">
        {total > 0 ? `${offset + 1}–${Math.min(offset + limit, total)} z ${total}` : '0 z 0'}
      </span>
    </div>
  );
}

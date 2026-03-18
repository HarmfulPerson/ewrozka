'use client';

export function SortArrow({ col, sortBy, sortOrder }: { col: string; sortBy: string; sortOrder: 'ASC' | 'DESC' }) {
  return (
    <span className={`wnioski-sort-arrow${sortBy === col ? ' wnioski-sort-arrow--active' : ''}`}>
      {sortBy === col ? (sortOrder === 'ASC' ? '▲' : '▼') : '▼'}
    </span>
  );
}

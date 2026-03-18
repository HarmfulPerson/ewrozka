'use client';

import { FILTER_OPTIONS } from './types';

interface WnioskiFiltersProps {
  statusFilter: string;
  onFilterChange: (value: string) => void;
}

export function WnioskiFilters({ statusFilter, onFilterChange }: WnioskiFiltersProps) {
  return (
    <div className="wnioski-toolbar">
      <div className="wnioski-filters">
        {FILTER_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            className={`wnioski-filter-btn${statusFilter === value ? ' wnioski-filter-btn--active' : ''}`}
            onClick={() => onFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

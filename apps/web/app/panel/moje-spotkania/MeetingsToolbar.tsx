'use client';

const FILTER_OPTIONS = [
  ['', 'Wszystkie'],
  ['pending', 'Oczekujące'],
  ['accepted', 'Do opłacenia'],
  ['paid', 'Opłacone'],
  ['completed', 'Zakończone'],
  ['cancelled', 'Anulowane'],
] as const;

interface MeetingsToolbarProps {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  setOffset: (v: number) => void;
}

export function MeetingsToolbar({ statusFilter, setStatusFilter, setOffset }: MeetingsToolbarProps) {
  return (
    <div className="wnioski-toolbar">
      <div className="wnioski-filters">
        {FILTER_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            className={`wnioski-filter-btn${statusFilter === value ? ' wnioski-filter-btn--active' : ''}`}
            onClick={() => { setStatusFilter(value); setOffset(0); }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

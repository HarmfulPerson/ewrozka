'use client';

import { AvailabilityDto } from '../../lib/api-calendar';
import { fmtDate, fmtTime } from './constants';

interface AvailabilityTableProps {
  availabilities: AvailabilityDto[];
  sortOrder: 'ASC' | 'DESC';
  toggleSort: () => void;
  onDelete: (avail: AvailabilityDto) => void;
}

export function AvailabilityTable({ availabilities, sortOrder, toggleSort, onDelete }: AvailabilityTableProps) {
  if (availabilities.length === 0) {
    return <p className="wnioski-empty">Brak bloków dostępności dla wybranego filtra</p>;
  }

  return (
    <table className="wnioski-table">
      <thead>
        <tr>
          <th data-sortable onClick={toggleSort}>
            <span className="wnioski-th-inner">
              Data
              <span className={`wnioski-sort-arrow wnioski-sort-arrow--active`}>
                {sortOrder === 'ASC' ? '▲' : '▼'}
              </span>
            </span>
          </th>
          <th>Godziny</th>
          <th>Czas trwania</th>
          <th style={{ width: 100 }}>Akcje</th>
        </tr>
      </thead>
      <tbody>
        {availabilities.map(avail => {
          const start = new Date(avail.startsAt);
          const end = new Date(avail.endsAt);
          const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
          const isPast = end < new Date();

          return (
            <tr key={avail.uid} style={isPast ? { opacity: 0.5 } : undefined}>
              <td>
                <span className="wnioski-cell-client">{fmtDate(start)}</span>
              </td>
              <td className="wnioski-cell-date">
                {fmtTime(start)} – {fmtTime(end)}
              </td>
              <td>
                {durationMin >= 60
                  ? `${Math.floor(durationMin / 60)} h${durationMin % 60 > 0 ? ` ${durationMin % 60} min` : ''}`
                  : `${durationMin} min`
                }
              </td>
              <td>
                <button
                  className="wnioski-btn wnioski-btn--reject"
                  onClick={() => onDelete(avail)}
                >
                  Usuń
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

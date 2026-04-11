'use client';

import Image from 'next/image';
import { getUploadUrl } from '../../../lib/api';
import type { AdminWizardRow, AdminWizardsSortBy } from '../../../lib/api-admin';

const SORT_OPTIONS: { value: AdminWizardsSortBy; label: string }[] = [
  { value: 'pendingVideo', label: 'Filmik do akceptacji' },
  { value: 'name', label: 'Nazwa' },
  { value: 'joinDate', label: 'Data dołączenia' },
  { value: 'earnedGrosze', label: 'Zarobione' },
  { value: 'meetingsCount', label: 'Spotkania' },
  { value: 'announcementsCount', label: 'Ogłoszenia' },
];

const formatGrosze = (g: number) => `${(g / 100).toFixed(2)} zł`;
const formatDate = (s: string) => new Date(s).toLocaleDateString('pl-PL');

export function WizardsFilters({
  meetingsMin,
  setMeetingsMin,
  meetingsMax,
  setMeetingsMax,
  earnedMinZl,
  setEarnedMinZl,
  earnedMaxZl,
  setEarnedMaxZl,
  availableNow,
  setAvailableNow,
  onApply,
}: {
  meetingsMin: string;
  setMeetingsMin: (v: string) => void;
  meetingsMax: string;
  setMeetingsMax: (v: string) => void;
  earnedMinZl: string;
  setEarnedMinZl: (v: string) => void;
  earnedMaxZl: string;
  setEarnedMaxZl: (v: string) => void;
  availableNow: boolean;
  setAvailableNow: (v: boolean) => void;
  onApply: () => void;
}) {
  return (
    <div className="aw-filters">
      <div className="aw-filters__row">
        <label className="aw-filters__label">
          Spotkania min
          <input
            type="number"
            min={0}
            className="aw-filters__input aw-filters__input--no-spinner"
            value={meetingsMin}
            onChange={(e) => setMeetingsMin(e.target.value)}
          />
        </label>
        <label className="aw-filters__label">
          Spotkania max
          <input
            type="number"
            min={0}
            className="aw-filters__input aw-filters__input--no-spinner"
            value={meetingsMax}
            onChange={(e) => setMeetingsMax(e.target.value)}
          />
        </label>
        <label className="aw-filters__label">
          Zarobione min (zł)
          <input
            type="text"
            inputMode="decimal"
            className="aw-filters__input aw-filters__input--no-spinner"
            placeholder="0"
            value={earnedMinZl}
            onChange={(e) => setEarnedMinZl(e.target.value)}
          />
        </label>
        <label className="aw-filters__label">
          Zarobione max (zł)
          <input
            type="text"
            inputMode="decimal"
            className="aw-filters__input aw-filters__input--no-spinner"
            placeholder="0"
            value={earnedMaxZl}
            onChange={(e) => setEarnedMaxZl(e.target.value)}
          />
        </label>
        <label className="aw-filters__label aw-filters__label--checkbox">
          Dostępna teraz
          <span className="aw-filters__checkbox-wrap">
            <input
              type="checkbox"
              className="aw-filters__checkbox"
              checked={availableNow}
              onChange={(e) => setAvailableNow(e.target.checked)}
            />
          </span>
        </label>
        <button className="aw-filters__btn" onClick={onApply}>
          Filtruj
        </button>
      </div>
    </div>
  );
}

export function WizardsSortBar({
  sortBy,
  onSort,
}: {
  sortBy: AdminWizardsSortBy;
  onSort: (col: AdminWizardsSortBy) => void;
}) {
  return (
    <div className="aw-sort">
      <span className="aw-sort__label">Sortuj:</span>
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`aw-sort__btn ${sortBy === opt.value ? 'aw-sort__btn--active' : ''}`}
          onClick={() => onSort(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function WizardsTable({
  data,
  onRowClick,
}: {
  data: AdminWizardRow[];
  onRowClick: (uid: string) => void;
}) {
  return (
    <div className="aw-table-wrap">
      <table className="aw-table">
        <thead>
          <tr>
            <th>Wróżka</th>
            <th>Dołączyła</th>
            <th>Spotkania</th>
            <th>Zarobione</th>
            <th>Ogłoszenia</th>
            <th>Filmik</th>
            <th>Dostępna</th>
            <th>Wyróżniona</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className="aw-table__row"
              onClick={() => onRowClick(row.uid)}
            >
              <td>
                <div className="aw-table__wizard">
                  <div className="aw-table__avatar">
                    {row.image ? (
                      <Image
                        src={getUploadUrl(row.image)}
                        alt={row.username}
                        fill
                        className="aw-table__avatar-img"
                      />
                    ) : (
                      <span className="aw-table__avatar-letter">
                        {row.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="aw-table__name">{row.username}</div>
                    <div className="aw-table__email">{row.email}</div>
                  </div>
                </div>
              </td>
              <td>{formatDate(row.createdAt)}</td>
              <td>{row.meetingsCount}</td>
              <td>{formatGrosze(row.earnedGrosze)}</td>
              <td>{row.announcementsCount}</td>
              <td>
                {row.hasPendingVideo ? (
                  <span className="aw-table__pending-video" title="Filmik do akceptacji">🎬</span>
                ) : (
                  '—'
                )}
              </td>
              <td>{row.isAvailableNow ? '✓' : '—'}</td>
              <td>{row.isFeatured ? '✦' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WizardsPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="aw-pagination">
      <button
        className="aw-pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ←
      </button>
      <span className="aw-pagination__info">
        Strona {page} z {totalPages}
        <span className="aw-pagination__total"> ({total} wróżek)</span>
      </span>
      <button
        className="aw-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        →
      </button>
    </div>
  );
}

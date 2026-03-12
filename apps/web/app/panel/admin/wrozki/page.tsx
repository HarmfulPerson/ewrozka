'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getStoredUser } from '../../../lib/auth-mock';
import { getUploadUrl } from '../../../lib/api';
import {
  apiGetAdminWizards,
  type AdminWizardRow,
  type AdminWizardsFilters,
  type AdminWizardsSortBy,
} from '../../../lib/api-admin';
import '../../panel-shared.css';
import './wrozki.css';

const SORT_OPTIONS: { value: AdminWizardsSortBy; label: string }[] = [
  { value: 'pendingVideo', label: 'Filmik do akceptacji' },
  { value: 'name', label: 'Nazwa' },
  { value: 'joinDate', label: 'Data dołączenia' },
  { value: 'earnedGrosze', label: 'Zarobione' },
  { value: 'meetingsCount', label: 'Spotkania' },
  { value: 'announcementsCount', label: 'Ogłoszenia' },
];

const LIMIT = 10;

export default function AdminWrozkiPage() {
  const router = useRouter();
  const [user] = useState(() => getStoredUser());
  const [data, setData] = useState<AdminWizardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminWizardsFilters>({});
  const [meetingsMin, setMeetingsMin] = useState('');
  const [meetingsMax, setMeetingsMax] = useState('');
  const [earnedMinZl, setEarnedMinZl] = useState('');
  const [earnedMaxZl, setEarnedMaxZl] = useState('');
  const [availableNow, setAvailableNow] = useState(false);
  const [sortBy, setSortBy] = useState<AdminWizardsSortBy>('pendingVideo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchWizards = useCallback(async (targetPage: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await apiGetAdminWizards(
        user.token,
        filters,
        sortBy,
        sortOrder,
        targetPage,
        LIMIT,
      );
      setData(result.data);
      setTotal(result.total);
      setPage(result.page);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user, filters, sortBy, sortOrder]);

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      router.replace('/panel');
      return;
    }
    fetchWizards(1);
  }, [user, router, fetchWizards]);

  const totalPages = Math.ceil(total / LIMIT);

  const handleApplyFilters = () => {
    const effective: AdminWizardsFilters = {};
    const minM = meetingsMin.trim() ? parseInt(meetingsMin, 10) : NaN;
    const maxM = meetingsMax.trim() ? parseInt(meetingsMax, 10) : NaN;
    if (!isNaN(minM)) effective.minMeetings = minM;
    if (!isNaN(maxM)) effective.maxMeetings = maxM;
    const minNum = earnedMinZl.trim() ? parseFloat(earnedMinZl.replace(',', '.')) : NaN;
    const maxNum = earnedMaxZl.trim() ? parseFloat(earnedMaxZl.replace(',', '.')) : NaN;
    if (!isNaN(minNum)) effective.minEarnedGrosze = Math.round(minNum * 100);
    if (!isNaN(maxNum)) effective.maxEarnedGrosze = Math.round(maxNum * 100);
    if (availableNow) effective.availableNow = true;
    setFilters(effective);
  };

  const handleSort = (col: AdminWizardsSortBy) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const formatGrosze = (g: number) => `${(g / 100).toFixed(2)} zł`;
  const formatDate = (s: string) => new Date(s).toLocaleDateString('pl-PL');

  return (
    <div className="aw-page">
      <div className="aw-header">
        <div>
          <h1 className="aw-title">Wróżki</h1>
          <p className="aw-subtitle">
            Lista aktywnych wróżek – kliknij wiersz, aby przejść do profilu
          </p>
        </div>
      </div>

      {/* Filtry */}
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
          <button className="aw-filters__btn" onClick={handleApplyFilters}>
            Filtruj
          </button>
        </div>
      </div>

      {/* Sortowanie */}
      <div className="aw-sort">
        <span className="aw-sort__label">Sortuj:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`aw-sort__btn ${sortBy === opt.value ? 'aw-sort__btn--active' : ''}`}
            onClick={() => handleSort(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="panel-page-spinner">
          <span className="panel-spinner" />
        </div>
      ) : data.length === 0 ? (
        <div className="aw-empty">
          <span className="aw-empty__icon">🔮</span>
          <p>Brak wróżek spełniających kryteria.</p>
        </div>
      ) : (
        <>
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
                    onClick={() => router.push(`/panel/admin/wrozki/${row.id}`)}
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

          {totalPages > 1 && (
            <div className="aw-pagination">
              <button
                className="aw-pagination__btn"
                disabled={page <= 1}
                onClick={() => fetchWizards(page - 1)}
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
                onClick={() => fetchWizards(page + 1)}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

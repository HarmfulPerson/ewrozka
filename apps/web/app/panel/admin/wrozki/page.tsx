'use client';

import { useWizardsList } from './useWizardsList';
import {
  WizardsFilters,
  WizardsSortBar,
  WizardsTable,
  WizardsPagination,
} from './WizardsListComponents';
import '../../panel-shared.css';
import './wrozki.css';

export default function AdminWrozkiPage() {
  const {
    data,
    total,
    page,
    loading,
    totalPages,
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
    sortBy,
    handleApplyFilters,
    handleSort,
    fetchWizards,
    router,
  } = useWizardsList();

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

      <WizardsFilters
        meetingsMin={meetingsMin}
        setMeetingsMin={setMeetingsMin}
        meetingsMax={meetingsMax}
        setMeetingsMax={setMeetingsMax}
        earnedMinZl={earnedMinZl}
        setEarnedMinZl={setEarnedMinZl}
        earnedMaxZl={earnedMaxZl}
        setEarnedMaxZl={setEarnedMaxZl}
        availableNow={availableNow}
        setAvailableNow={setAvailableNow}
        onApply={handleApplyFilters}
      />

      <WizardsSortBar sortBy={sortBy} onSort={handleSort} />

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
          <WizardsTable
            data={data}
            onRowClick={(id) => router.push(`/panel/admin/wrozki/${id}`)}
          />

          <WizardsPagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={(p) => fetchWizards(p)}
          />
        </>
      )}
    </div>
  );
}

'use client';

import '../wnioski/wnioski.css';
import '../panel-shared.css';
import { useAvailability } from './use-availability';
import { AvailabilityTable } from './AvailabilityTable';
import { Pagination } from './Pagination';
import { AddAvailabilityModal } from './AddAvailabilityModal';
import { DeleteAvailabilityModal } from './DeleteAvailabilityModal';

const FILTER_OPTIONS = [
  ['', 'Wszystkie'],
  ['upcoming', 'Nadchodzące'],
  ['past', 'Przeszłe'],
] as const;

export default function DostepnoscPage() {
  const {
    availabilities, total, loading,
    filterType, setFilterType,
    sortOrder, toggleSort,
    offset, setOffset,
    limit, setLimit,
    addModalOpen, setAddModalOpen, openAddModal,
    formError, selectedDays, toggleDay,
    startTime, setStartTime, endTime, setEndTime,
    repeat, setRepeat, repeatWeeks, setRepeatWeeks,
    submitting, handleAdd, timeSlots,
    deleteTarget, setDeleteTarget, deleting, confirmDelete,
    totalPages, currentPage,
  } = useAvailability();

  if (loading && availabilities.length === 0) {
    return (
      <div className="panel-page wnioski-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page wnioski-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Moja dostępność</h1>
        <button className="wnioski-btn wnioski-btn--accept" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={openAddModal}>
          + Dodaj
        </button>
      </div>

      <div className="wnioski-toolbar">
        <div className="wnioski-filters">
          {FILTER_OPTIONS.map(([value, label]) => (
            <button
              key={value}
              className={`wnioski-filter-btn${filterType === value ? ' wnioski-filter-btn--active' : ''}`}
              onClick={() => { setFilterType(value); setOffset(0); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="wnioski-table-wrap">
        <AvailabilityTable
          availabilities={availabilities}
          sortOrder={sortOrder}
          toggleSort={toggleSort}
          onDelete={setDeleteTarget}
        />
      </div>

      <Pagination
        total={total}
        offset={offset}
        setOffset={setOffset}
        limit={limit}
        setLimit={setLimit}
        totalPages={totalPages}
        currentPage={currentPage}
      />

      {addModalOpen && (
        <AddAvailabilityModal
          submitting={submitting}
          formError={formError}
          selectedDays={selectedDays}
          toggleDay={toggleDay}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          repeat={repeat}
          setRepeat={setRepeat}
          repeatWeeks={repeatWeeks}
          setRepeatWeeks={setRepeatWeeks}
          timeSlots={timeSlots}
          handleAdd={handleAdd}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {deleteTarget && (
        <DeleteAvailabilityModal
          target={deleteTarget}
          deleting={deleting}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

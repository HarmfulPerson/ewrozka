'use client';

import { useWnioski } from './use-wnioski';
import { WnioskiFilters } from './WnioskiFilters';
import { WnioskiTable } from './WnioskiTable';
import { WnioskiPagination } from './WnioskiPagination';
import { RejectModal } from './RejectModal';
import './wnioski.css';
import '../panel-shared.css';

export default function WnioskiPage() {
  const {
    items, total, offset, setOffset, limit, setLimit,
    statusFilter, setStatusFilter,
    sortBy, sortOrder, toggleSort,
    loading, processingId,
    rejectModal, setRejectModal,
    handleAccept, handleReject, handleConfirmReject,
    totalPages, currentPage,
  } = useWnioski();

  if (loading && items.length === 0) {
    return (
      <div className="panel-page wnioski-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page wnioski-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">
          Wnioski o spotkanie
        </h1>
      </div>

      <WnioskiFilters
        statusFilter={statusFilter}
        onFilterChange={(value) => { setStatusFilter(value); setOffset(0); }}
      />

      <div className="wnioski-table-wrap">
        <WnioskiTable
          items={items}
          statusFilter={statusFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          processingId={processingId}
          onToggleSort={toggleSort}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      </div>

      <WnioskiPagination
        total={total}
        offset={offset}
        limit={limit}
        currentPage={currentPage}
        totalPages={totalPages}
        onOffsetChange={setOffset}
        onLimitChange={setLimit}
      />

      <RejectModal
        modal={rejectModal}
        setModal={setRejectModal}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}

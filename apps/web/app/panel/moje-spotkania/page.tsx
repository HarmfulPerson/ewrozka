'use client';

import { PaymentModal } from '../../components/payment/PaymentModal';
import { useMojeSpotkania } from './useMojeSpotkania';
import { MeetingsToolbar } from './MeetingsToolbar';
import { MeetingsTable } from './MeetingsTable';
import { MeetingsPagination } from './MeetingsPagination';
import '../wnioski/wnioski.css';
import '../panel-shared.css';

export default function MojeSpotkania() {
  const {
    user,
    items,
    total,
    offset,
    setOffset,
    limit,
    setLimit,
    statusFilter,
    setStatusFilter,
    sortBy,
    sortOrder,
    loading,
    hoverRating,
    setHoverRating,
    pendingRating,
    submittingRating,
    paymentModal,
    setPaymentModal,
    handlePay,
    handlePaymentSuccess,
    handleSelectStar,
    handleSubmitRating,
    getJoinStatus,
    toggleSort,
    totalPages,
    currentPage,
  } = useMojeSpotkania();

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
        <h1 className="panel-page__title">Moje spotkania</h1>
      </div>

      <MeetingsToolbar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        setOffset={setOffset}
      />

      <MeetingsTable
        items={items}
        statusFilter={statusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        toggleSort={toggleSort}
        hoverRating={hoverRating}
        setHoverRating={setHoverRating}
        pendingRating={pendingRating}
        submittingRating={submittingRating}
        handlePay={handlePay}
        handleSelectStar={handleSelectStar}
        handleSubmitRating={handleSubmitRating}
        getJoinStatus={getJoinStatus}
      />

      <MeetingsPagination
        total={total}
        offset={offset}
        setOffset={setOffset}
        limit={limit}
        setLimit={setLimit}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {paymentModal && user && (
        <PaymentModal
          token={user.token}
          appointmentId={paymentModal.appointmentId}
          amountZl={paymentModal.amountZl}
          title={paymentModal.title}
          onClose={() => setPaymentModal(null)}
          onSuccess={() => handlePaymentSuccess()}
        />
      )}
    </div>
  );
}

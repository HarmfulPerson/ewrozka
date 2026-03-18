'use client';

import Link from 'next/link';
import { useApplicationsList, type FilterTab } from './useApplicationsList';
import { ApplicationCard, ApplicationsPagination, RejectModal } from './ApplicationsListComponents';
import '../../panel-shared.css';
import './wnioski-wrozek.css';

const STATUS_LABEL: Record<'pending' | 'rejected', string> = {
  pending: 'Oczekuje',
  rejected: 'Odrzucono',
};

export default function AdminWniosikiWrozekPage() {
  const {
    applications,
    total,
    page,
    loading,
    filterStatus,
    setFilterStatus,
    actionLoading,
    expandedBio,
    setExpandedBio,
    totalPages,
    handlePageChange,
    handleApprove,
    openRejectModal,
    rejectModal,
    setRejectModal,
    rejectReason,
    setRejectReason,
    handleRejectConfirm,
  } = useApplicationsList();

  return (
    <div className="ww-page">
      <div className="ww-header">
        <div>
          <h1 className="ww-title">Wnioski specjalistów</h1>
          <p className="ww-subtitle">
            Przeglądaj i zatwierdzaj zgłoszenia nowych specjalistów
          </p>
        </div>
        <div className="ww-filters">
          {(['pending', 'rejected'] as FilterTab[]).map((s) => (
            <button
              key={s}
              className={`ww-filter${filterStatus === s ? ' ww-filter--active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Info o zatwierdzonych */}
      <div className="ww-approved-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
        Zatwierdzeni specjaliści są dostępni w zakładce{' '}
        <Link href="/panel/admin/wrozki" className="ww-approved-info__link">
          Specjaliści →
        </Link>
      </div>

      {loading ? (
        <div className="panel-page-spinner">
          <span className="panel-spinner" />
        </div>
      ) : applications.length === 0 ? (
        <div className="ww-empty">
          <span className="ww-empty__icon">🔮</span>
          <p>
            {filterStatus === 'pending'
              ? 'Brak oczekujących wniosków.'
              : 'Brak odrzuconych wniosków.'}
          </p>
        </div>
      ) : (
        <>
          <div className="ww-list">
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                actionLoading={actionLoading}
                expandedBio={expandedBio}
                onToggleBio={(id) => setExpandedBio(expandedBio === id ? null : id)}
                onApprove={handleApprove}
                onReject={openRejectModal}
              />
            ))}
          </div>

          <ApplicationsPagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {rejectModal && (
        <RejectModal
          rejectModal={rejectModal}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          actionLoading={actionLoading}
          onClose={() => setRejectModal(null)}
          onConfirm={handleRejectConfirm}
        />
      )}
    </div>
  );
}

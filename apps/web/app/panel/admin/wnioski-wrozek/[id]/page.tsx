'use client';

import Link from 'next/link';
import { useApplicationDetail } from './useApplicationDetail';
import {
  ApplicationNav,
  ApplicationSidebar,
  ApplicationMain,
  DetailRejectModal,
} from './ApplicationDetailComponents';
import '../../../panel-shared.css';
import '../wnioski-wrozek.css';
import './wniosek-detail.css';

export default function WniosekDetailPage() {
  const {
    app,
    loading,
    actionLoading,
    showRejectModal,
    setShowRejectModal,
    rejectReason,
    setRejectReason,
    handleApprove,
    handleRejectConfirm,
  } = useApplicationDetail();

  if (loading) {
    return (
      <div className="panel-page-spinner">
        <span className="panel-spinner" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="wd-page">
        <p className="wd-not-found">Wniosek nie istnieje.</p>
        <Link href="/panel/admin/wnioski-wrozek" className="wd-back">
          ← Wróć do listy
        </Link>
      </div>
    );
  }

  return (
    <>
    <div className="wd-page">
      <ApplicationNav app={app} />

      <div className="wd-layout">
        <ApplicationSidebar
          app={app}
          actionLoading={actionLoading}
          onApprove={handleApprove}
          onOpenReject={() => { setRejectReason(''); setShowRejectModal(true); }}
        />

        <ApplicationMain app={app} />
      </div>
    </div>

    {showRejectModal && (
      <DetailRejectModal
        username={app.username}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        actionLoading={actionLoading}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleRejectConfirm}
      />
    )}
    </>
  );
}

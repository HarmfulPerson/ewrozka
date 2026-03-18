'use client';

import type { RejectModalState } from '../useWizardDashboard';

interface RejectModalProps {
  rejectModal: RejectModalState;
  onClose: () => void;
  onChange: (reason: string) => void;
  onConfirm: () => void;
}

export function RejectModal({ rejectModal, onClose, onChange, onConfirm }: RejectModalProps) {
  if (!rejectModal.open) return null;

  return (
    <div className="dashboard__modal-overlay" onClick={onClose}>
      <div className="dashboard__modal" onClick={e => e.stopPropagation()}>
        <div className="dashboard__modal-header">
          <h3 className="dashboard__modal-title">Odrzuć wniosek</h3>
          <button className="dashboard__modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="dashboard__modal-body">
          <textarea
            className={`dashboard__modal-textarea${rejectModal.showError ? ' dashboard__modal-textarea--error' : ''}`}
            placeholder="Powód odrzucenia..."
            rows={3}
            value={rejectModal.reason}
            onChange={e => onChange(e.target.value)}
            autoFocus
          />
          {rejectModal.showError && (
            <p className="dashboard__modal-error">Podaj powód odrzucenia</p>
          )}
        </div>
        <div className="dashboard__modal-footer">
          <button className="dashboard__modal-btn dashboard__modal-btn--cancel" onClick={onClose}>
            Anuluj
          </button>
          <button className="dashboard__modal-btn dashboard__modal-btn--reject" onClick={onConfirm}>
            Odrzuć
          </button>
        </div>
      </div>
    </div>
  );
}

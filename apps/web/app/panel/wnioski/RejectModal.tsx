'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { RejectModalState } from './types';

interface RejectModalProps {
  modal: RejectModalState;
  setModal: Dispatch<SetStateAction<RejectModalState>>;
  onConfirm: () => void;
}

export function RejectModal({ modal, setModal, onConfirm }: RejectModalProps) {
  if (!modal.open) return null;

  const close = () => setModal(m => ({ ...m, open: false }));

  return (
    <div className="wnioski-modal-overlay" onClick={close}>
      <div className="wnioski-modal" onClick={e => e.stopPropagation()}>
        <div className="wnioski-modal__header">
          <h3 className="wnioski-modal__title">Odrzuć wniosek</h3>
          <button className="wnioski-modal__close" onClick={close}>✕</button>
        </div>
        <div className="wnioski-modal__body">
          <textarea
            className={`wnioski-modal__textarea${modal.showError ? ' wnioski-modal__textarea--error' : ''}`}
            placeholder="Powód odrzucenia..."
            rows={3}
            value={modal.reason}
            onChange={e => setModal(m => ({ ...m, reason: e.target.value, showError: false }))}
            autoFocus
          />
          {modal.showError && (
            <p className="wnioski-modal__error">Podaj powód odrzucenia</p>
          )}
        </div>
        <div className="wnioski-modal__footer">
          <button className="wnioski-btn wnioski-btn--cancel" onClick={close}>
            Anuluj
          </button>
          <button className="wnioski-btn wnioski-btn--reject" onClick={onConfirm}>
            ✕ Odrzuć
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { AvailabilityDto } from '../../lib/api-calendar';
import { fmtDate, fmtTime } from './constants';

interface DeleteAvailabilityModalProps {
  target: AvailabilityDto;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteAvailabilityModal({ target, deleting, onConfirm, onClose }: DeleteAvailabilityModalProps) {
  return (
    <div className="wnioski-modal-overlay" onClick={() => !deleting && onClose()}>
      <div className="wnioski-modal" onClick={e => e.stopPropagation()}>
        <div className="wnioski-modal__header">
          <h3 className="wnioski-modal__title">Potwierdź usunięcie</h3>
          <button className="wnioski-modal__close" onClick={() => !deleting && onClose()}>✕</button>
        </div>
        <div className="wnioski-modal__body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Czy na pewno chcesz usunąć ten blok dostępności?
          </p>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {fmtDate(new Date(target.startsAt))} · {fmtTime(new Date(target.startsAt))} – {fmtTime(new Date(target.endsAt))}
          </p>
        </div>
        <div className="wnioski-modal__footer">
          <button className="wnioski-btn wnioski-btn--cancel" onClick={() => onClose()} disabled={deleting}>Anuluj</button>
          <button className="wnioski-btn wnioski-btn--reject" style={{ padding: '0.5rem 1rem' }} onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Usuwanie…' : 'Usuń'}
          </button>
        </div>
      </div>
    </div>
  );
}

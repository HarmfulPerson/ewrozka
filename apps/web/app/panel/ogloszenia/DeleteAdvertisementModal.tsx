'use client';

import { useState } from 'react';
import { AdvertisementDto } from '../../lib/api-advertisements';

interface DeleteAdvertisementModalProps {
  advertisement: AdvertisementDto;
  onClose: () => void;
  onConfirm: (ad: AdvertisementDto) => Promise<void>;
}

export function DeleteAdvertisementModal({ advertisement, onClose, onConfirm }: DeleteAdvertisementModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onConfirm(advertisement);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Nie udało się usunąć ogłoszenia');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Potwierdź usunięcie</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>Czy na pewno chcesz usunąć to ogłoszenie?</p>
          <div className="modal-info">
            <strong>{advertisement.title}</strong>
            <span>{advertisement.description}</span>
          </div>
          {deleteError && (
            <p className="modal-error">{deleteError}</p>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="modal-button modal-button--cancel"
            onClick={onClose}
            disabled={deleting}
          >
            Anuluj
          </button>
          <button
            className="modal-button modal-button--danger"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Usuwanie...' : 'Usuń'}
          </button>
        </div>
      </div>
    </div>
  );
}

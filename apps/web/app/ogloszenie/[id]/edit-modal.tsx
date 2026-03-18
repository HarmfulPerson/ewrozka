'use client';

import { useEditAdvertisement } from './use-edit-advertisement';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

type EditState = ReturnType<typeof useEditAdvertisement>;

export function EditModal({ edit }: { edit: EditState }) {
  useBodyScrollLock(edit.isOpen);
  if (!edit.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={edit.close}>
      <div className="modal-content modal-content--edit" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Edytuj opis ogłoszenia</h3>
          <button className="modal-close" onClick={edit.close}>✕</button>
        </div>

        <div className="modal-body">
          <div className="edit-field">
            <label className="edit-label">Opis</label>
            <textarea
              className="edit-input edit-input--textarea"
              value={edit.description}
              onChange={e => edit.setDescription(e.target.value)}
              rows={6}
              placeholder="Opis usługi"
            />
          </div>
          {edit.error && <p className="edit-error">{edit.error}</p>}
        </div>

        <div className="modal-footer">
          <button className="modal-button modal-button--cancel" onClick={edit.close}>
            Anuluj
          </button>
          <button
            className="modal-button modal-button--primary"
            onClick={edit.save}
            disabled={edit.saving}
          >
            {edit.saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </div>
      </div>
    </div>
  );
}

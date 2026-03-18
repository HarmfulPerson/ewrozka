'use client';

import { useEditAdvertisement } from './use-edit-advertisement';

type EditState = ReturnType<typeof useEditAdvertisement>;

export function EditModal({ edit }: { edit: EditState }) {
  if (!edit.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={edit.close}>
      <div className="modal-content modal-content--edit" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Edytuj ogłoszenie</h3>
          <button className="modal-close" onClick={edit.close}>✕</button>
        </div>

        <div className="modal-body">
          <div className="edit-field">
            <label className="edit-label">Tytuł</label>
            <input
              className="edit-input"
              value={edit.title}
              onChange={e => edit.setTitle(e.target.value)}
              placeholder="Tytuł ogłoszenia"
            />
          </div>
          <div className="edit-field">
            <label className="edit-label">Opis</label>
            <textarea
              className="edit-input edit-input--textarea"
              value={edit.description}
              onChange={e => edit.setDescription(e.target.value)}
              rows={5}
              placeholder="Opis usługi"
            />
          </div>
          <div className="edit-row">
            <div className="edit-field">
              <label className="edit-label">Cena (zł)</label>
              <input
                className="edit-input"
                type="number"
                min="0"
                step="0.01"
                value={edit.priceZl}
                onChange={e => edit.setPriceZl(e.target.value)}
                placeholder="np. 50.00"
              />
            </div>
            <div className="edit-field">
              <label className="edit-label">Czas trwania (min)</label>
              <input
                className="edit-input"
                type="number"
                min="5"
                step="5"
                value={edit.duration}
                onChange={e => edit.setDuration(e.target.value)}
                placeholder="np. 60"
              />
            </div>
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

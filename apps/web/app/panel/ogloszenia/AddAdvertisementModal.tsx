'use client';

import { useState } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface AddAdvertisementModalProps {
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    priceZl: string,
    durationMinutes: string,
    imageFile: File | null,
  ) => Promise<void>;
  error: string | null;
}

export function AddAdvertisementModal({ onClose, onSubmit, error }: AddAdvertisementModalProps) {
  useBodyScrollLock(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceZl, setPriceZl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(title, description, priceZl, durationMinutes, imageFile);
    } catch {
      // error is handled by parent via error prop
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Dodaj nowe ogłoszenie</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="ogloszenia-alert ogloszenia-alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div className="ogloszenia-form__field">
              <label className="ogloszenia-form__label">Tytuł</label>
              <input
                type="text"
                className="ogloszenia-form__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Np. Konsultacja tarot"
                required
              />
            </div>

            <div className="ogloszenia-form__field">
              <label className="ogloszenia-form__label">Opis</label>
              <textarea
                className="ogloszenia-form__textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opisz swoją usługę..."
                rows={4}
                required
              />
            </div>

            <div className="ogloszenia-form__row">
              <div className="ogloszenia-form__field">
                <label className="ogloszenia-form__label">Cena (w złotych)</label>
                <input
                  type="number"
                  step="0.01"
                  className="ogloszenia-form__input"
                  value={priceZl}
                  onChange={(e) => setPriceZl(e.target.value)}
                  placeholder="50.00"
                  min="0.01"
                  required
                />
              </div>

              <div className="ogloszenia-form__field">
                <label className="ogloszenia-form__label">Czas trwania (minuty)</label>
                <input
                  type="number"
                  className="ogloszenia-form__input"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="30"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="ogloszenia-form__field">
              <label className="ogloszenia-form__label">Zdjęcie (opcjonalne)</label>
              {!imagePreview ? (
                <label className="ogloszenia-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <span>+ Dodaj zdjęcie</span>
                </label>
              ) : (
                <div className="ogloszenia-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button
                    type="button"
                    className="ogloszenia-preview__remove"
                    onClick={handleRemoveImage}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="modal-button modal-button--cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="modal-button modal-button--primary"
              disabled={submitting}
            >
              {submitting ? 'Dodawanie...' : 'Dodaj ogłoszenie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

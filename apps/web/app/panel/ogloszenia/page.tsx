'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser } from '../../lib/auth-mock';
import {
  apiGetMyAdvertisements,
  apiCreateAdvertisement,
  apiDeleteAdvertisement,
  AdvertisementDto,
  getUploadsBaseUrl,
} from '../../lib/api-advertisements';
import { apiCheckConnectReady } from '../../lib/api-payment';
import Image from 'next/image';
import './ogloszenia.css';

export default function MojeOgloszeniaPage() {
  const router = useRouter();
  const [user] = useState(() => getStoredUser());
  const [advertisements, setAdvertisements] = useState<AdvertisementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectReady, setConnectReady] = useState<boolean | null>(null);

  // Form modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceZl, setPriceZl] = useState(''); // w złotych
  const [durationMinutes, setDurationMinutes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [advertisementToDelete, setAdvertisementToDelete] = useState<AdvertisementDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchAdvertisements = async () => {
    if (!user) return;
    try {
      const [data, connectData] = await Promise.all([
        apiGetMyAdvertisements(user.token),
        apiCheckConnectReady(user.token),
      ]);
      setAdvertisements(data.advertisements);
      setConnectReady(
        !!(connectData.connected && connectData.onboardingCompleted && connectData.payoutsEnabled),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować ogłoszeń');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvertisements();
  }, [user]);

  const openFormModal = () => {
    setFormModalOpen(true);
    setTitle('');
    setDescription('');
    setPriceZl('');
    setDurationMinutes('');
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
  };

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
    if (!user) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (!title || !description || !priceZl || !durationMinutes) {
        throw new Error('Wszystkie pola są wymagane');
      }

      const priceFloat = parseFloat(priceZl.replace(',', '.'));
      const duration = parseInt(durationMinutes);

      if (isNaN(priceFloat) || priceFloat <= 0) {
        throw new Error('Cena musi być większa od 0');
      }

      if (duration <= 0) {
        throw new Error('Czas trwania musi być większy od 0');
      }

      const priceGrosze = Math.round(priceFloat * 100);

      await apiCreateAdvertisement(
        user.token,
        {
          title,
          description,
          priceGrosze,
          durationMinutes: duration,
        },
        imageFile || undefined,
      );

      setSuccess('Ogłoszenie zostało dodane!');
      closeFormModal();
      await fetchAdvertisements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać ogłoszenia');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (ad: AdvertisementDto) => {
    setAdvertisementToDelete(ad);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setAdvertisementToDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!user || !advertisementToDelete) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDeleteAdvertisement(user.token, advertisementToDelete.id);
      setSuccess('Ogłoszenie zostało usunięte');
      await fetchAdvertisements();
      closeDeleteModal();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Nie udało się usunąć ogłoszenia');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="panel-page">
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Moje ogłoszenia</h1>
        <button
          className="ogloszenia-add-btn"
          onClick={connectReady ? openFormModal : undefined}
          disabled={!connectReady}
          title={!connectReady ? 'Skonfiguruj konto Stripe, by dodawać ogłoszenia' : undefined}
        >
          + Dodaj ogłoszenie
        </button>
      </div>

      {connectReady === false && (
        <div className="ogloszenia-connect-banner">
          <span>⚠️ Aby dodawać ogłoszenia, musisz najpierw skonfigurować konto bankowe Stripe.</span>
          <Link href="/panel/portfel" className="ogloszenia-connect-banner__link">
            Skonfiguruj teraz →
          </Link>
        </div>
      )}

      {error && <div className="ogloszenia-alert ogloszenia-alert--error">{error}</div>}
      {success && <div className="ogloszenia-alert ogloszenia-alert--success">{success}</div>}

      <section className="ogloszenia-section">
        <h2 className="ogloszenia-section__title">Lista ogłoszeń</h2>
        {advertisements.length === 0 ? (
          <p className="ogloszenia-empty">
            Nie masz jeszcze żadnych ogłoszeń. Dodaj pierwsze powyżej!
          </p>
        ) : (
          <div className="ogloszenia-list">
            {advertisements.map((ad) => (
              <div key={ad.id} className="ogloszenia-card">
                {ad.imageUrl ? (
                  <div className="ogloszenia-card__image">
                    <Image
                      src={`${getUploadsBaseUrl()}${ad.imageUrl}`}
                      alt={ad.title}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div className="ogloszenia-card__image ogloszenia-card__image--placeholder">
                    <span>Brak zdjęcia</span>
                  </div>
                )}
                <div className="ogloszenia-card__content">
                  <h3 className="ogloszenia-card__title">{ad.title}</h3>
                  <p className="ogloszenia-card__description">{ad.description}</p>
                  <div className="ogloszenia-card__info">
                    <span className="ogloszenia-card__price">
                      {(ad.priceGrosze / 100).toFixed(2)} zł
                    </span>
                    <span className="ogloszenia-card__duration">
                      {ad.durationMinutes} min
                    </span>
                  </div>
                </div>
                <div className="ogloszenia-card__actions">
                  <button
                    className="ogloszenia-card__button ogloszenia-card__button--view"
                    onClick={() => router.push(`/ogloszenie/${ad.id}`)}
                  >
                    Zobacz
                  </button>
                  <button
                    className="ogloszenia-card__button ogloszenia-card__button--delete"
                    onClick={() => openDeleteModal(ad)}
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Advertisement Modal */}
      {formModalOpen && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Dodaj nowe ogłoszenie</h3>
              <button className="modal-close" onClick={closeFormModal}>
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
                  onClick={closeFormModal}
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
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && advertisementToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Potwierdź usunięcie</h3>
              <button className="modal-close" onClick={closeDeleteModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Czy na pewno chcesz usunąć to ogłoszenie?</p>
              <div className="modal-info">
                <strong>{advertisementToDelete.title}</strong>
                <span>{advertisementToDelete.description}</span>
              </div>
              {deleteError && (
                <p className="modal-error">{deleteError}</p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="modal-button modal-button--cancel"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Anuluj
              </button>
              <button
                className="modal-button modal-button--danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Usuwanie...' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

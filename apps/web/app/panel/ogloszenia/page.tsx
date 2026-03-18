'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdvertisementDto } from '../../lib/api-advertisements';
import { useAdvertisements } from './useAdvertisements';
import { AdvertisementCard } from './AdvertisementCard';
import { AddAdvertisementModal } from './AddAdvertisementModal';
import { DeleteAdvertisementModal } from './DeleteAdvertisementModal';
import './ogloszenia.css';

export default function MojeOgloszeniaPage() {
  const {
    advertisements,
    loading,
    error,
    setError,
    success,
    setSuccess,
    connectReady,
    createAdvertisement,
    deleteAdvertisement,
  } = useAdvertisements();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [advertisementToDelete, setAdvertisementToDelete] = useState<AdvertisementDto | null>(null);

  const openFormModal = () => {
    setError(null);
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
  };

  const handleCreate = async (
    title: string,
    description: string,
    priceZl: string,
    durationMinutes: string,
    imageFile: File | null,
  ) => {
    try {
      await createAdvertisement(title, description, priceZl, durationMinutes, imageFile);
      closeFormModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać ogłoszenia');
      throw err;
    }
  };

  const openDeleteModal = (ad: AdvertisementDto) => {
    setAdvertisementToDelete(ad);
  };

  const closeDeleteModal = () => {
    setAdvertisementToDelete(null);
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
              <AdvertisementCard key={ad.id} ad={ad} onDelete={openDeleteModal} />
            ))}
          </div>
        )}
      </section>

      {formModalOpen && (
        <AddAdvertisementModal
          onClose={closeFormModal}
          onSubmit={handleCreate}
          error={error}
        />
      )}

      {advertisementToDelete && (
        <DeleteAdvertisementModal
          advertisement={advertisementToDelete}
          onClose={closeDeleteModal}
          onConfirm={deleteAdvertisement}
        />
      )}
    </div>
  );
}

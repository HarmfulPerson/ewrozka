'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AdvertisementDto, getUploadsBaseUrl } from '../../lib/api-advertisements';

interface AdvertisementCardProps {
  ad: AdvertisementDto;
  onDelete: (ad: AdvertisementDto) => void;
}

export function AdvertisementCard({ ad, onDelete }: AdvertisementCardProps) {
  const router = useRouter();

  return (
    <div className="ogloszenia-card">
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
          onClick={() => onDelete(ad)}
        >
          Usuń
        </button>
      </div>
    </div>
  );
}

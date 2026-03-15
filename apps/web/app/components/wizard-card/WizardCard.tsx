'use client';

import Image from 'next/image';
import { WizardDto, getUploadUrl } from '../../lib/api';
import { StarRating } from '../star-rating/StarRating';
import { TopicIcon } from '../topic-icon/topic-icon';
import '../star-rating/star-rating.css';
import './wizard-card.css';

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%230c1025' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%238e96b8' font-size='14' font-family='system-ui'%3EBrak zdjęcia%3C/text%3E%3C/svg%3E";

export function WizardCard({ wizard }: { wizard: WizardDto }) {
  const firstImage = wizard.image || wizard.image2 || wizard.image3;
  const specializations =
    wizard.topicNames && wizard.topicNames.length > 0
      ? wizard.topicNames
      : ['Tarot', 'Astrologia'];
  const hasRating = wizard.avgRating != null && wizard.ratingsCount != null && wizard.ratingsCount > 0;

  return (
    <article className={`wizard-card${wizard.isFeatured ? ' wizard-card--featured' : ''}`}>
      {wizard.isFeatured && (
        <div className="wizard-card__featured-badge">
          <span className="wizard-card__featured-icon">✦</span>
          Wyróżniona
        </div>
      )}
      <div className="wizard-card__avatar">
        <Image
          src={firstImage ? getUploadUrl(firstImage) : PLACEHOLDER}
          alt={wizard.username}
          width={200}
          height={200}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = PLACEHOLDER;
          }}
        />
      </div>
      <div className="wizard-card__body">
        <h3 className="wizard-card__title">{wizard.username}</h3>
        <div className="wizard-card__rating">
          {hasRating ? (
            <StarRating avg={wizard.avgRating!} count={wizard.ratingsCount!} />
          ) : (
            <span className="wizard-card__no-rating">Brak ocen</span>
          )}
        </div>
        <div className="wizard-card__topics">
          {specializations.map((topic, i) => (
            <span key={i} className="wizard-card__topic">
              <TopicIcon name={topic} size={13} />
              {topic}
            </span>
          ))}
        </div>
        <p className="wizard-card__desc">
          {wizard.bio || 'Doświadczona wróżka specjalizująca się w różnych formach wróżbiarstwa'}
        </p>
      </div>
    </article>
  );
}

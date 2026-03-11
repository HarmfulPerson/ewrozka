'use client';

import Image from 'next/image';
import { WizardDto, getUploadUrl } from '../../lib/api';
import { StarRating } from '../star-rating/StarRating';
import '../star-rating/star-rating.css';
import './wizard-card.css';

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240' viewBox='0 0 400 240'%3E%3Crect fill='%231a0a2e' width='400' height='240'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%238b5cf6' font-size='16' font-family='system-ui'%3EBrak zdjęcia%3C/text%3E%3C/svg%3E";

export function WizardCard({ wizard }: { wizard: WizardDto }) {
  const firstImage = wizard.image || wizard.image2 || wizard.image3;
  const specializations =
    wizard.topicNames && wizard.topicNames.length > 0
      ? wizard.topicNames
      : ['Tarot', 'Astrologia'];
  const hasRating = wizard.avgRating != null && wizard.ratingsCount != null && wizard.ratingsCount > 0;

  return (
    <article className={`wizard-card${wizard.isFeatured ? ' wizard-card--featured' : ''}`}>
      <div className="wizard-card__image">
        {wizard.isFeatured && (
          <div className="wizard-card__featured-badge">
            <span className="wizard-card__featured-icon">✦</span>
            Wyróżniona
          </div>
        )}
        <Image
          src={firstImage ? getUploadUrl(firstImage) : PLACEHOLDER}
          alt={wizard.username}
          width={400}
          height={240}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = PLACEHOLDER;
          }}
        />
      </div>
      <div className="wizard-card__body">
        <h3 className="wizard-card__title">{wizard.username}</h3>
        <div className="wizard-card__topics">
          <span className="wizard-card__topic-label">Specjalizacje:</span>
          {specializations.map((topic, i) => (
            <span key={i} className="wizard-card__topic">
              {topic}
            </span>
          ))}
        </div>
        <div className="wizard-card__rating">
          {hasRating ? (
            <StarRating avg={wizard.avgRating!} count={wizard.ratingsCount!} />
          ) : (
            <span className="wizard-card__no-rating">Brak ocen</span>
          )}
        </div>
        <p className="wizard-card__desc">
          {wizard.bio || 'Doświadczona wróżka specjalizująca się w różnych formach wróżbiarstwa'}
        </p>
      </div>
    </article>
  );
}

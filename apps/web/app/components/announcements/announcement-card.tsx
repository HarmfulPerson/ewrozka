import { getUploadUrl } from '../../lib/api';
import Image from 'next/image';

interface Announcement {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  authorName: string;
}

interface AnnouncementCardProps {
  announcement: Announcement;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'%3E%3Crect fill='%231a0a2e' width='400' height='250'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%238b5cf6' font-size='18' font-family='system-ui'%3EBrak zdjęcia%3C/text%3E%3C/svg%3E";

  return (
    <article className="announcement-card">
      <div className="announcement-card__image">
        <Image
          src={announcement.imageUrl || placeholderSvg}
          alt={announcement.title}
          width={400}
          height={250}
          style={{ objectFit: 'cover' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = placeholderSvg;
          }}
        />
      </div>
      <div className="announcement-card__body">
        <h3 className="announcement-card__title">{announcement.title}</h3>
        {announcement.authorName && (
          <div className="announcement-card__topics">
            <span className="announcement-card__topic-label">Specjalizacje:</span>
            {announcement.authorName.split(', ').map((topic, i) => (
              <span key={i} className="announcement-card__topic">{topic}</span>
            ))}
          </div>
        )}
        <p className="announcement-card__description">{announcement.description}</p>
      </div>
    </article>
  );
}

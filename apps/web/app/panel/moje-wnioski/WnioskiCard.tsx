'use client';

import { MeetingRequestDto } from '../../lib/api-meetings';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekuje na akceptację',
  accepted: 'Zaakceptowane',
  rejected: 'Odrzucone',
};

interface WnioskiCardProps {
  request: MeetingRequestDto;
}

export function WnioskiCard({ request }: WnioskiCardProps) {
  const date = request.requestedStartsAt ? new Date(request.requestedStartsAt) : null;

  return (
    <div className="moje-wnioski-card">
      <div className="moje-wnioski-card__header">
        <div>
          <h3 className="moje-wnioski-card__title">{request.advertisementTitle}</h3>
          <span className="moje-wnioski-card__wrozka">
            Wróżka: <strong>{request.wrozkaUsername}</strong>
          </span>
        </div>
        <span className={`moje-wnioski-card__status moje-wnioski-card__status--${request.status}`}>
          {STATUS_LABELS[request.status] || request.status}
        </span>
      </div>

      <div className="moje-wnioski-card__body">
        {date ? (
          <div className="moje-wnioski-card__datetime">
            <div className="moje-wnioski-card__date">
              📅 {date.toLocaleDateString('pl-PL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="moje-wnioski-card__time">
              🕐 {date.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ) : (
          <div className="moje-wnioski-card__no-date">
            Data do ustalenia
          </div>
        )}

        {request.message && (
          <div className="moje-wnioski-card__message">
            <strong>Twoja wiadomość:</strong> {request.message}
          </div>
        )}

        {request.createdAt && (
          <div className="moje-wnioski-card__created">
            Wysłano: {new Date(request.createdAt).toLocaleString('pl-PL')}
          </div>
        )}

        {request.status === 'accepted' && (
          <div className="moje-wnioski-card__info">
            ℹ️ Wniosek został zaakceptowany. Przejdź do "Moje wizyty", aby opłacić konsultację.
          </div>
        )}
      </div>
    </div>
  );
}

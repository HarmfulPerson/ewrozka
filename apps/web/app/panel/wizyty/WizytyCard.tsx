'use client';

import Link from 'next/link';
import { AppointmentDto } from '../../lib/api-calendar';

function getStatusBadge(status: string) {
  const statusMap: { [key: string]: { label: string; className: string } } = {
    accepted: { label: 'Oczekuje na płatność', className: 'wizyty-status--pending' },
    paid: { label: 'Opłacone', className: 'wizyty-status--paid' },
    completed: { label: 'Zakończone', className: 'wizyty-status--completed' },
  };

  const config = statusMap[status] || { label: status, className: '' };
  return <span className={`wizyty-status ${config.className}`}>{config.label}</span>;
}

interface WizytyCardProps {
  appointment: AppointmentDto;
  payingId: number | null;
  onPay: (id: number) => void;
}

export function WizytyCard({ appointment, payingId, onPay }: WizytyCardProps) {
  const isPaying = payingId === appointment.id;
  const date = new Date(appointment.startsAt);
  const canPay = appointment.status === 'accepted';

  return (
    <div className="wizyty-card">
      <div className="wizyty-card__header">
        <div>
          <h3 className="wizyty-card__title">{appointment.advertisementTitle}</h3>
          <span className="wizyty-card__wizard">
            Wróżka: <strong>{appointment.wrozkaUsername}</strong>
          </span>
        </div>
        {getStatusBadge(appointment.status)}
      </div>

      <div className="wizyty-card__body">
        <div className="wizyty-card__datetime">
          <div className="wizyty-card__date">
            📅 {date.toLocaleDateString('pl-PL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div className="wizyty-card__time">
            🕐 {date.toLocaleTimeString('pl-PL', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        <div className="wizyty-card__details">
          <div className="wizyty-detail">
            <span className="wizyty-detail__label">Czas trwania:</span>
            <span className="wizyty-detail__value">{appointment.durationMinutes} minut</span>
          </div>
          <div className="wizyty-detail">
            <span className="wizyty-detail__label">Cena:</span>
            <span className="wizyty-detail__value wizyty-detail__value--price">
              {(appointment.priceGrosze / 100).toFixed(2)} zł
            </span>
          </div>
        </div>
      </div>

      {canPay && (
        <div className="wizyty-card__actions">
          <button
            className="wizyty-card__button wizyty-card__button--pay"
            onClick={() => onPay(appointment.id)}
            disabled={isPaying}
          >
            {isPaying ? 'Przetwarzanie...' : '💳 Zapłać teraz'}
          </button>
        </div>
      )}

      {appointment.status === 'paid' && appointment.meetingToken && (
        <div className="wizyty-card__meeting">
          <div className="wizyty-card__meeting-header">
            <span className="wizyty-card__meeting-label">Link do spotkania:</span>
            <Link
              href={`/spotkanie/${appointment.meetingToken}`}
              className="wizyty-card__meeting-link"
              target="_blank"
            >
              🎥 Dołącz do spotkania
            </Link>
          </div>
          <div className="wizyty-card__meeting-token">
            Token: <code>{appointment.meetingToken}</code>
          </div>
        </div>
      )}
    </div>
  );
}

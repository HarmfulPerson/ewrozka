import { NotificationType, CreateNotificationPayload } from '../notification-types';

const STATUS_LABELS: Record<string, string> = {
  accepted: 'zaakceptowany',
  rejected: 'odrzucony',
  paid: 'opłacony',
};

/**
 * Zmiana statusu wniosku — powiadomienie dla klienta.
 */
export function buildRequestStatusChangedNotification(opts: {
  clientId: string;
  wizardName: string;
  advertisementTitle: string;
  newStatus: string;
  requestId: string;
  rejectionReason?: string;
}): CreateNotificationPayload {
  const statusLabel = STATUS_LABELS[opts.newStatus] ?? opts.newStatus;
  return {
    userId: opts.clientId,
    type: NotificationType.REQUEST_STATUS_CHANGED,
    title: `Wniosek ${statusLabel}`,
    body: `${opts.wizardName} ${statusLabel}(a) Twój wniosek na „${opts.advertisementTitle}"${opts.rejectionReason ? `. Powód: ${opts.rejectionReason}` : ''}`,
    link: '/panel/moje-spotkania',
    meta: {
      requestId: opts.requestId,
      newStatus: opts.newStatus,
      wizardName: opts.wizardName,
    },
  };
}

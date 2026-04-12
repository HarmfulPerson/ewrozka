import { NotificationType, CreateNotificationPayload } from '../notification-types';

/**
 * Nowy wniosek o spotkanie — powiadomienie dla wróżki.
 */
export function buildNewRequestNotification(opts: {
  wizardId: string;
  clientName: string;
  advertisementTitle: string;
  requestId: string;
  isGuest: boolean;
}): CreateNotificationPayload {
  const who = opts.isGuest ? `Gość ${opts.clientName}` : opts.clientName;
  return {
    userId: opts.wizardId,
    type: NotificationType.NEW_REQUEST,
    title: 'Nowy wniosek o spotkanie',
    body: `${who} wysłał(a) wniosek na „${opts.advertisementTitle}"`,
    link: '/panel/wnioski?status=pending',
    meta: {
      requestId: opts.requestId,
      clientName: opts.clientName,
      isGuest: opts.isGuest,
    },
  };
}

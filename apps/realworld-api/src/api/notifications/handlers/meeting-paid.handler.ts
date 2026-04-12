import { NotificationType, CreateNotificationPayload } from '../notification-types';

/**
 * Spotkanie opłacone — powiadomienie dla wróżki.
 */
export function buildMeetingPaidNotification(opts: {
  wizardId: string;
  clientName: string;
  advertisementTitle: string;
  appointmentId: string;
  startsAt: string;
}): CreateNotificationPayload {
  return {
    userId: opts.wizardId,
    type: NotificationType.MEETING_PAID,
    title: 'Spotkanie opłacone',
    body: `${opts.clientName} opłacił(a) spotkanie „${opts.advertisementTitle}"`,
    link: '/panel/wnioski?status=paid',
    meta: {
      appointmentId: opts.appointmentId,
      clientName: opts.clientName,
      startsAt: opts.startsAt,
    },
  };
}

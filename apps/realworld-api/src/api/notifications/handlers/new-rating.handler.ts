import { NotificationType, CreateNotificationPayload } from '../notification-types';

/**
 * Nowa ocena spotkania — powiadomienie dla wróżki.
 */
export function buildNewRatingNotification(opts: {
  wizardId: number;
  clientName: string;
  rating: number;
  advertisementTitle: string;
}): CreateNotificationPayload {
  const stars = '★'.repeat(opts.rating) + '☆'.repeat(5 - opts.rating);
  return {
    userId: opts.wizardId,
    type: NotificationType.NEW_RATING,
    title: `Nowa ocena: ${stars}`,
    body: `${opts.clientName} ocenił(a) spotkanie „${opts.advertisementTitle}" na ${opts.rating}/5`,
    link: '/panel/wnioski?status=completed',
    meta: {
      rating: opts.rating,
      clientName: opts.clientName,
    },
  };
}

import { NotificationType, CreateNotificationPayload } from '../notification-types';

/**
 * Spotkanie zaraz się zaczyna (5 min) — powiadomienie dla obu stron.
 */
export function buildMeetingStartingNotification(opts: {
  userId: string;
  otherPartyName: string;
  advertisementTitle: string;
  meetingLink: string;
}): CreateNotificationPayload {
  return {
    userId: opts.userId,
    type: NotificationType.MEETING_STARTING,
    title: 'Spotkanie zaraz się zaczyna!',
    body: `Spotkanie „${opts.advertisementTitle}" z ${opts.otherPartyName} rozpocznie się za chwilę`,
    link: opts.meetingLink,
    meta: {
      otherPartyName: opts.otherPartyName,
    },
  };
}

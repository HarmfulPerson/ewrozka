import { NotificationType, CreateNotificationPayload } from '../notification-types';

/**
 * Przypomnienie o spotkaniu — powiadomienie dla obu stron.
 * Wywoływane przez CRON np. 1h lub 15min przed spotkaniem.
 */
export function buildMeetingReminderNotification(opts: {
  userId: string;
  otherPartyName: string;
  advertisementTitle: string;
  startsAt: string;
  minutesBefore: number;
  meetingLink?: string;
}): CreateNotificationPayload {
  const timeLabel = opts.minutesBefore >= 60
    ? `${Math.floor(opts.minutesBefore / 60)} h`
    : `${opts.minutesBefore} min`;

  return {
    userId: opts.userId,
    type: NotificationType.MEETING_REMINDER,
    title: `Spotkanie za ${timeLabel}`,
    body: `Spotkanie „${opts.advertisementTitle}" z ${opts.otherPartyName} rozpocznie się za ${timeLabel}`,
    link: opts.meetingLink ?? '/panel',
    meta: {
      startsAt: opts.startsAt,
      minutesBefore: opts.minutesBefore,
      otherPartyName: opts.otherPartyName,
    },
  };
}

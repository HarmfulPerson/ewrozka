/**
 * Typy powiadomień — rozszerzalne.
 * Każdy typ ma odpowiadający handler w ./handlers/
 */
export enum NotificationType {
  /** Nowy wniosek o spotkanie (dla wróżki) */
  NEW_REQUEST = 'new_request',
  /** Zmiana statusu wniosku (dla klienta) */
  REQUEST_STATUS_CHANGED = 'request_status_changed',
  /** Spotkanie opłacone (dla wróżki) */
  MEETING_PAID = 'meeting_paid',
  /** Przypomnienie o spotkaniu (dla obu stron) */
  MEETING_REMINDER = 'meeting_reminder',
  /** Spotkanie zaraz się zaczyna — 5 min (dla obu stron) */
  MEETING_STARTING = 'meeting_starting',
  /** Nowa ocena spotkania (dla wróżki) */
  NEW_RATING = 'new_rating',
}

export interface CreateNotificationPayload {
  userId: number;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  meta?: Record<string, unknown>;
}

export enum EmailType {
  VERIFY_EMAIL = 'verify-email',
  PASSWORD_RESET = 'password-reset',
  WELCOME = 'welcome',
  WELCOME_CLIENT = 'welcome-client',
  WELCOME_WIZARD = 'welcome-wizard',
  WIZARD_APPLICATION_APPROVED = 'wizard-application-approved',
  WIZARD_APPLICATION_REJECTED = 'wizard-application-rejected',
  GUEST_BOOKING_ACCEPTED = 'guest-booking-accepted',
  GUEST_BOOKING_REJECTED = 'guest-booking-rejected',
  GUEST_BOOKING_PAID = 'guest-booking-paid',
  /** Po spotkaniu – zalogowany klient: zachęta do oceny */
  MEETING_COMPLETED_RATE = 'meeting-completed-rate',
  /** Po spotkaniu – gość: podziękowanie */
  MEETING_COMPLETED_GUEST = 'meeting-completed-guest',
  /** Wiadomość z formularza kontaktowego → na ewrozkaonline@gmail.com */
  CONTACT_FORM = 'contact-form',
  /** Przypomnienie o nadchodzącym spotkaniu (opłacone) */
  MEETING_REMINDER_PAID = 'meeting-reminder-paid',
  /** Przypomnienie o nadchodzącym spotkaniu (do opłacenia) */
  MEETING_REMINDER_UNPAID = 'meeting-reminder-unpaid',
  /** Termin odwołany przez wróżkę – gość nie może już opłacić */
  GUEST_BOOKING_CANCELLED_BY_BLOCK = 'guest-booking-cancelled-by-block',
  /** Wniosek anulowany – wróżka odwołała blok dostępności */
  MEETING_REQUEST_CANCELLED_BY_BLOCK = 'meeting-request-cancelled-by-block',
  /** Wniosek odrzucony przez wróżkę (zaakceptowany, nieopłacony) – wymaga powodu */
  MEETING_REQUEST_REJECTED = 'meeting-request-rejected',
}

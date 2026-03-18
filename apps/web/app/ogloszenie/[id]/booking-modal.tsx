'use client';

import { SlotDto } from '../../lib/api-booking';
import { useBooking } from './use-booking';

type BookingState = ReturnType<typeof useBooking>;

const formatMonthName = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year ?? '0'), parseInt(month ?? '1') - 1, 1);
  return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
};

const formatSlotTime = (startsAt: string) =>
  new Date(startsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

function getModalTitle(booking: BookingState): string {
  if (booking.step === 'choice') return 'Umów konsultację';
  if (booking.step === 'guest-form' && booking.selectedSlot) return 'Twoje dane';
  if (booking.dateStep === 'month') return 'Wybierz miesiąc';
  if (booking.dateStep === 'day') return 'Wybierz dzień';
  return 'Wybierz godzinę';
}

// ── Date step picker (shared between slots & guest-form) ──

function DateStepPicker({ booking }: { booking: BookingState }) {
  if (booking.loadingDates) return <p className="booking-loading">Ładowanie dostępnych terminów...</p>;
  if (booking.availableDates.length === 0) return <p className="booking-empty">Brak dostępnych terminów w najbliższych miesiącach</p>;

  if (booking.dateStep === 'month') {
    return (
      <div className="booking-step">
        <h4 className="booking-step__title">Wybierz miesiąc</h4>
        <div className="booking-months-grid">
          {booking.monthKeys.map(monthKey => (
            <button key={monthKey} className="booking-month-btn" onClick={() => booking.selectMonth(monthKey)}>
              <span className="booking-month-btn__name">{formatMonthName(monthKey)}</span>
              <span className="booking-month-btn__count">{booking.groupedDates[monthKey]!.length} dni</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (booking.dateStep === 'day') {
    return (
      <div className="booking-step">
        {booking.hasMultipleMonths && (
          <button className="booking-step__back" onClick={booking.goBack}>← Wróć</button>
        )}
        <h4 className="booking-step__title">{formatMonthName(booking.selectedMonth!)}</h4>
        <div className="booking-month__dates">
          {booking.datesForMonth.map(dateStr => {
            const date = new Date(dateStr);
            return (
              <button key={dateStr} className="booking-date" onClick={() => booking.loadSlotsForDate(dateStr)}>
                <span className="booking-date__day">{date.toLocaleDateString('pl-PL', { weekday: 'short' })}</span>
                <span className="booking-date__num">{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (booking.dateStep === 'time') {
    const dateLabel = new Date(booking.selectedDate!).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
    return (
      <div className="booking-step">
        <button className="booking-step__back" onClick={booking.goBack}>← Wróć</button>
        <h4 className="booking-step__title">{dateLabel}</h4>
        {booking.loadingSlots ? (
          <p className="booking-slots__loading">Ładowanie godzin...</p>
        ) : booking.availableSlots.length === 0 ? (
          <p className="booking-slots__empty">Brak dostępnych godzin w tym dniu</p>
        ) : (
          <div className="booking-slots__grid">
            {booking.availableSlots.map((slot: SlotDto, i: number) => (
              <button
                key={i}
                className={`booking-slot ${booking.selectedSlot?.startsAt === slot.startsAt ? 'booking-slot--selected' : ''}`}
                onClick={() => booking.selectSlot(slot)}
              >
                {formatSlotTime(slot.startsAt)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ── Choice step ──

function ChoiceStep({ onLogin, onGuest }: { onLogin: () => void; onGuest: () => void }) {
  return (
    <div className="modal-body booking-choice">
      <p className="booking-choice__hint">Jak chcesz się umówić?</p>
      <button className="booking-choice__btn" onClick={onLogin}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Zaloguj się</span>
        <small>Pełna historia wizyt, powiadomienia</small>
      </button>
      <button className="booking-choice__btn booking-choice__btn--ghost" onClick={onGuest}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          <path d="M19 11l2 2-2 2" />
        </svg>
        <span>Kontynuuj jako gość</span>
        <small>Tylko imię, e-mail i numer telefonu</small>
      </button>
    </div>
  );
}

// ── Guest form ──

function GuestForm({ booking }: { booking: BookingState }) {
  const { guestForm, guestErrors } = booking;

  return (
    <div className="guest-form">
      <p className="guest-form__slot">
        Wybrany termin:{' '}
        <strong>
          {new Date(booking.selectedSlot!.startsAt).toLocaleString('pl-PL', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </strong>
        <button className="guest-form__change-slot" onClick={booking.changeSlot}>Zmień</button>
      </p>
      <div className="guest-form__field">
        <label>Imię i nazwisko *</label>
        <input
          type="text"
          value={guestForm.name}
          onChange={e => booking.updateGuestField('name', e.target.value)}
          placeholder="Jan Kowalski"
          className={guestErrors.name ? 'guest-form__input--error' : ''}
        />
        {guestErrors.name && <span className="guest-form__error">{guestErrors.name}</span>}
      </div>
      <div className="guest-form__field">
        <label>E-mail *</label>
        <input
          type="email"
          value={guestForm.email}
          onChange={e => booking.updateGuestField('email', e.target.value)}
          placeholder="jan@email.com"
          className={guestErrors.email ? 'guest-form__input--error' : ''}
        />
        {guestErrors.email && <span className="guest-form__error">{guestErrors.email}</span>}
      </div>
      <div className="guest-form__field">
        <label>Numer telefonu</label>
        <input type="tel" value={guestForm.phone} onChange={e => booking.updateGuestField('phone', e.target.value)} placeholder="+48 600 000 000" />
      </div>
      <div className="guest-form__field">
        <label>Wiadomość (opcjonalnie)</label>
        <textarea rows={3} value={guestForm.message} onChange={e => booking.updateGuestField('message', e.target.value)} placeholder="Napisz coś o czym chcesz porozmawiać..." />
      </div>
    </div>
  );
}

// ── Success view ──

function BookingSuccess({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-body booking-success">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      <h3>Wniosek wysłany!</h3>
      <p>Specjalista sprawdzi Twój wniosek i – jeśli zaakceptuje – wyślemy Ci e-mail z linkiem do płatności.</p>
      <button className="modal-button modal-button--primary" onClick={onClose}>Zamknij</button>
    </div>
  );
}

// ── Main modal ──

interface BookingModalProps {
  booking: BookingState;
  onLogin: () => void;
  onConfirmBooking: () => void;
  onConfirmGuestBooking: () => void;
}

export function BookingModal({ booking, onLogin, onConfirmBooking, onConfirmGuestBooking }: BookingModalProps) {
  if (!booking.isOpen) return null;

  const showSlotsFooter = booking.step === 'slots';
  const showGuestFooter = booking.step === 'guest-form' && !booking.guestSuccess && !!booking.selectedSlot;

  return (
    <div className="modal-overlay" onClick={booking.close}>
      <div className="modal-content modal-content--booking" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{getModalTitle(booking)}</h3>
          <button className="modal-close" onClick={booking.close}>✕</button>
        </div>

        {booking.step === 'choice' && (
          <ChoiceStep onLogin={onLogin} onGuest={booking.startGuestFlow} />
        )}

        {booking.step === 'slots' && (
          <div className="modal-body">
            <DateStepPicker booking={booking} />
          </div>
        )}

        {booking.step === 'guest-form' && !booking.guestSuccess && (
          <div className="modal-body">
            {!booking.selectedSlot ? <DateStepPicker booking={booking} /> : <GuestForm booking={booking} />}
          </div>
        )}

        {booking.step === 'guest-form' && booking.guestSuccess && (
          <BookingSuccess onClose={booking.close} />
        )}

        {showSlotsFooter && (
          <div className="modal-footer">
            <button className="modal-button modal-button--cancel" onClick={booking.close}>Anuluj</button>
            <button
              className="modal-button modal-button--primary"
              onClick={onConfirmBooking}
              disabled={!booking.selectedSlot || booking.submitting}
            >
              {booking.submitting ? 'Wysyłanie...' : 'Wyślij wniosek'}
            </button>
          </div>
        )}

        {showGuestFooter && (
          <div className="modal-footer">
            <button className="modal-button modal-button--cancel" onClick={booking.close}>Anuluj</button>
            <button
              className="modal-button modal-button--primary"
              onClick={onConfirmGuestBooking}
              disabled={booking.submitting}
            >
              {booking.submitting ? 'Wysyłanie...' : 'Wyślij wniosek'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

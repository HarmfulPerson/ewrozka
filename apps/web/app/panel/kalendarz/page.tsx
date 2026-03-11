'use client';

import { useEffect, useState } from 'react';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetMyAvailability, apiGetMyAppointments, AvailabilityDto, AppointmentDto } from '../../lib/api-calendar';
import { apiGetWizardGuestBookings, GuestBookingDto } from '../../lib/api-meetings';
import { CalendarWeek } from './components/calendar-week';
import './kalendarz.css';

export default function KalendarzPage() {
  const [user] = useState(() => getStoredUser());
  const [availabilities, setAvailabilities] = useState<AvailabilityDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [guestBookings, setGuestBookings] = useState<GuestBookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [availRes, apptRes, guestRes] = await Promise.all([
          apiGetMyAvailability(user.token, { limit: 1000 }), // Get all for calendar
          apiGetMyAppointments(user.token),
          apiGetWizardGuestBookings(user.token),
        ]);

        setAvailabilities(availRes.availabilities);
        setAppointments(apptRes.appointments);
        setGuestBookings(guestRes.bookings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nie udało się załadować kalendarza');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="panel-page">
        <div className="calendar-week-loading">Ładowanie kalendarza…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-page">
        <h1 className="panel-page__title">Kalendarz</h1>
        <p style={{ color: 'var(--text-muted)', padding: '2rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Kalendarz</h1>
      </div>

      <CalendarWeek
        availabilities={availabilities}
        appointments={appointments}
        guestBookings={guestBookings}
        token={user?.token ?? ''}
        onRefresh={() => {
          // Nie używamy setLoading(true) tutaj – żeby nie resetować tygodnia w CalendarWeek
          if (user) {
            Promise.all([
              apiGetMyAvailability(user.token, { limit: 1000 }),
              apiGetMyAppointments(user.token),
              apiGetWizardGuestBookings(user.token),
            ]).then(([availRes, apptRes, guestRes]) => {
              setAvailabilities(availRes.availabilities);
              setAppointments(apptRes.appointments);
              setGuestBookings(guestRes.bookings);
            });
          }
        }}
      />
    </div>
  );
}

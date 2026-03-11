/**
 * API dla wniosków o spotkanie i wizyt
 */

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api';

async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = `${getBaseUrl()}/${endpoint}`;
  
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };
  
  if (options?.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export interface MeetingRequestDto {
  id: number;
  advertisementId: number;
  advertisementTitle?: string;
  clientId?: number;
  clientUsername?: string;
  wrozkaId?: number;
  wrozkaUsername?: string;
  requestedStartsAt: string | null;
  preferredDate?: string | null;
  message?: string;
  status: string;
  createdAt?: string;
  appointment?: {
    appointmentId: number;
    status: string;
    startsAt: string;
    meetingToken: string | null;
  } | null;
}

export async function apiCreateMeetingRequest(
  token: string,
  data: {
    advertisementId: number;
    requestedStartsAt: string;
    message?: string;
  }
): Promise<{ id: number; requestedStartsAt: string | null; message: string }> {
  return fetchApi('meeting-requests', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({ meetingRequest: data }),
  });
}

export async function apiGetMyMeetingRequests(
  token: string,
  options?: { status?: string; limit?: number; offset?: number },
): Promise<{ requests: MeetingRequestDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  
  return fetchApi(`meeting-requests/for-my-ads?${params.toString()}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiGetMyClientRequests(
  token: string,
  options?: { status?: string; limit?: number; offset?: number },
): Promise<{ requests: MeetingRequestDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  
  return fetchApi(`meeting-requests/my-requests?${params.toString()}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiAcceptMeetingRequest(token: string, id: number): Promise<{ appointmentId: number; startsAt: string; status: string }> {
  return fetchApi(`meeting-requests/${id}/accept`, {
    method: 'PATCH',
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiRejectMeetingRequest(token: string, id: number): Promise<{ status: string }> {
  return fetchApi(`meeting-requests/${id}/reject`, {
    method: 'PATCH',
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiPayForAppointment(token: string, id: number): Promise<{ url: string }> {
  return fetchApi(`appointments/${id}/pay`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

// ── Guest bookings ──────────────────────────────────────────────────────────

export interface GuestBookingDto {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  message?: string | null;
  scheduledAt: string;
  durationMinutes: number;
  priceGrosze: number;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
  advertisementTitle?: string | null;
}

export async function apiCreateGuestBooking(data: {
  advertisementId: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  message?: string;
  scheduledAt: string;
}): Promise<{ id: string }> {
  return fetchApi('guest-bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiGetWizardGuestBookings(token: string): Promise<{ bookings: GuestBookingDto[] }> {
  return fetchApi('wizard/guest-bookings', {
    headers: { Authorization: `Token ${token}` },
  });
}

export async function apiAcceptGuestBooking(token: string, id: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/wizard/guest-bookings/${id}/accept`, {
    method: 'POST',
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok && res.status !== 204) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message ?? `HTTP ${res.status}`);
  }
}

export async function apiRejectGuestBooking(token: string, id: string, reason?: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/wizard/guest-bookings/${id}/reject`, {
    method: 'POST',
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok && res.status !== 204) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message ?? `HTTP ${res.status}`);
  }
}

export async function apiGetGuestBookingDetails(bookingId: string): Promise<{
  id: string;
  guestName: string;
  wizardName: string;
  advertisementTitle: string;
  scheduledAt: string;
  durationMinutes: number;
  priceGrosze: number;
  status: string;
}> {
  return fetchApi(`guest-bookings/${bookingId}/details`);
}

export async function apiCreateGuestPaymentSession(bookingId: string): Promise<{ url: string }> {
  return fetchApi(`guest-bookings/${bookingId}/pay`, { method: 'POST' });
}

export async function apiGetGuestMeetingRoom(guestToken: string): Promise<{
  roomUrl: string;
  token: string;
  booking: { wizardName: string; scheduledAt: string; durationMinutes: number; guestName: string };
}> {
  return fetchApi(`guest-bookings/room/${guestToken}`);
}

export async function apiGetWizardGuestBookingMeetingRoom(
  token: string,
  bookingId: string,
): Promise<{
  roomUrl: string;
  token: string;
  booking: { guestName: string; scheduledAt: string; durationMinutes: number };
}> {
  const res = await fetch(`${getBaseUrl()}/wizard/guest-bookings/${bookingId}/meeting-room`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

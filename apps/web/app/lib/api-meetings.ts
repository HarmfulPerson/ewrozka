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
  /** Stable non-sequential external identifier. Prefer this over `id` in URLs. */
  uid: string;
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
    /** Prefer advertisementUid. Kept for legacy callers during the migration. */
    advertisementId?: number;
    advertisementUid?: string;
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
  options?: { status?: string; limit?: number; offset?: number; sortBy?: string; order?: string },
): Promise<{ requests: MeetingRequestDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  if (options?.sortBy) params.append('sortBy', options.sortBy);
  if (options?.order) params.append('order', options.order);

  return fetchApi(`meeting-requests/for-my-ads?${params.toString()}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiGetMyClientRequests(
  token: string,
  options?: { status?: string; limit?: number; offset?: number; sortBy?: string; order?: string },
): Promise<{ requests: MeetingRequestDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  if (options?.sortBy) params.append('sortBy', options.sortBy);
  if (options?.order) params.append('order', options.order);

  return fetchApi(`meeting-requests/my-requests?${params.toString()}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

/**
 * Accept a meeting request. Accepts either the new uid (preferred) or the
 * legacy numeric id — routes to the corresponding backend endpoint. Once
 * every caller migrates to uid the legacy branch can be deleted.
 */
export async function apiAcceptMeetingRequest(
  token: string,
  uidOrId: string | number,
): Promise<{ appointmentId: number; startsAt: string; status: string }> {
  const isUid = typeof uidOrId === 'string' && /^[0-9a-f]{8}-/i.test(uidOrId);
  const path = isUid
    ? `meeting-requests/uid/${uidOrId}/accept`
    : `meeting-requests/${uidOrId}/accept`;
  return fetchApi(path, {
    method: 'PATCH',
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiRejectMeetingRequest(
  token: string,
  uidOrId: string | number,
  reason?: string,
): Promise<{ status: string }> {
  const isUid = typeof uidOrId === 'string' && /^[0-9a-f]{8}-/i.test(uidOrId);
  const path = isUid
    ? `meeting-requests/uid/${uidOrId}/reject`
    : `meeting-requests/${uidOrId}/reject`;
  return fetchApi(path, {
    method: 'PATCH',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: reason?.trim() || undefined }),
  });
}

export async function apiPayForAppointment(
  token: string,
  uidOrId: string | number,
): Promise<{ url: string }> {
  const isUid = typeof uidOrId === 'string' && /^[0-9a-f]{8}-/i.test(uidOrId);
  const path = isUid ? `appointments/uid/${uidOrId}/pay` : `appointments/${uidOrId}/pay`;
  return fetchApi(path, {
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
  /** Prefer advertisementUid. Kept for legacy callers during the migration. */
  advertisementId?: number;
  advertisementUid?: string;
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

export async function apiGetWizardGuestBookings(
  token: string,
  options?: { status?: string; limit?: number; offset?: number; sortBy?: string; order?: string },
): Promise<{ bookings: GuestBookingDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  if (options?.sortBy) params.append('sortBy', options.sortBy);
  if (options?.order) params.append('order', options.order);

  return fetchApi(`wizard/guest-bookings?${params.toString()}`, {
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

// ── Unified wizard requests ────────────────────────────────────────────────

export interface UnifiedRequestDto {
  id: string;
  /** Stable external identifier. For kind='regular' → meeting_request uid; for kind='guest' → guest_booking id (already uuid). */
  uid: string;
  /** uid of the linked appointment, if one exists. */
  appointmentUid: string | null;
  kind: 'regular' | 'guest';
  unifiedStatus: string;
  createdAt: string;
  scheduledAt: string | null;
  message: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  advertisementTitle: string | null;
  advertisementId: number | null;
  rejectionReason: string | null;
  appointmentId: number | null;
  appointmentStatus: string | null;
  appointmentStartsAt: string | null;
  meetingToken: string | null;
  durationMinutes: number | null;
  priceGrosze: number | null;
}

export async function apiGetWizardUnifiedRequests(
  token: string,
  options?: { status?: string; limit?: number; offset?: number; sortBy?: string; order?: string },
): Promise<{ items: UnifiedRequestDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  if (options?.sortBy) params.append('sortBy', options.sortBy);
  if (options?.order) params.append('order', options.order);

  return fetchApi(`wizard/requests?${params.toString()}`, {
    headers: { Authorization: `Token ${token}` },
  });
}

// ── Client unified requests ────────────────────────────────────────────────

export interface ClientRequestDto {
  id: string;
  /** Stable external identifier. For kind='request' → meeting_request uid; for kind='appointment' → appointment uid. */
  uid: string;
  /** uid of the linked appointment. Equals `uid` for kind='appointment', null for kind='request'. */
  appointmentUid: string | null;
  kind: 'request' | 'appointment';
  unifiedStatus: string;
  createdAt: string;
  scheduledAt: string | null;
  message: string | null;
  wrozkaUsername: string | null;
  advertisementTitle: string | null;
  advertisementId: number | null;
  rejectionReason: string | null;
  appointmentId: number | null;
  meetingToken: string | null;
  durationMinutes: number | null;
  priceGrosze: number | null;
  rating: number | null;
  ratingComment: string | null;
}

export async function apiGetClientUnifiedRequests(
  token: string,
  options?: { status?: string; limit?: number; offset?: number; sortBy?: string; order?: string },
): Promise<{ items: ClientRequestDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  if (options?.sortBy) params.append('sortBy', options.sortBy);
  if (options?.order) params.append('order', options.order);

  return fetchApi(`client/requests?${params.toString()}`, {
    headers: { Authorization: `Token ${token}` },
  });
}

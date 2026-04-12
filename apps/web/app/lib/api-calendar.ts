/**
 * API dla kalendarza, dostępności i appointmentów
 */

import { getApiBaseUrl } from './api';

const getBaseUrl = getApiBaseUrl;

async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = `${getBaseUrl()}/${endpoint}`;
  
  // Don't set Content-Type for DELETE requests without body
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };
  
  if (options?.body) {
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

export interface AvailabilityDto {
  uid: string;
  startsAt: string;
  endsAt: string;
}

export interface AppointmentDto {
  uid: string;
  wrozkaId: string;
  clientId: string;
  startsAt: string;
  durationMinutes: number;
  status: string;
  priceGrosze: number;
  advertisementId: string;
  advertisementTitle?: string;
  clientUsername?: string;
  wrozkaUsername?: string;
  meetingToken?: string | null;
  rating?: number | null;
}

export async function apiRateAppointment(
  token: string,
  uid: string,
  rating: number,
  comment?: string,
): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/appointments/uid/${uid}/rate`, {
    method: 'POST',
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment: comment?.trim() || undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Nie udało się zapisać oceny');
  }
}

export interface ReviewDto {
  uid: string;
  rating: number;
  comment: string | null;
  clientUsername: string;
  createdAt: string;
}

export async function apiGetWizardReviews(
  wizardUid: string,
  page = 1,
  limit = 5,
): Promise<{ reviews: ReviewDto[]; total: number; pages: number }> {
  return fetchApi(`appointments/reviews/uid/${wizardUid}?page=${page}&limit=${limit}`);
}

export async function apiGetMyAvailability(
  token: string,
  options?: { filter?: string; limit?: number; offset?: number; sortOrder?: 'ASC' | 'DESC' },
): Promise<{ availabilities: AvailabilityDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.filter) params.append('filter', options.filter);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset !== undefined) params.append('offset', String(options.offset));
  if (options?.sortOrder) params.append('sortOrder', options.sortOrder);

  return fetchApi(`availability/mine?${params.toString()}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiCreateAvailability(
  token: string,
  data: { startsAt: string; endsAt: string },
): Promise<{ uid: string; startsAt: string; endsAt: string }> {
  return fetchApi('availability', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({ availability: data }),
  });
}

export async function apiDeleteAvailability(token: string, uid: string): Promise<void> {
  await fetchApi(`availability/${uid}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiGetMyAppointments(
  token: string,
  options?: { status?: string; filter?: string; limit?: number; offset?: number },
): Promise<{ appointments: AppointmentDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.filter) params.append('filter', options.filter);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  
  return fetchApi(`appointments?${params.toString()}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiGetUpcomingAppointments(
  token: string,
  options?: { limit?: number },
): Promise<{ appointments: AppointmentDto[] }> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', String(options.limit));

  return fetchApi(`appointments/upcoming?${params.toString()}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiGetCompletedAppointments(
  token: string,
  options?: { limit?: number; offset?: number; unratedOnly?: boolean },
): Promise<{ appointments: AppointmentDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  if (options?.unratedOnly) params.append('unratedOnly', 'true');

  return fetchApi(`appointments/completed?${params.toString()}`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

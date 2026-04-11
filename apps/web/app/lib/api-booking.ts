/**
 * API dla rezerwacji slotów czasowych
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

export interface SlotDto {
  startsAt: string;
  endsAt: string;
  date: string;
  startTime: string;
}

/**
 * Fetch available slots for an advertisement. Accepts either the new uid
 * (preferred) or the legacy numeric id.
 */
export async function apiGetAvailableSlots(
  advertisementUidOrId: string | number,
  fromDate: string,
  toDate: string,
): Promise<{ slots: SlotDto[]; count: number }> {
  const isUid =
    typeof advertisementUidOrId === 'string' &&
    /^[0-9a-f]{8}-/i.test(advertisementUidOrId);
  const path = isUid
    ? `availability/slots/uid/${advertisementUidOrId}`
    : `availability/slots/${advertisementUidOrId}`;
  return fetchApi(`${path}?fromDate=${fromDate}&toDate=${toDate}`);
}

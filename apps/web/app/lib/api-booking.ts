/**
 * API dla rezerwacji slotów czasowych
 */

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api';

async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = `${getBaseUrl()}/${endpoint}`;
  
  const headers: Record<string, string> = {
    ...options?.headers,
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

export async function apiGetAvailableSlots(
  advertisementId: number,
  fromDate: string,
  toDate: string,
): Promise<{ slots: SlotDto[]; count: number }> {
  return fetchApi(`availability/slots/${advertisementId}?fromDate=${fromDate}&toDate=${toDate}`);
}

/**
 * API dla ogłoszeń (advertisements)
 */

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api';

export function getUploadsBaseUrl(): string {
  const base = getBaseUrl();
  return base.replace(/\/api\/?$/, '') || base;
}

async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = `${getBaseUrl()}/${endpoint}`;
  
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };
  
  // Don't set Content-Type for FormData or if no body
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

export interface AdvertisementDto {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  priceGrosze: number;
  durationMinutes: number;
  userId: number;
}

export async function apiGetMyAdvertisements(token: string): Promise<{ advertisements: AdvertisementDto[]; advertisementsCount: number }> {
  return fetchApi('advertisements/mine', {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiCreateAdvertisement(
  token: string,
  data: {
    title: string;
    description: string;
    priceGrosze: number;
    durationMinutes: number;
  },
  imageFile?: File,
): Promise<{ advertisement: AdvertisementDto }> {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('priceGrosze', data.priceGrosze.toString());
  formData.append('durationMinutes', data.durationMinutes.toString());
  
  if (imageFile) {
    formData.append('image', imageFile);
  }

  return fetchApi('advertisements', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
    },
    body: formData,
  });
}

export async function apiUpdateAdvertisement(
  token: string,
  id: number,
  data: { title?: string; description?: string; priceGrosze?: number; durationMinutes?: number },
): Promise<{ advertisement: AdvertisementDto }> {
  return fetchApi(`advertisements/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Token ${token}` },
    body: JSON.stringify(data),
  });
}

export async function apiDeleteAdvertisement(token: string, id: number): Promise<void> {
  await fetchApi(`advertisements/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

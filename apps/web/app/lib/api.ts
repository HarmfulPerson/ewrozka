/**
 * Klient API eWróżka (realworld-api).
 * Base URL: NEXT_PUBLIC_API_URL (np. http://localhost:8001/api)
 */

function getApiBaseUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001').replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

const getBaseUrl = getApiBaseUrl;

/** Eksportowana – do budowania URL-i API w innych modułach. */
export { getApiBaseUrl };

/** URL bazowy serwera (bez /api) – do serwowania uploadów. */
export function getUploadsBaseUrl(): string {
  const base = getBaseUrl();
  return base.replace(/\/api\/?$/, '') || base;
}

/** Pełny URL do zdjęcia z uploads (path np. /uploads/users/1/photo_1.jpg). */
export function getUploadUrl(path: string | null | undefined): string {
  if (!path || !path.startsWith('/')) return path ?? '';
  return getUploadsBaseUrl() + path;
}

export interface ApiUser {
  email: string;
  token: string | null;
  username: string;
  bio: string;
  image: string;
  image2?: string;
  image3?: string;
  roles: string[];
  topicIds?: number[];
  topicNames?: string[];
  id: number;
  emailVerified?: boolean;
}

export interface WizardDto {
  id: number;
  username: string;
  bio: string;
  image: string;
  image2?: string;
  image3?: string;
  video?: string | null;
  topicIds: number[];
  topicNames: string[];
  avgRating?: number | null;
  ratingsCount?: number;
  isFeatured?: boolean;
}

export interface WizardsListResponse {
  wizards: WizardDto[];
  wizardsCount: number;
  total: number;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  bio?: string;
  /** 9 cyfr – backend doda prefix +48 */
  phone?: string;
  topicIds?: number[];
  roleNames?: string[];
}

export interface TopicDto {
  id: number;
  name: string;
}

export interface UpdateUserData {
  username?: string;
  bio?: string;
  image?: string;
  image2?: string;
  image3?: string;
  email?: string;
  password?: string;
  topicIds?: number[];
}

async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = `${getBaseUrl()}/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function apiLogin(data: LoginData): Promise<{ user: ApiUser }> {
  return fetchApi('users/login', {
    method: 'POST',
    body: JSON.stringify({ user: data }),
  });
}

export async function apiRegister(data: RegisterData): Promise<{ user: ApiUser }> {
  return fetchApi('users', {
    method: 'POST',
    body: JSON.stringify({ user: data }),
  });
}

export async function apiVerifyEmail(token: string): Promise<{ message: string }> {
  return fetchApi(`auth/verify-email?token=${encodeURIComponent(token)}`);
}

/** Pobiera dane profilu Google z tokena tymczasowego (dla dokończenia rejestracji). */
export async function apiGetGoogleTempProfile(temp: string): Promise<{
  email: string;
  displayName: string;
  picture?: string;
}> {
  return fetchApi(`auth/google-temp?temp=${encodeURIComponent(temp)}`);
}

/** Dokończenie rejestracji po Google – klient lub wróżka. */
export async function apiCompleteGoogleRegistration(data: {
  tempToken: string;
  role: 'client' | 'wizard';
  username?: string;
  bio?: string;
  phone?: string;
  topicIds?: number[];
}): Promise<{ user: ApiUser } | { id: string }> {
  return fetchApi('auth/register-google', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiGetCurrentUser(token: string): Promise<{ user: ApiUser }> {
  return fetchApi('user', {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export async function apiUpdateUser(
  token: string,
  data: UpdateUserData,
): Promise<{ user: ApiUser }> {
  return fetchApi('user', {
    method: 'PUT',
    headers: {
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({ user: data }),
  });
}

export async function apiChangePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return fetchApi('user/change-password', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function apiGetWizards(params?: {
  limit?: number;
  offset?: number;
  name?: string;
  topicIds?: number[];
  minRating?: number;
}): Promise<WizardsListResponse> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());
  if (params?.name) query.set('name', params.name);
  if (params?.topicIds?.length) query.set('topicIds', params.topicIds.join(','));
  if (params?.minRating) query.set('minRating', params.minRating.toString());
  const queryStr = query.toString() ? `?${query.toString()}` : '';
  return fetchApi(`wizards${queryStr}`);
}


export async function apiGetWizard(userId: number): Promise<{ wizard: WizardDto }> {
  return fetchApi(`wizards/${userId}`);
}

export interface AdvertisementDto {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  priceGrosze: number;
  durationMinutes: number;
  userId: number;
}

export interface AdvertisementDetailDto {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  priceGrosze: number;
  durationMinutes: number;
  wizard: {
    id: number;
    username: string;
    image: string;
    topicNames: string[];
  };
}

export async function apiGetWizardAdvertisements(wizardId: number): Promise<{ advertisements: AdvertisementDto[]; advertisementsCount: number }> {
  return fetchApi(`advertisements/wizard/${wizardId}`);
}

export async function apiGetAdvertisement(id: number): Promise<{ advertisement: AdvertisementDetailDto }> {
  return fetchApi(`advertisements/${id}`);
}

export async function apiGetTopics(): Promise<TopicDto[]> {
  const res = await fetchApi('topics');
  return Array.isArray(res) ? res : (res.topics ?? []);
}

/** Złóż wniosek o konto wróżki – zwraca UUID wniosku. */
export async function apiSubmitWizardApplication(data: {
  email: string;
  username: string;
  password: string;
  bio: string;
  phone?: string;
  topicIds?: number[];
}): Promise<{ id: string }> {
  const url = `${getBaseUrl()}/wizard-applications`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Prześlij zdjęcie do wniosku wróżki (bez autoryzacji, tylko UUID). */
export async function apiUploadWizardApplicationPhoto(
  applicationId: string,
  file: File,
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('photo', file);

  const url = `${getBaseUrl()}/wizard-applications/${applicationId}/photo`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiDeleteVideo(token: string): Promise<void> {
  const url = `${getBaseUrl()}/user/video`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    let msg = 'Nie udało się usunąć filmiku';
    try { const j = await res.json(); msg = j?.message ?? msg; } catch {}
    throw new Error(msg);
  }
}

export async function apiUploadVideo(
  token: string,
  file: File,
): Promise<{ videoUrl: string }> {
  const formData = new FormData();
  formData.append('video', file);

  const url = `${getBaseUrl()}/user/video`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
    body: formData,
  });

  if (!res.ok) {
    let msg = 'Nie udało się przesłać wideo';
    try {
      const json = await res.json();
      msg = json?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function apiUploadAvatar(
  token: string,
  file: File,
  slot: 'image' | 'image2' | 'image3' = 'image',
): Promise<{ user: ApiUser }> {
  const formData = new FormData();
  formData.append('image', file);

  const url = `${getBaseUrl()}/user/photos?slot=${slot}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Token ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  return res.json();
}

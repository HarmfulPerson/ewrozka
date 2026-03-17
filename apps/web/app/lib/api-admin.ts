function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;
  return `${apiBase}/${path}`;
}

async function fetchAdmin<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const method = options?.method?.toUpperCase() ?? 'GET';
  const hasBody = options?.body !== undefined;
  const needsBody = ['POST', 'PUT', 'PATCH'].includes(method);

  const res = await fetch(apiUrl(path), {
    ...options,
    body: hasBody ? options!.body : needsBody ? JSON.stringify({}) : undefined,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as unknown as T;
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

export type WizardApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface WizardApplicationDto {
  /** UUID wniosku */
  id: string;
  username: string;
  email: string;
  bio: string;
  image: string;
  /** Numer telefonu z prefixem +48 – widoczny tylko dla admina */
  phone: string | null;
  wizardApplicationStatus: WizardApplicationStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export async function apiGetWizardApplication(
  token: string,
  applicationId: string,
): Promise<WizardApplicationDto> {
  return fetchAdmin<WizardApplicationDto>(
    `admin/wizard-applications/${applicationId}`,
    token,
  );
}

export interface WizardApplicationsPage {
  data: WizardApplicationDto[];
  total: number;
  page: number;
  limit: number;
}

export async function apiGetWizardApplications(
  token: string,
  status?: WizardApplicationStatus,
  page: number = 1,
  limit: number = 5,
): Promise<WizardApplicationsPage> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return fetchAdmin<WizardApplicationsPage>(
    `admin/wizard-applications?${params.toString()}`,
    token,
  );
}

export async function apiApproveWizardApplication(
  token: string,
  userId: string,
): Promise<void> {
  await fetchAdmin<unknown>(
    `admin/wizard-applications/${userId}/approve`,
    token,
    { method: 'POST' },
  );
}

export async function apiRejectWizardApplication(
  token: string,
  applicationId: string,
  reason?: string,
): Promise<void> {
  await fetchAdmin<unknown>(
    `admin/wizard-applications/${applicationId}/reject`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? '' }),
    },
  );
}

// ─── Lista wróżek (admin) ─────────────────────────────────────────────────────

export type AdminWizardsSortBy =
  | 'name'
  | 'joinDate'
  | 'earnedGrosze'
  | 'meetingsCount'
  | 'announcementsCount'
  | 'pendingVideo';

export interface AdminWizardRow {
  id: number;
  username: string;
  email: string;
  image: string;
  createdAt: string;
  meetingsCount: number;
  earnedGrosze: number;
  announcementsCount: number;
  isAvailableNow: boolean;
  isFeatured: boolean;
  hasPendingVideo?: boolean;
}

export interface AdminWizardsPage {
  data: AdminWizardRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminWizardsFilters {
  minMeetings?: number;
  maxMeetings?: number;
  minEarnedGrosze?: number;
  maxEarnedGrosze?: number;
  availableNow?: boolean;
}

export async function apiGetAdminWizards(
  token: string,
  filters: AdminWizardsFilters = {},
  sortBy: AdminWizardsSortBy = 'joinDate',
  sortOrder: 'asc' | 'desc' = 'desc',
  page: number = 1,
  limit: number = 10,
): Promise<AdminWizardsPage> {
  const params = new URLSearchParams();
  if (filters.minMeetings != null) params.set('minMeetings', String(filters.minMeetings));
  if (filters.maxMeetings != null) params.set('maxMeetings', String(filters.maxMeetings));
  if (filters.minEarnedGrosze != null) params.set('minEarnedGrosze', String(filters.minEarnedGrosze));
  if (filters.maxEarnedGrosze != null) params.set('maxEarnedGrosze', String(filters.maxEarnedGrosze));
  if (filters.availableNow) params.set('availableNow', 'true');
  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return fetchAdmin<AdminWizardsPage>(`admin/wizards?${params.toString()}`, token);
}

export interface AdminWizardDetail {
  id: number;
  username: string;
  email: string;
  image: string;
  bio: string;
  phone: string | null;
  createdAt: string;
  meetingsCount: number;
  earnedGrosze: number;
  announcementsCount: number;
  isAvailableNow: boolean;
  isFeatured: boolean;
  featuredExpiresAt: string | null;
  topicNames: string[];
  platformFeePercent: number | null;
  tierBasedFee?: { meetingsInWindow: number; windowDays: number; feePercent: number };
  video: string | null;
  videoPending: string | null;
}

export async function apiGetAdminWizard(
  token: string,
  wizardId: number,
): Promise<AdminWizardDetail> {
  return fetchAdmin<AdminWizardDetail>(`admin/wizards/${wizardId}`, token);
}

export async function apiSetAdminWizardFeatured(
  token: string,
  wizardId: number,
): Promise<void> {
  await fetchAdmin<unknown>(`admin/wizards/${wizardId}/featured`, token, {
    method: 'POST',
  });
}

export async function apiUpdateAdminWizardPlatformFee(
  token: string,
  wizardId: number,
  platformFeePercent: number,
): Promise<void> {
  await fetchAdmin<unknown>(
    `admin/wizards/${wizardId}/platform-fee`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ platformFeePercent }),
    },
  );
}

export async function apiResetWizardPlatformFeeToTier(
  token: string,
  wizardId: number,
): Promise<void> {
  await fetchAdmin<unknown>(
    `admin/wizards/${wizardId}/platform-fee/reset-to-tier`,
    token,
    { method: 'POST' },
  );
}

export async function apiApproveWizardVideo(
  token: string,
  wizardId: number,
): Promise<void> {
  await fetchAdmin<unknown>(
    `admin/wizards/${wizardId}/video/approve`,
    token,
    { method: 'POST' },
  );
}

export async function apiRejectWizardVideo(
  token: string,
  wizardId: number,
): Promise<void> {
  await fetchAdmin<unknown>(
    `admin/wizards/${wizardId}/video/reject`,
    token,
    { method: 'POST' },
  );
}

/** Konfiguracja progów prowizji (okno + progi). */
export interface CommissionTierConfig {
  windowDays: number;
  tiers: { minMeetings: number; maxMeetings: number | null; feePercent: number }[];
}

export async function apiGetCommissionTierConfig(
  token: string,
): Promise<CommissionTierConfig> {
  return fetchAdmin<CommissionTierConfig>('admin/commission-tier-config', token);
}

export async function apiUpdateCommissionTierConfig(
  token: string,
  body: { windowDays?: number; tiers?: { minMeetings: number; maxMeetings: number | null; feePercent: number }[] },
): Promise<void> {
  await fetchAdmin<unknown>('admin/commission-tier-config', token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** Konfiguracja przypomnień o nadchodzących spotkaniach. */
export interface ReminderConfig {
  enabled48h: boolean;
  enabled24h: boolean;
  enabled1h: boolean;
  hoursSlot1: number;
  hoursSlot2: number;
  hoursSlot3: number;
}

export async function apiGetReminderConfig(token: string): Promise<ReminderConfig> {
  return fetchAdmin<ReminderConfig>('admin/reminder-config', token);
}

export async function apiUpdateReminderConfig(
  token: string,
  body: {
    enabled48h?: boolean;
    enabled24h?: boolean;
    enabled1h?: boolean;
    hoursSlot1?: number;
    hoursSlot2?: number;
    hoursSlot3?: number;
  },
): Promise<void> {
  await fetchAdmin<unknown>('admin/reminder-config', token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

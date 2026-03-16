import { getApiBaseUrl } from './api';

export interface CommissionTierDto {
  meetingsInWindow: number;
  windowDays: number;
  currentTier: { feePercent: number; minMeetings: number; maxMeetings: number | null };
  nextTier: { feePercent: number; minMeetings: number; maxMeetings: number | null } | null;
  platformFeePercent: number;
  /** true gdy admin ustawił prowizję ręcznie */
  isSetByAdmin?: boolean;
}

export interface WalletDto {
  balance: number;
  currency: string;
  balanceFormatted: string;
  platformFeePercent?: number;
  commissionTier?: CommissionTierDto;
}

export interface TransactionDto {
  id: number;
  appointmentId: number;
  advertisementTitle?: string;
  totalAmount: number;
  platformFee: number;
  wizardAmount: number;
  type: 'payment' | 'destination_charge' | 'withdrawal' | string;
  status: string;
  createdAt: string;
}

async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = `${getApiBaseUrl()}/${endpoint}`;
  console.log('[api-payment] Fetching:', url, 'Options:', options);
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });
  console.log('[api-payment] Response status:', response.status, 'OK:', response.ok);
  if (!response.ok) {
    const error = await response.text();
    console.error('[api-payment] Error response:', error);
    throw new Error(error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  console.log('[api-payment] Response data:', data);
  return data;
}

export async function apiGetWallet(token: string): Promise<WalletDto> {
  return fetchApi('payment/wallet', {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

export interface ConnectStatusDto {
  connected: boolean;
  onboardingCompleted: boolean;
  payoutsEnabled: boolean;
  stripeAccountId?: string;
  stripeAvailableGrosze?: number;
  stripePendingGrosze?: number;
  stripeTotalGrosze?: number;
  withdrawableGrosze?: number;
}

export interface WithdrawalDto {
  id: number;
  amountGrosze: number;
  amountFormatted: string;
  status: string;
  stripeTransferId: string | null;
  createdAt: string;
}

export async function apiGetConnectStatus(token: string): Promise<ConnectStatusDto> {
  return fetchApi('stripe/connect/status', {
    headers: { Authorization: `Token ${token}` },
  });
}

export async function apiCheckConnectReady(token: string): Promise<{ connected: boolean; onboardingCompleted: boolean; payoutsEnabled: boolean }> {
  return fetchApi('stripe/connect/quick-check', {
    headers: { Authorization: `Token ${token}` },
  });
}

export async function apiStartOnboarding(token: string): Promise<{ onboardingUrl: string; alreadyOnboarded: boolean }> {
  return fetchApi('stripe/connect/onboard', {
    method: 'POST',
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export async function apiCreateWithdrawal(
  token: string,
  amountGrosze: number,
): Promise<WithdrawalDto> {
  return fetchApi('stripe/connect/withdraw', {
    method: 'POST',
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountGrosze }),
  });
}

export async function apiGetWithdrawals(
  token: string,
  options?: { limit?: number; offset?: number },
): Promise<{ withdrawals: WithdrawalDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString();
  return fetchApi(query ? `stripe/connect/withdrawals?${query}` : 'stripe/connect/withdrawals', {
    headers: { Authorization: `Token ${token}` },
  });
}

// ─── Wyróżnienie wróżki (Featured) ────────────────────────────────────────────

export interface FeaturedConfigDto {
  priceGrosze: number;
  durationHours: number;
  slots: number;
  rotationSeconds: number;
}

export interface FeaturedStatusDto {
  isFeatured: boolean;
  expiresAt: string | null;
}

export async function apiGetFeaturedConfig(): Promise<FeaturedConfigDto> {
  return fetchApi('featured/config');
}

export async function apiGetMyFeaturedStatus(token: string): Promise<FeaturedStatusDto> {
  return fetchApi('featured/my-status', {
    headers: { Authorization: `Token ${token}` },
  });
}

export async function apiCreateFeaturedCheckout(token: string): Promise<{ url: string }> {
  return fetchApi('featured/checkout', {
    method: 'POST',
    headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export async function apiGetTransactions(
  token: string,
  options?: { limit?: number; offset?: number; sortBy?: 'date' | 'amount'; sortOrder?: 'ASC' | 'DESC' }
): Promise<{ transactions: TransactionDto[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  const query = params.toString();
  const endpoint = query ? `payment/transactions?${query}` : 'payment/transactions';

  return fetchApi(endpoint, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
}

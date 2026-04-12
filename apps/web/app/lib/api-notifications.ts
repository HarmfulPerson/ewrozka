const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api';

export interface NotificationDto {
  uid: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  meta: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export async function apiGetNotifications(
  token: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean },
): Promise<{ notifications: NotificationDto[]; total: number; unreadCount: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  if (options?.unreadOnly) params.append('unreadOnly', 'true');

  const res = await fetch(`${getBaseUrl()}/notifications?${params}`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiGetUnreadCount(token: string): Promise<number> {
  const res = await fetch(`${getBaseUrl()}/notifications/unread-count`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function apiMarkNotificationRead(token: string, uid: string): Promise<void> {
  await fetch(`${getBaseUrl()}/notifications/${uid}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Token ${token}` },
  });
}

export async function apiMarkAllNotificationsRead(token: string): Promise<void> {
  await fetch(`${getBaseUrl()}/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Token ${token}` },
  });
}

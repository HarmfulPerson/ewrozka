'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '../lib/api';
import type { NotificationDto } from '../lib/api-notifications';
import { apiGetNotifications, apiGetUnreadCount, apiMarkNotificationRead, apiMarkAllNotificationsRead } from '../lib/api-notifications';

function getServerBaseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001').replace(/\/+$/, '');
  return base.endsWith('/api') ? base.replace(/\/api\/?$/, '') : base;
}

const PAGE_SIZE = 5;

export interface UseNotificationsResult {
  pendingCount: number;
  unreadCount: number;
  notifications: NotificationDto[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(token: string | null | undefined): UseNotificationsResult {
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const hasMore = notifications.length < total;

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGetNotifications(token, { limit: PAGE_SIZE, offset: 0 });
      setNotifications(data.notifications);
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadMore = useCallback(async () => {
    if (!token || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await apiGetNotifications(token, { limit: PAGE_SIZE, offset: notifications.length });
      setNotifications(prev => [...prev, ...data.notifications]);
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [token, loadingMore, hasMore, notifications.length]);

  const markAsRead = useCallback(async (id: number) => {
    if (!token) return;
    await apiMarkNotificationRead(token, id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    await apiMarkAllNotificationsRead(token);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    // Initial REST fetch
    fetch(`${getApiBaseUrl()}/notifications/pending-count`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data.total === 'number') setPendingCount(data.total);
      })
      .catch(() => {});

    fetchNotifications();

    // WebSocket
    const socket = io(`${getServerBaseUrl()}/notifications`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('auth', { token });
    });

    socket.on('pending_count', (data: { count: number }) => {
      setPendingCount(data.count);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ewrozka:pending-requests-changed', { detail: { count: data.count } }));
      }
    });

    socket.on('unread_count', (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    socket.on('notification', (notification: NotificationDto) => {
      setNotifications(prev => [notification, ...prev]);
      setTotal(prev => prev + 1);
      setUnreadCount(prev => prev + 1);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ewrozka:notification', { detail: notification }));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, fetchNotifications]);

  return {
    pendingCount,
    unreadCount,
    notifications,
    loading,
    loadingMore,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh: fetchNotifications,
  };
}

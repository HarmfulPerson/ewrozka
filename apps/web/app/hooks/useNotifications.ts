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

export interface UseNotificationsResult {
  /** Legacy: pending request count for wizard badge */
  pendingCount: number;
  /** Unread notification count */
  unreadCount: number;
  /** Recent notifications */
  notifications: NotificationDto[];
  /** Loading state */
  loading: boolean;
  /** Mark single notification as read */
  markAsRead: (id: number) => Promise<void>;
  /** Mark all as read */
  markAllAsRead: () => Promise<void>;
  /** Refresh notifications list */
  refresh: () => Promise<void>;
}

export function useNotifications(token: string | null | undefined): UseNotificationsResult {
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGetNotifications(token, { limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

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

    // Legacy: pending count for wizard badge
    socket.on('pending_count', (data: { count: number }) => {
      setPendingCount(data.count);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ewrozka:pending-requests-changed', { detail: { count: data.count } }));
      }
    });

    // Unread count update on auth
    socket.on('unread_count', (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    // New notification arrives
    socket.on('notification', (notification: NotificationDto) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);

      // Dispatch event for toast
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
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { NotificationDto } from '../../lib/api-notifications';
import type { UseNotificationsResult } from '../../hooks/useNotifications';
import './notification-center.css';

const TYPE_ICONS: Record<string, string> = {
  new_request: '✉️',
  request_status_changed: '📋',
  meeting_paid: '💳',
  meeting_reminder: '⏰',
  meeting_starting: '🟢',
  new_rating: '⭐',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'teraz';
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h temu`;
  const days = Math.floor(hours / 24);
  return `${days} d temu`;
}

interface NotificationCenterProps {
  notifications: UseNotificationsResult;
}

export function NotificationCenter({ notifications }: NotificationCenterProps) {
  const { unreadCount, notifications: items, markAsRead, markAllAsRead, loading } = notifications;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Toast on new notification
  useEffect(() => {
    const handler = (e: Event) => {
      const notification = (e as CustomEvent<NotificationDto>).detail;
      toast(notification.title, {
        icon: TYPE_ICONS[notification.type] ?? '🔔',
        duration: 4000,
      });
    };
    window.addEventListener('ewrozka:notification', handler);
    return () => window.removeEventListener('ewrozka:notification', handler);
  }, []);

  const handleClick = async (item: NotificationDto) => {
    if (!item.isRead) await markAsRead(item.id);
    if (item.link) {
      router.push(item.link);
      setOpen(false);
    }
  };

  return (
    <div className="notif-center" ref={ref}>
      <button
        className="notif-center__bell"
        onClick={() => setOpen(!open)}
        aria-label={`Powiadomienia${unreadCount > 0 ? ` (${unreadCount} nieprzeczytanych)` : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-center__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-center__dropdown">
          <div className="notif-center__header">
            <span className="notif-center__title">Powiadomienia</span>
            {unreadCount > 0 && (
              <button className="notif-center__mark-all" onClick={markAllAsRead}>
                Przeczytaj wszystkie
              </button>
            )}
          </div>

          <div className="notif-center__list">
            {loading && items.length === 0 ? (
              <div className="notif-center__empty">Ładowanie...</div>
            ) : items.length === 0 ? (
              <div className="notif-center__empty">Brak powiadomień</div>
            ) : (
              items.map(item => (
                <button
                  key={item.id}
                  className={`notif-center__item${!item.isRead ? ' notif-center__item--unread' : ''}`}
                  onClick={() => handleClick(item)}
                >
                  <span className="notif-center__item-icon">
                    {TYPE_ICONS[item.type] ?? '🔔'}
                  </span>
                  <div className="notif-center__item-body">
                    <span className="notif-center__item-title">{item.title}</span>
                    {item.body && (
                      <span className="notif-center__item-text">{item.body}</span>
                    )}
                    <span className="notif-center__item-time">{timeAgo(item.createdAt)}</span>
                  </div>
                  {!item.isRead && <span className="notif-center__item-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

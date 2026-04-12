'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

/* ── Shared list (used by both desktop dropdown and mobile panel) ── */
function NotificationList({
  notifications, onClose,
}: {
  notifications: UseNotificationsResult;
  onClose: () => void;
}) {
  const { notifications: items, unreadCount, markAsRead, markAllAsRead, loading, loadingMore, hasMore, loadMore } = notifications;
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasMore && !loadingMore) loadMore();
      },
      { root: listRef.current, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleClick = async (item: NotificationDto) => {
    if (!item.isRead) await markAsRead(item.uid);
    if (item.link) { router.push(item.link); onClose(); }
  };

  return (
    <>
      <div className="notif-center__header">
        <span className="notif-center__title">Powiadomienia</span>
        <div className="notif-center__header-actions">
          {unreadCount > 0 && (
            <button className="notif-center__mark-all" onClick={markAllAsRead}>Przeczytaj wszystkie</button>
          )}
          <button className="notif-center__close" onClick={onClose} aria-label="Zamknij">✕</button>
        </div>
      </div>
      <div className="notif-center__list" ref={listRef}>
        {loading && items.length === 0 ? (
          <div className="notif-center__empty">Ładowanie...</div>
        ) : items.length === 0 ? (
          <div className="notif-center__empty">Brak powiadomień</div>
        ) : (
          <>
            {items.map(item => (
              <button
                key={item.uid}
                className={`notif-center__item${!item.isRead ? ' notif-center__item--unread' : ''}`}
                onClick={() => handleClick(item)}
              >
                <span className="notif-center__item-icon">{TYPE_ICONS[item.type] ?? '🔔'}</span>
                <div className="notif-center__item-body">
                  <span className="notif-center__item-title">{item.title}</span>
                  {item.body && <span className="notif-center__item-text">{item.body}</span>}
                  <span className="notif-center__item-time">{timeAgo(item.createdAt)}</span>
                </div>
                {!item.isRead && <span className="notif-center__item-dot" />}
              </button>
            ))}
            {hasMore && (
              <div ref={sentinelRef} className="notif-center__sentinel">
                {loadingMore && <span className="notif-center__loading-more">Ładowanie...</span>}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ── Desktop: bell + absolute dropdown ── */
export function NotificationCenter({ notifications }: { notifications: UseNotificationsResult }) {
  const { unreadCount } = notifications;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="notif-center notif-center--desktop" ref={ref}>
      <NotificationBell unreadCount={unreadCount} onClick={() => setOpen(!open)} />
      {open && (
        <div className="notif-center__dropdown">
          <NotificationList notifications={notifications} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/* ── Mobile: bell toggles a collapsible panel (like nav) ── */
export function NotificationCenterMobile({ notifications, open, onToggle }: {
  notifications: UseNotificationsResult;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <NotificationBell unreadCount={notifications.unreadCount} onClick={onToggle} />
  );
}

/** The expandable panel rendered separately in the sidebar */
export function NotificationMobilePanel({ notifications, open, onClose }: {
  notifications: UseNotificationsResult;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div className={`notif-mobile-panel${open ? ' notif-mobile-panel--open' : ''}`}>
      {open && <NotificationList notifications={notifications} onClose={onClose} />}
    </div>
  );
}

/* ── Bell icon ── */
function NotificationBell({ unreadCount, onClick }: { unreadCount: number; onClick: () => void }) {
  return (
    <button className="notif-center__bell" onClick={onClick}
      aria-label={`Powiadomienia${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="notif-center__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </button>
  );
}

/* ── Toast listener (mount once) ── */
export function NotificationToastListener() {
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
  return null;
}

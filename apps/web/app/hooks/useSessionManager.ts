'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, setStoredUser, clearStoredUser } from '../lib/auth-mock';
import { getApiBaseUrl } from '../lib/api';

/** Refresh token 10 minutes before expiry */
const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 min (if token = 1h)
/** Auto-logout after this much idle time */
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 min
/** Events that count as "activity" */
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

async function refreshTokenApi(currentToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Token ${currentToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Manages session lifecycle:
 * - Refreshes JWT token periodically (sliding session)
 * - Detects idle user and auto-logs out
 * - Listens for activity events to reset idle timer
 */
export function useSessionManager() {
  const router = useRouter();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const logout = useCallback(() => {
    clearStoredUser();
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    router.push('/login?error=session_expired');
  }, [router]);

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const user = getStoredUser();
      if (user) logout();
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  const refreshToken = useCallback(async () => {
    const user = getStoredUser();
    if (!user?.token) return;

    // Don't refresh if idle for too long
    if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) {
      logout();
      return;
    }

    const newToken = await refreshTokenApi(user.token);
    if (newToken) {
      setStoredUser({ ...user, token: newToken });
    } else {
      // Token invalid/expired — logout
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.token) return;

    // Start refresh interval
    refreshTimerRef.current = setInterval(refreshToken, REFRESH_INTERVAL_MS);

    // Start idle detection
    resetIdleTimer();

    // Listen for activity
    const handleActivity = () => resetIdleTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    // Listen for storage changes (other tabs logging out)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ewrozka_user' && !e.newValue) {
        logout();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshToken, resetIdleTimer, logout]);
}

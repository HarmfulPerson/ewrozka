'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '../lib/api';

function getServerBaseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001').replace(/\/+$/, '');
  return base.endsWith('/api') ? base.replace(/\/api\/?$/, '') : base;
}

export function useAdminPendingVideoCount(token: string | null | undefined) {
  const [count, setCount] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    fetch(`${getApiBaseUrl()}/admin/pending-video-count`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (typeof data === 'number') {
          setCount(data);
        } else if (data && typeof data.count === 'number') {
          setCount(data.count);
        }
      })
      .catch(() => {});

    const socket = io(`${getServerBaseUrl()}/notifications`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('auth', { token });
    });

    socket.on('pending_video_count', (data: { count: number }) => {
      setCount(data.count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return count;
}

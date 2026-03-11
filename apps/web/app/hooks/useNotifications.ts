'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001';

export function useNotifications(token: string | null | undefined) {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    // Pobierz wstępny licznik przez REST
    fetch(`${API_URL}/api/notifications/pending-count`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data.total === 'number') {
          setPendingCount(data.total);
        }
      })
      .catch(() => {/* ignore */});

    // Połącz WebSocket
    const socket = io(`${API_URL}/notifications`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('auth', { token });
    });

    socket.on('pending_count', (data: { count: number }) => {
      setPendingCount(data.count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return pendingCount;
}

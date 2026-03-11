'use client';

import { useEffect, useRef, useState } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

interface VideoCallProps {
  roomUrl: string;
  meetingToken: string;
  onLeave: () => void;
}

export default function VideoCall({ roomUrl, meetingToken, onLeave }: VideoCallProps) {
  const callFrameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string>('');
  const [participants, setParticipants] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create Daily call frame
    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '12px',
      },
      showLeaveButton: false,
      showFullscreenButton: true,
    });

    callFrameRef.current = callFrame;

    // Event listeners
    callFrame.on('joined-meeting', () => {
      console.log('Joined meeting');
      setIsJoining(false);
    });

    callFrame.on('left-meeting', () => {
      console.log('Left meeting');
      onLeave();
    });

    callFrame.on('error', (e) => {
      console.error('Daily error:', e);
      setError('Wystąpił błąd podczas połączenia');
      setIsJoining(false);
    });

    callFrame.on('participant-joined', () => {
      const participantCount = Object.keys(callFrame.participants()).length;
      setParticipants(participantCount);
    });

    callFrame.on('participant-left', () => {
      const participantCount = Object.keys(callFrame.participants()).length;
      setParticipants(participantCount);
    });

    // Join the room with signed token (nbf/exp enforced by Daily.co)
    callFrame
      .join({ url: roomUrl, token: meetingToken })
      .catch((err) => {
        console.error('Failed to join:', err);
        setError('Nie udało się dołączyć do spotkania');
        setIsJoining(false);
      });

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, [roomUrl, meetingToken, onLeave]);

  const handleLeave = () => {
    if (callFrameRef.current) {
      callFrameRef.current.leave();
    }
  };

  if (error) {
    return (
      <div className="video-call-error">
        <p>{error}</p>
        <button onClick={onLeave} className="video-call-error-btn">
          Powrót do panelu
        </button>
      </div>
    );
  }

  return (
    <div className="video-call-container">
      {isJoining && (
        <div className="video-call-loading">
          <div className="video-call-spinner"></div>
          <p>Łączenie z rozmową...</p>
        </div>
      )}
      <div ref={containerRef} className="video-call-frame"></div>
      <div className="video-call-footer">
        <div className="video-call-info">
          Uczestnicy: {participants}
        </div>
        <button onClick={handleLeave} className="video-call-leave-btn">
          Zakończ rozmowę
        </button>
      </div>
    </div>
  );
}

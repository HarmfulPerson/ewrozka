'use client';

import type { RefObject } from 'react';

interface VideoModalProps {
  videoSrc: string;
  previewVideoRef: RefObject<HTMLVideoElement | null>;
  onClose: () => void;
}

export function VideoModal({ videoSrc, previewVideoRef, onClose }: VideoModalProps) {
  return (
    <div
      className="video-modal-overlay"
      onClick={onClose}
    >
      <div className="video-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="video-modal__close"
          aria-label="Zamknij"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={previewVideoRef}
          src={videoSrc}
          controls
          autoPlay
          className="video-modal__video"
        />
      </div>
    </div>
  );
}

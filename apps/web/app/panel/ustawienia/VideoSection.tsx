'use client';

import type { RefObject } from 'react';

interface VideoSectionProps {
  videoFile: File | null;
  videoUrl: string | null;
  currentVideoLabel: string | null;
  uploadingVideo: boolean;
  deletingVideo: boolean;
  videoInputRef: RefObject<HTMLInputElement | null>;
  videoMaxSeconds: number;
  videoMaxMb: number;
  onVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadVideo: () => void;
  onDeleteVideo: () => void;
  onCancelVideoSelection: () => void;
  onOpenModal: () => void;
}

export function VideoSection({
  videoFile,
  videoUrl,
  currentVideoLabel,
  uploadingVideo,
  deletingVideo,
  videoInputRef,
  videoMaxSeconds,
  videoMaxMb,
  onVideoChange,
  onUploadVideo,
  onDeleteVideo,
  onCancelVideoSelection,
  onOpenModal,
}: VideoSectionProps) {
  return (
    <section className="ustawienia-section ustawienia-section--video">
      <h2 className="ustawienia-section__title">Filmik przedstawiający</h2>
      <p className="ustawienia-section__hint">
        Maks. {videoMaxSeconds}&nbsp;s · maks. {videoMaxMb}&nbsp;MB · widoczny na profilu jako przycisk &ldquo;Poznaj mnie&rdquo;
      </p>

      <div className="video-uploader__body">
        {currentVideoLabel && (
          <button
            type="button"
            className="video-uploader__link"
            onClick={onOpenModal}
          >
            {currentVideoLabel}
            {videoFile && <span className="video-uploader__badge">niezapisany</span>}
          </button>
        )}
      </div>

      <div className="video-uploader__actions">
        {videoFile ? (
          <>
            <button type="button" className="avatar-uploader__btn avatar-uploader__btn--primary"
              onClick={onUploadVideo} disabled={uploadingVideo}>
              {uploadingVideo ? 'Przesyłanie…' : 'Zapisz filmik'}
            </button>
            <button type="button" className="avatar-uploader__btn avatar-uploader__btn--remove"
              onClick={onCancelVideoSelection}>
              Anuluj
            </button>
          </>
        ) : videoUrl ? (
          <>
            <button type="button" className="avatar-uploader__btn"
              onClick={() => videoInputRef.current?.click()}>
              Zmień filmik
            </button>
            <button type="button" className="avatar-uploader__btn avatar-uploader__btn--remove"
              onClick={onDeleteVideo} disabled={deletingVideo}>
              {deletingVideo ? 'Usuwanie…' : 'Usuń filmik'}
            </button>
          </>
        ) : (
          <button type="button" className="avatar-uploader__btn"
            onClick={() => videoInputRef.current?.click()}>
            Wybierz filmik
          </button>
        )}
        <input ref={videoInputRef} type="file" accept="video/*"
          className="avatar-uploader__input" onChange={onVideoChange} />
      </div>
    </section>
  );
}

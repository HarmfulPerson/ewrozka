'use client';

import type { RefObject } from 'react';

interface AvatarSectionProps {
  displayAvatarUrl: string | null;
  avatarPreview: string | null;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelSelection: () => void;
}

export function AvatarSection({
  displayAvatarUrl,
  avatarPreview,
  uploading,
  fileInputRef,
  onAvatarChange,
  onCancelSelection,
}: AvatarSectionProps) {
  return (
    <section className="ustawienia-section">
      <h2 className="ustawienia-section__title">Zdjęcie profilowe</h2>

      <div className="avatar-uploader">
        <div className="avatar-uploader__preview">
          {displayAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayAvatarUrl} alt="Zdjęcie profilowe" className="avatar-uploader__img" />
          ) : (
            <div className="avatar-uploader__placeholder"><span>👤</span></div>
          )}
        </div>
        <div className="avatar-uploader__actions">
          <p className="avatar-uploader__hint">JPG, PNG lub WebP · maks. 5 MB</p>
          <button type="button" className="avatar-uploader__btn"
            onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {avatarPreview ? 'Zmień wybrany plik' : 'Wybierz zdjęcie'}
          </button>
          {avatarPreview && (
            <button type="button" className="avatar-uploader__btn avatar-uploader__btn--remove"
              onClick={onCancelSelection}>
              Anuluj
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*"
            className="avatar-uploader__input" onChange={onAvatarChange} />
        </div>
      </div>
    </section>
  );
}

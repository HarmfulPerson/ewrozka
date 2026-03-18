'use client';

interface ProfileSectionProps {
  username: string;
  bio: string;
  saving: boolean;
  uploading: boolean;
  profileErrors: { username?: boolean };
  onUsernameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onClearUsernameError: () => void;
  onSave: () => void;
}

export function ProfileSection({
  username,
  bio,
  saving,
  uploading,
  profileErrors,
  onUsernameChange,
  onBioChange,
  onClearUsernameError,
  onSave,
}: ProfileSectionProps) {
  return (
    <section className="ustawienia-section">
      <h2 className="ustawienia-section__title">Dane profilu</h2>

      <div className="ustawienia-field">
        <label htmlFor="username">Nazwa użytkownika</label>
        <input
          id="username" type="text" value={username}
          onChange={(e) => { onUsernameChange(e.target.value); onClearUsernameError(); }}
          className={profileErrors.username ? 'ustawienia-field__input--error' : ''}
        />
      </div>

      <div className="ustawienia-field">
        <label htmlFor="bio">Bio</label>
        <textarea id="bio" rows={4} value={bio}
          onChange={(e) => onBioChange(e.target.value)} placeholder="Napisz coś o sobie..." />
      </div>

      <button type="button" className="ustawienia-page__save"
        onClick={onSave} disabled={saving || uploading}>
        {uploading ? 'Przesyłanie zdjęcia...' : saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
      </button>
    </section>
  );
}

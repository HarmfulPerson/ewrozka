'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getStoredUser, setStoredUser, userFromApi } from '../../lib/auth-mock';
import {
  apiGetCurrentUser,
  apiUpdateUser,
  apiUploadAvatar,
  apiUploadVideo,
  apiDeleteVideo,
  apiChangePassword,
  getUploadUrl,
} from '../../lib/api';
import './ustawienia.css';
import '../panel-shared.css';

const VIDEO_MAX_SECONDS = 30;
const VIDEO_MAX_MB = 50;

function getFilename(url: string): string {
  return url.split('/').pop() ?? url;
}

export default function UstawieniaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [user, setUser] = useState(() => getStoredUser());
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ username?: boolean }>({});

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwErrors, setPwErrors] = useState<{
    currentPassword?: boolean;
    newPassword?: boolean;
    confirmPassword?: boolean;
  }>({});

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.push('/login?returnUrl=/panel/ustawienia');
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await apiGetCurrentUser(storedUser.token);
        const apiUser = response.user;
        setUsername(apiUser.username || '');
        setBio(apiUser.bio || '');
        setAvatarUrl(apiUser.image || null);
        setVideoUrl((apiUser as any).video || null);
        setStoredUser(userFromApi(apiUser));
        setUser(userFromApi(apiUser));
      } catch {
        toast.error('Nie udało się pobrać danych użytkownika');
      }
    };

    fetchUserData();
  }, [router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      toast.error(`Filmik nie może być większy niż ${VIDEO_MAX_MB} MB`);
      e.target.value = '';
      return;
    }

    const blobUrl = URL.createObjectURL(file);

    const tmpVideo = document.createElement('video');
    tmpVideo.preload = 'metadata';
    tmpVideo.src = blobUrl;
    tmpVideo.onloadedmetadata = () => {
      if (tmpVideo.duration > VIDEO_MAX_SECONDS) {
        toast.error(`Filmik nie może być dłuższy niż ${VIDEO_MAX_SECONDS} sekund (wybrany ma ${Math.round(tmpVideo.duration)} s)`);
        URL.revokeObjectURL(blobUrl);
        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }
      setVideoFile(file);
      setVideoBlobUrl(blobUrl);
    };
    tmpVideo.onerror = () => {
      toast.error('Nie można odczytać pliku wideo');
      URL.revokeObjectURL(blobUrl);
      if (videoInputRef.current) videoInputRef.current.value = '';
    };
  };

  const handleUploadVideo = async () => {
    const storedUser = getStoredUser();
    if (!storedUser || !videoFile) return;
    setUploadingVideo(true);
    try {
      const res = await apiUploadVideo(storedUser.token, videoFile);
      setVideoUrl(res.videoUrl);
      setVideoFile(null);
      if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      toast.success('Filmik został przesłany!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się przesłać filmiku');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async () => {
    const storedUser = getStoredUser();
    if (!storedUser) return;
    setDeletingVideo(true);
    try {
      await apiDeleteVideo(storedUser.token);
      setVideoUrl(null);
      cancelVideoSelection();
      toast.success('Filmik został usunięty');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się usunąć filmiku');
    } finally {
      setDeletingVideo(false);
    }
  };

  const cancelVideoSelection = () => {
    setVideoFile(null);
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    setVideoBlobUrl(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSaveChanges = async () => {
    const storedUser = getStoredUser();
    if (!storedUser) return;

    if (!username.trim()) {
      setProfileErrors({ username: true });
      toast.error('Nazwa użytkownika nie może być pusta');
      return;
    }
    setProfileErrors({});

    setSaving(true);

    try {
      if (avatarFile) {
        setUploading(true);
        const uploadRes = await apiUploadAvatar(storedUser.token, avatarFile, 'image');
        setAvatarUrl(uploadRes.user.image || null);
        setAvatarPreview(null);
        setAvatarFile(null);
        setStoredUser(userFromApi(uploadRes.user));
        setUser(userFromApi(uploadRes.user));
        setUploading(false);
      }

      const currentUser = user!;
      const userData: { username?: string; bio?: string } = {};
      if (username !== currentUser.username) userData.username = username;
      if (bio !== (currentUser.bio || '')) userData.bio = bio;

      if (Object.keys(userData).length > 0) {
        const response = await apiUpdateUser(storedUser.token, userData);
        setStoredUser(userFromApi(response.user));
        setUser(userFromApi(response.user));
      }

      window.dispatchEvent(new CustomEvent('ewrozka:user-updated'));
      toast.success('Zmiany zostały zapisane!');

      const refreshed = await apiGetCurrentUser(storedUser.token);
      setUsername(refreshed.user.username || '');
      setBio(refreshed.user.bio || '');
      setAvatarUrl(refreshed.user.image || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    const storedUser = getStoredUser();
    if (!storedUser) return;

    const errs: typeof pwErrors = {};
    if (!currentPassword) errs.currentPassword = true;
    if (newPassword.length < 8) errs.newPassword = true;
    if (newPassword !== confirmPassword) errs.confirmPassword = true;

    if (Object.keys(errs).length > 0) {
      setPwErrors(errs);
      if (errs.currentPassword) toast.error('Wpisz obecne hasło');
      else if (errs.newPassword) toast.error('Nowe hasło musi mieć co najmniej 8 znaków');
      else if (errs.confirmPassword) toast.error('Hasła nie są zgodne');
      return;
    }

    setPwErrors({});
    setChangingPassword(true);
    try {
      await apiChangePassword(storedUser.token, currentPassword, newPassword);
      toast.success('Hasło zostało zmienione');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zmienić hasła');
    } finally {
      setChangingPassword(false);
    }
  };

  const displayAvatarUrl = avatarPreview
    ? avatarPreview
    : avatarUrl
      ? getUploadUrl(avatarUrl)
      : null;

  const isWizard = user?.roles?.includes('wizard');

  const currentVideoSrc = videoBlobUrl ?? (videoUrl ? getUploadUrl(videoUrl) : null);
  const currentVideoLabel = videoFile
    ? videoFile.name
    : videoUrl
      ? getFilename(videoUrl)
      : null;

  if (!user) {
    return <div className="panel-page-spinner"><span className="panel-spinner" /></div>;
  }

  return (
    <div className="ustawienia-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Ustawienia konta</h1>
      </div>

      {/* ── Dwie niezależne kolumny ── */}
      <div className="ustawienia-grid">

        {/* ════ LEWA KOLUMNA ════ */}
        <div className="ustawienia-col">

          {/* Krótki – zdjęcie profilowe */}
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
                    onClick={() => { setAvatarPreview(null); setAvatarFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                    Anuluj
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*"
                  className="avatar-uploader__input" onChange={handleAvatarChange} />
              </div>
            </div>
          </section>

          {/* Długi (ostatni → flex:1) – dane profilu */}
          <section className="ustawienia-section">
            <h2 className="ustawienia-section__title">Dane profilu</h2>

            <div className="ustawienia-field">
              <label htmlFor="username">Nazwa użytkownika</label>
              <input
                id="username" type="text" value={username}
                onChange={(e) => { setUsername(e.target.value); setProfileErrors(p => ({ ...p, username: false })); }}
                className={profileErrors.username ? 'ustawienia-field__input--error' : ''}
              />
            </div>

            <div className="ustawienia-field">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" rows={4} value={bio}
                onChange={(e) => setBio(e.target.value)} placeholder="Napisz coś o sobie..." />
            </div>

            <button type="button" className="ustawienia-page__save"
              onClick={handleSaveChanges} disabled={saving || uploading}>
              {uploading ? 'Przesyłanie zdjęcia...' : saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </section>

        </div>{/* end lewa kolumna */}

        {/* ════ PRAWA KOLUMNA ════ */}
        <div className="ustawienia-col">

          {/* Krótki – zmiana hasła */}
          <section className="ustawienia-section">
            <h2 className="ustawienia-section__title">Zmiana hasła</h2>

            <div className="ustawienia-field">
              <label htmlFor="currentPassword">Obecne hasło</label>
              <input
                id="currentPassword" type="password" value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPwErrors(p => ({ ...p, currentPassword: false })); }}
                autoComplete="current-password" placeholder="••••••••"
                className={pwErrors.currentPassword ? 'ustawienia-field__input--error' : ''}
              />
            </div>

            <div className="ustawienia-field">
              <label htmlFor="newPassword">Nowe hasło</label>
              <input
                id="newPassword" type="password" value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPwErrors(p => ({ ...p, newPassword: false, confirmPassword: false })); }}
                autoComplete="new-password" placeholder="Min. 8 znaków"
                className={pwErrors.newPassword ? 'ustawienia-field__input--error' : ''}
              />
            </div>

            <div className="ustawienia-field">
              <label htmlFor="confirmPassword">Powtórz nowe hasło</label>
              <input
                id="confirmPassword" type="password" value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPwErrors(p => ({ ...p, confirmPassword: false })); }}
                autoComplete="new-password" placeholder="••••••••"
                className={pwErrors.confirmPassword ? 'ustawienia-field__input--error' : ''}
              />
            </div>

            <button type="button" className="ustawienia-page__save"
              onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Zmienianie...' : 'Zmień hasło'}
            </button>
          </section>

          {/* Długi (ostatni → flex:1) – filmik (tylko wróżka) */}
          {isWizard && (
            <section className="ustawienia-section ustawienia-section--video">
              <h2 className="ustawienia-section__title">Filmik przedstawiający</h2>
              <p className="ustawienia-section__hint">
                Maks. {VIDEO_MAX_SECONDS}&nbsp;s · maks. {VIDEO_MAX_MB}&nbsp;MB · widoczny na profilu jako przycisk &ldquo;Poznaj mnie&rdquo;
              </p>

              <div className="video-uploader__body">
                {currentVideoLabel && (
                  <button
                    type="button"
                    className="video-uploader__link"
                    onClick={() => setVideoModalOpen(true)}
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
                      onClick={handleUploadVideo} disabled={uploadingVideo}>
                      {uploadingVideo ? 'Przesyłanie…' : 'Zapisz filmik'}
                    </button>
                    <button type="button" className="avatar-uploader__btn avatar-uploader__btn--remove"
                      onClick={cancelVideoSelection}>
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
                      onClick={handleDeleteVideo} disabled={deletingVideo}>
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
                  className="avatar-uploader__input" onChange={handleVideoChange} />
              </div>
            </section>
          )}

        </div>{/* end prawa kolumna */}

      </div>{/* end ustawienia-grid */}

      {/* ── Modal podglądu filmiku ── */}
      {videoModalOpen && currentVideoSrc && (
        <div
          className="video-modal-overlay"
          onClick={() => {
            setVideoModalOpen(false);
            previewVideoRef.current?.pause();
          }}
        >
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="video-modal__close"
              aria-label="Zamknij"
              onClick={() => {
                setVideoModalOpen(false);
                previewVideoRef.current?.pause();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={previewVideoRef}
              src={currentVideoSrc}
              controls
              autoPlay
              className="video-modal__video"
            />
          </div>
        </div>
      )}
    </div>
  );
}

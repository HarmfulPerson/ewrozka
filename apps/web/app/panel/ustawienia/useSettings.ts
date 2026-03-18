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
  getUploadUrl,
} from '../../lib/api';

const VIDEO_MAX_SECONDS = 30;
const VIDEO_MAX_MB = 50;

function getFilename(url: string): string {
  return url.split('/').pop() ?? url;
}

export function useSettings() {
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

  const cancelVideoSelection = () => {
    setVideoFile(null);
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    setVideoBlobUrl(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
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

  const cancelAvatarSelection = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeVideoModal = () => {
    setVideoModalOpen(false);
    previewVideoRef.current?.pause();
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

  return {
    user,
    username,
    setUsername,
    bio,
    setBio,
    avatarPreview,
    displayAvatarUrl,
    fileInputRef,
    videoInputRef,
    previewVideoRef,
    handleAvatarChange,
    cancelAvatarSelection,
    uploading,
    saving,
    profileErrors,
    setProfileErrors,
    handleSaveChanges,
    isWizard,
    videoFile,
    videoUrl,
    videoModalOpen,
    setVideoModalOpen,
    closeVideoModal,
    currentVideoSrc,
    currentVideoLabel,
    uploadingVideo,
    deletingVideo,
    handleVideoChange,
    handleUploadVideo,
    handleDeleteVideo,
    cancelVideoSelection,
    VIDEO_MAX_SECONDS,
    VIDEO_MAX_MB,
  };
}

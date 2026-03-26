'use client';

import { useSettings } from './useSettings';
import { usePasswordChange } from './usePasswordChange';
import { AvatarSection } from './AvatarSection';
import { ProfileSection } from './ProfileSection';
import { PasswordSection } from './PasswordSection';
import { VideoSection } from './VideoSection';
import { VideoModal } from './VideoModal';
import { ReferralSection } from './ReferralSection';
import './ustawienia.css';
import '../panel-shared.css';

export default function UstawieniaPage() {
  const settings = useSettings();
  const password = usePasswordChange();

  if (!settings.user) {
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
          <AvatarSection
            displayAvatarUrl={settings.displayAvatarUrl}
            avatarPreview={settings.avatarPreview}
            uploading={settings.uploading}
            fileInputRef={settings.fileInputRef}
            onAvatarChange={settings.handleAvatarChange}
            onCancelSelection={settings.cancelAvatarSelection}
          />

          {/* Długi (ostatni → flex:1) – dane profilu */}
          <ProfileSection
            username={settings.username}
            bio={settings.bio}
            saving={settings.saving}
            uploading={settings.uploading}
            profileErrors={settings.profileErrors}
            onUsernameChange={settings.setUsername}
            onBioChange={settings.setBio}
            onClearUsernameError={() => settings.setProfileErrors(p => ({ ...p, username: false }))}
            onSave={settings.handleSaveChanges}
          />

        </div>{/* end lewa kolumna */}

        {/* ════ PRAWA KOLUMNA ════ */}
        <div className="ustawienia-col">

          {/* Krótki – zmiana hasła */}
          <PasswordSection
            currentPassword={password.currentPassword}
            newPassword={password.newPassword}
            confirmPassword={password.confirmPassword}
            changingPassword={password.changingPassword}
            pwErrors={password.pwErrors}
            onCurrentPasswordChange={(v) => { password.setCurrentPassword(v); password.setPwErrors(p => ({ ...p, currentPassword: false })); }}
            onNewPasswordChange={(v) => { password.setNewPassword(v); password.setPwErrors(p => ({ ...p, newPassword: false, confirmPassword: false })); }}
            onConfirmPasswordChange={(v) => { password.setConfirmPassword(v); password.setPwErrors(p => ({ ...p, confirmPassword: false })); }}
            onChangePassword={password.handleChangePassword}
          />

          {/* Długi (ostatni → flex:1) – filmik (tylko wróżka) */}
          {settings.isWizard && (
            <VideoSection
              videoFile={settings.videoFile}
              videoUrl={settings.videoUrl}
              currentVideoLabel={settings.currentVideoLabel}
              uploadingVideo={settings.uploadingVideo}
              deletingVideo={settings.deletingVideo}
              videoInputRef={settings.videoInputRef}
              videoMaxSeconds={settings.VIDEO_MAX_SECONDS}
              videoMaxMb={settings.VIDEO_MAX_MB}
              onVideoChange={settings.handleVideoChange}
              onUploadVideo={settings.handleUploadVideo}
              onDeleteVideo={settings.handleDeleteVideo}
              onCancelVideoSelection={settings.cancelVideoSelection}
              onOpenModal={() => settings.setVideoModalOpen(true)}
            />
          )}

          {/* Referral link */}
          <ReferralSection />

        </div>{/* end prawa kolumna */}

      </div>{/* end ustawienia-grid */}

      {/* ── Modal podglądu filmiku ── */}
      {settings.videoModalOpen && settings.currentVideoSrc && (
        <VideoModal
          videoSrc={settings.currentVideoSrc}
          previewVideoRef={settings.previewVideoRef}
          onClose={settings.closeVideoModal}
        />
      )}
    </div>
  );
}

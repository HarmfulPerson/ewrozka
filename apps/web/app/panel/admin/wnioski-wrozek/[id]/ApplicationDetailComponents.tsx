'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getUploadUrl } from '../../../../lib/api';
import type {
  WizardApplicationDto,
  WizardApplicationStatus,
} from '../../../../lib/api-admin';

const STATUS_LABEL: Record<WizardApplicationStatus, string> = {
  pending: 'Oczekuje na rozpatrzenie',
  approved: 'Zatwierdzono',
  rejected: 'Odrzucono',
};

const STATUS_CLASS: Record<WizardApplicationStatus, string> = {
  pending: 'ww-badge--pending',
  approved: 'ww-badge--approved',
  rejected: 'ww-badge--rejected',
};

function formatDate(iso: string | Date | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ApplicationNav({ app }: { app: WizardApplicationDto }) {
  return (
    <div className="wd-nav">
      <Link href="/panel/admin/wnioski-wrozek" className="wd-back">
        ← Wróć do listy
      </Link>
      <span className={`ww-badge ${STATUS_CLASS[app.wizardApplicationStatus]}`}>
        {STATUS_LABEL[app.wizardApplicationStatus]}
      </span>
    </div>
  );
}

export function ApplicationSidebar({
  app,
  actionLoading,
  onApprove,
  onOpenReject,
}: {
  app: WizardApplicationDto;
  actionLoading: boolean;
  onApprove: () => void;
  onOpenReject: () => void;
}) {
  const isPending = app.wizardApplicationStatus === 'pending';

  return (
    <aside className="wd-sidebar">
      <div className="wd-avatar">
        {app.image ? (
          <Image
            src={getUploadUrl(app.image)}
            alt={app.username}
            fill
            className="wd-avatar__img"
          />
        ) : (
          <span className="wd-avatar__letter">
            {app.username.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="wd-info-block">
        <div className="wd-info-row">
          <span className="wd-info-label">Nazwa</span>
          <span className="wd-info-value">{app.username}</span>
        </div>
        <div className="wd-info-row">
          <span className="wd-info-label">E-mail</span>
          <a href={`mailto:${app.email}`} className="wd-info-link">
            {app.email}
          </a>
        </div>
        <div className="wd-info-row">
          <span className="wd-info-label">Telefon</span>
          {app.phone ? (
            <a href={`tel:${app.phone}`} className="wd-info-link">
              {app.phone}
            </a>
          ) : (
            <span className="wd-info-value wd-info-value--muted">Nie podano</span>
          )}
        </div>
        <div className="wd-info-row">
          <span className="wd-info-label">Data zgłoszenia</span>
          <span className="wd-info-value">{formatDate(app.createdAt)}</span>
        </div>
      </div>

      {isPending && (
        <div className="wd-actions">
          <button
            className="wd-btn wd-btn--approve"
            disabled={actionLoading}
            onClick={onApprove}
          >
            {actionLoading ? 'Przetwarzanie…' : '✓ Zatwierdź konto'}
          </button>
          <button
            className="wd-btn wd-btn--reject"
            disabled={actionLoading}
            onClick={onOpenReject}
          >
            ✕ Odrzuć wniosek
          </button>
        </div>
      )}

      {!isPending && (
        <div className="wd-decision">
          {app.wizardApplicationStatus === 'approved'
            ? '✓ Wniosek zatwierdzony'
            : '✕ Wniosek odrzucony'}
        </div>
      )}

      {app.wizardApplicationStatus === 'rejected' && app.rejectionReason && (
        <div className="wd-rejection-reason">
          <span className="wd-rejection-reason__label">Powód odrzucenia</span>
          <p className="wd-rejection-reason__text">{app.rejectionReason}</p>
        </div>
      )}
    </aside>
  );
}

export function ApplicationMain({ app }: { app: WizardApplicationDto }) {
  return (
    <main className="wd-main">
      <section className="wd-section">
        <h2 className="wd-section-title">Opis / Kim jestem?</h2>
        <div className="wd-bio">
          {app.bio
            ? app.bio.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))
            : <em className="wd-bio-empty">Brak opisu</em>
          }
        </div>
      </section>
    </main>
  );
}

export function DetailRejectModal({
  username,
  rejectReason,
  setRejectReason,
  actionLoading,
  onClose,
  onConfirm,
}: {
  username: string;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="ww-modal-overlay" onClick={onClose}>
      <div className="ww-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="ww-modal__title">Odrzuć wniosek</h3>
        <p className="ww-modal__desc">
          Odrzucasz wniosek specjalisty <strong>{username}</strong>.
          Specjalista będzie mógł złożyć nowy wniosek z tym samym adresem e-mail.
        </p>
        <label className="ww-modal__label" htmlFor="reject-reason-detail">
          Powód odrzucenia <span className="ww-modal__optional">(opcjonalnie)</span>
        </label>
        <textarea
          id="reject-reason-detail"
          className="ww-modal__textarea"
          placeholder="np. Zbyt krótki opis, brak zdjęcia profilowego…"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
        <div className="ww-modal__actions">
          <button
            className="ww-modal__btn ww-modal__btn--cancel"
            onClick={onClose}
          >
            Anuluj
          </button>
          <button
            className="ww-modal__btn ww-modal__btn--confirm"
            disabled={actionLoading}
            onClick={onConfirm}
          >
            {actionLoading ? 'Przetwarzanie…' : '✕ Odrzuć wniosek'}
          </button>
        </div>
      </div>
    </div>
  );
}

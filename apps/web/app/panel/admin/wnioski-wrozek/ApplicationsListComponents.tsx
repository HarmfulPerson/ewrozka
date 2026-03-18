'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getUploadUrl } from '../../../lib/api';
import type {
  WizardApplicationDto,
  WizardApplicationStatus,
} from '../../../lib/api-admin';
import type { FilterTab } from './useApplicationsList';

const STATUS_LABEL: Record<'pending' | 'rejected', string> = {
  pending: 'Oczekuje',
  rejected: 'Odrzucono',
};

const STATUS_CLASS: Record<WizardApplicationStatus, string> = {
  pending: 'ww-badge--pending',
  approved: 'ww-badge--approved',
  rejected: 'ww-badge--rejected',
};

export function ApplicationCard({
  app,
  actionLoading,
  expandedBio,
  onToggleBio,
  onApprove,
  onReject,
}: {
  app: WizardApplicationDto;
  actionLoading: string | null;
  expandedBio: string | null;
  onToggleBio: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, username: string) => void;
}) {
  return (
    <div className="ww-card">
      <div className="ww-card__avatar">
        {app.image ? (
          <Image
            src={getUploadUrl(app.image)}
            alt={app.username}
            fill
            className="ww-card__avatar-img"
          />
        ) : (
          <span className="ww-card__avatar-letter">
            {app.username.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="ww-card__body">
        <div className="ww-card__top">
          <div>
            <div className="ww-card__name">{app.username}</div>
            <div className="ww-card__email">{app.email}</div>
            {app.phone && (
              <div className="ww-card__phone">📞 {app.phone}</div>
            )}
          </div>
          <span className={`ww-badge ${STATUS_CLASS[app.wizardApplicationStatus]}`}>
            {STATUS_LABEL[app.wizardApplicationStatus as FilterTab] ?? app.wizardApplicationStatus}
          </span>
        </div>

        {app.wizardApplicationStatus === 'rejected' && app.rejectionReason && (
          <div className="ww-card__rejection">
            <span className="ww-card__rejection-label">Powód odrzucenia:</span>
            {app.rejectionReason}
          </div>
        )}

        <div className="ww-card__bio-wrap">
          <p className={`ww-card__bio${expandedBio === app.id ? ' ww-card__bio--expanded' : ''}`}>
            {app.bio || <em className="ww-card__bio-empty">Brak opisu</em>}
          </p>
          {app.bio && app.bio.length > 150 && (
            <button
              className="ww-card__bio-toggle"
              onClick={() => onToggleBio(app.id)}
            >
              {expandedBio === app.id ? 'Zwiń' : 'Czytaj więcej'}
            </button>
          )}
        </div>

        <div className="ww-card__footer">
          <Link
            href={`/panel/admin/wnioski-wrozek/${app.id}`}
            className="ww-card__btn ww-card__btn--details"
          >
            Szczegóły →
          </Link>

          {app.wizardApplicationStatus === 'pending' && (
            <>
              <button
                className="ww-card__btn ww-card__btn--approve"
                disabled={actionLoading === app.id}
                onClick={() => onApprove(app.id)}
              >
                {actionLoading === app.id ? '…' : '✓ Zatwierdź'}
              </button>
              <button
                className="ww-card__btn ww-card__btn--reject"
                disabled={actionLoading === app.id}
                onClick={() => onReject(app.id, app.username)}
              >
                {actionLoading === app.id ? '…' : '✕ Odrzuć'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ApplicationsPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="ww-pagination">
      <button
        className="ww-pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ←
      </button>
      <span className="ww-pagination__info">
        Strona {page} z {totalPages}
        <span className="ww-pagination__total"> ({total} wniosków)</span>
      </span>
      <button
        className="ww-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        →
      </button>
    </div>
  );
}

export function RejectModal({
  rejectModal,
  rejectReason,
  setRejectReason,
  actionLoading,
  onClose,
  onConfirm,
}: {
  rejectModal: { id: string; username: string };
  rejectReason: string;
  setRejectReason: (v: string) => void;
  actionLoading: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="ww-modal-overlay" onClick={onClose}>
      <div className="ww-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="ww-modal__title">Odrzuć wniosek</h3>
        <p className="ww-modal__desc">
          Odrzucasz wniosek specjalisty <strong>{rejectModal.username}</strong>.
          Specjalista będzie mógł złożyć nowy wniosek z tym samym adresem e-mail.
        </p>
        <label className="ww-modal__label" htmlFor="reject-reason">
          Powód odrzucenia <span className="ww-modal__optional">(opcjonalnie)</span>
        </label>
        <textarea
          id="reject-reason"
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
            disabled={actionLoading === rejectModal.id}
            onClick={onConfirm}
          >
            {actionLoading === rejectModal.id ? 'Przetwarzanie…' : '✕ Odrzuć wniosek'}
          </button>
        </div>
      </div>
    </div>
  );
}

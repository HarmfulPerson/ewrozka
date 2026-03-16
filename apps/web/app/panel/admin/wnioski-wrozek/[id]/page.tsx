'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../../../lib/auth-mock';
import { getUploadUrl } from '../../../../lib/api';
import {
  apiGetWizardApplication,
  apiApproveWizardApplication,
  apiRejectWizardApplication,
  type WizardApplicationDto,
  type WizardApplicationStatus,
} from '../../../../lib/api-admin';
import '../../../panel-shared.css';
import '../wnioski-wrozek.css'; // modal styles reused
import './wniosek-detail.css';

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

export default function WniosekDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user] = useState(() => getStoredUser());
  const [app, setApp] = useState<WizardApplicationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal odrzucenia
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const id = params.id as string;

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      router.replace('/panel');
      return;
    }
    if (!id) return;

    apiGetWizardApplication(user.token, id)
      .then(setApp)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Nie udało się pobrać wniosku.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleApprove = async () => {
    if (!user || !app) return;
    setActionLoading(true);
    try {
      await apiApproveWizardApplication(user.token, app.id);
      toast.success('Konto specjalisty zostało zatwierdzone.');
      setApp((prev) => prev ? { ...prev, wizardApplicationStatus: 'approved' } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!user || !app) return;
    setActionLoading(true);
    try {
      await apiRejectWizardApplication(user.token, app.id, rejectReason);
      toast.success('Wniosek specjalisty został odrzucony.');
      setApp((prev) =>
        prev
          ? { ...prev, wizardApplicationStatus: 'rejected', rejectionReason: rejectReason || null }
          : prev,
      );
      setShowRejectModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="panel-page-spinner">
        <span className="panel-spinner" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="wd-page">
        <p className="wd-not-found">Wniosek nie istnieje.</p>
        <Link href="/panel/admin/wnioski-wrozek" className="wd-back">
          ← Wróć do listy
        </Link>
      </div>
    );
  }

  const isPending = app.wizardApplicationStatus === 'pending';

  return (
    <>
    <div className="wd-page">
      {/* Nagłówek */}
      <div className="wd-nav">
        <Link href="/panel/admin/wnioski-wrozek" className="wd-back">
          ← Wróć do listy
        </Link>
        <span className={`ww-badge ${STATUS_CLASS[app.wizardApplicationStatus]}`}>
          {STATUS_LABEL[app.wizardApplicationStatus]}
        </span>
      </div>

      <div className="wd-layout">
        {/* Lewa kolumna – zdjęcie + info kontaktowe */}
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

          {/* Akcje */}
          {isPending && (
            <div className="wd-actions">
              <button
                className="wd-btn wd-btn--approve"
                disabled={actionLoading}
                onClick={handleApprove}
              >
                {actionLoading ? 'Przetwarzanie…' : '✓ Zatwierdź konto'}
              </button>
              <button
                className="wd-btn wd-btn--reject"
                disabled={actionLoading}
                onClick={() => { setRejectReason(''); setShowRejectModal(true); }}
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

        {/* Prawa kolumna – opis */}
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
      </div>
    </div>

    {/* Modal odrzucenia */}
    {showRejectModal && (
      <div className="ww-modal-overlay" onClick={() => setShowRejectModal(false)}>
        <div className="ww-modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="ww-modal__title">Odrzuć wniosek</h3>
          <p className="ww-modal__desc">
            Odrzucasz wniosek specjalisty <strong>{app.username}</strong>.
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
              onClick={() => setShowRejectModal(false)}
            >
              Anuluj
            </button>
            <button
              className="ww-modal__btn ww-modal__btn--confirm"
              disabled={actionLoading}
              onClick={handleRejectConfirm}
            >
              {actionLoading ? 'Przetwarzanie…' : '✕ Odrzuć wniosek'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

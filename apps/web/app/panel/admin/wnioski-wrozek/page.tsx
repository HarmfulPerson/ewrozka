'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../../lib/auth-mock';
import { getUploadUrl } from '../../../lib/api';
import {
  apiGetWizardApplications,
  apiApproveWizardApplication,
  apiRejectWizardApplication,
  type WizardApplicationDto,
  type WizardApplicationStatus,
} from '../../../lib/api-admin';
import '../../panel-shared.css';
import './wnioski-wrozek.css';

const LIMIT = 5;

const STATUS_LABEL: Record<'pending' | 'rejected', string> = {
  pending: 'Oczekuje',
  rejected: 'Odrzucono',
};

const STATUS_CLASS: Record<WizardApplicationStatus, string> = {
  pending: 'ww-badge--pending',
  approved: 'ww-badge--approved',
  rejected: 'ww-badge--rejected',
};

type FilterTab = 'pending' | 'rejected';

export default function AdminWniosikiWrozekPage() {
  const router = useRouter();
  const [user] = useState(() => getStoredUser());
  const [applications, setApplications] = useState<WizardApplicationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterTab>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedBio, setExpandedBio] = useState<string | null>(null);

  // Modal odrzucenia
  const [rejectModal, setRejectModal] = useState<{ id: string; username: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      router.replace('/panel');
      return;
    }
    fetchApplications(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchApplications = async (targetPage: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await apiGetWizardApplications(user.token, filterStatus, targetPage, LIMIT);
      setApplications(result.data);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się pobrać wniosków.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchApplications(newPage);
  };

  const handleApprove = async (id: string) => {
    if (!user) return;
    setActionLoading(id);
    try {
      await apiApproveWizardApplication(user.token, id);
      toast.success('Konto specjalisty zostało zatwierdzone. Wysłano e-mail z powiadomieniem.');
      fetchApplications(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (id: string, username: string) => {
    setRejectReason('');
    setRejectModal({ id, username });
  };

  const handleRejectConfirm = async () => {
    if (!user || !rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await apiRejectWizardApplication(user.token, rejectModal.id, rejectReason);
      toast.success('Wniosek odrzucony. Wysłano e-mail do specjalisty.');
      setRejectModal(null);
      fetchApplications(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="ww-page">
      <div className="ww-header">
        <div>
          <h1 className="ww-title">Wnioski specjalistów</h1>
          <p className="ww-subtitle">
            Przeglądaj i zatwierdzaj zgłoszenia nowych specjalistów
          </p>
        </div>
        <div className="ww-filters">
          {(['pending', 'rejected'] as FilterTab[]).map((s) => (
            <button
              key={s}
              className={`ww-filter${filterStatus === s ? ' ww-filter--active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Info o zatwierdzonych */}
      <div className="ww-approved-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
        Zatwierdzeni specjaliści są dostępni w zakładce{' '}
        <Link href="/panel/admin/wrozki" className="ww-approved-info__link">
          Specjaliści →
        </Link>
      </div>

      {loading ? (
        <div className="panel-page-spinner">
          <span className="panel-spinner" />
        </div>
      ) : applications.length === 0 ? (
        <div className="ww-empty">
          <span className="ww-empty__icon">🔮</span>
          <p>
            {filterStatus === 'pending'
              ? 'Brak oczekujących wniosków.'
              : 'Brak odrzuconych wniosków.'}
          </p>
        </div>
      ) : (
        <>
          <div className="ww-list">
            {applications.map((app) => (
              <div key={app.id} className="ww-card">
                {/* Avatar */}
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

                {/* Dane */}
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

                  {/* Powód odrzucenia */}
                  {app.wizardApplicationStatus === 'rejected' && app.rejectionReason && (
                    <div className="ww-card__rejection">
                      <span className="ww-card__rejection-label">Powód odrzucenia:</span>
                      {app.rejectionReason}
                    </div>
                  )}

                  {/* Bio – skrócone */}
                  <div className="ww-card__bio-wrap">
                    <p className={`ww-card__bio${expandedBio === app.id ? ' ww-card__bio--expanded' : ''}`}>
                      {app.bio || <em className="ww-card__bio-empty">Brak opisu</em>}
                    </p>
                    {app.bio && app.bio.length > 150 && (
                      <button
                        className="ww-card__bio-toggle"
                        onClick={() => setExpandedBio(expandedBio === app.id ? null : app.id)}
                      >
                        {expandedBio === app.id ? 'Zwiń' : 'Czytaj więcej'}
                      </button>
                    )}
                  </div>

                  {/* Akcje */}
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
                          onClick={() => handleApprove(app.id)}
                        >
                          {actionLoading === app.id ? '…' : '✓ Zatwierdź'}
                        </button>
                        <button
                          className="ww-card__btn ww-card__btn--reject"
                          disabled={actionLoading === app.id}
                          onClick={() => openRejectModal(app.id, app.username)}
                        >
                          {actionLoading === app.id ? '…' : '✕ Odrzuć'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginacja */}
          {totalPages > 1 && (
            <div className="ww-pagination">
              <button
                className="ww-pagination__btn"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
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
                onClick={() => handlePageChange(page + 1)}
              >
                →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal odrzucenia */}
      {rejectModal && (
        <div className="ww-modal-overlay" onClick={() => setRejectModal(null)}>
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
                onClick={() => setRejectModal(null)}
              >
                Anuluj
              </button>
              <button
                className="ww-modal__btn ww-modal__btn--confirm"
                disabled={actionLoading === rejectModal.id}
                onClick={handleRejectConfirm}
              >
                {actionLoading === rejectModal.id ? 'Przetwarzanie…' : '✕ Odrzuć wniosek'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

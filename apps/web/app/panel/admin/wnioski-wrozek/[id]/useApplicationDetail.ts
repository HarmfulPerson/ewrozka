'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../../../lib/auth-mock';
import {
  apiGetWizardApplication,
  apiApproveWizardApplication,
  apiRejectWizardApplication,
  type WizardApplicationDto,
} from '../../../../lib/api-admin';

export function useApplicationDetail() {
  const params = useParams();
  const router = useRouter();
  const [user] = useState(() => getStoredUser());
  const [app, setApp] = useState<WizardApplicationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  return {
    app,
    loading,
    actionLoading,
    showRejectModal,
    setShowRejectModal,
    rejectReason,
    setRejectReason,
    handleApprove,
    handleRejectConfirm,
  };
}

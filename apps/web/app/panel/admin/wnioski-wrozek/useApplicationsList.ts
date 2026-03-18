'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../../lib/auth-mock';
import {
  apiGetWizardApplications,
  apiApproveWizardApplication,
  apiRejectWizardApplication,
  type WizardApplicationDto,
} from '../../../lib/api-admin';

const LIMIT = 5;

export type FilterTab = 'pending' | 'rejected';

export function useApplicationsList() {
  const router = useRouter();
  const [user] = useState(() => getStoredUser());
  const [applications, setApplications] = useState<WizardApplicationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterTab>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedBio, setExpandedBio] = useState<string | null>(null);

  const [rejectModal, setRejectModal] = useState<{ id: string; username: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const totalPages = Math.ceil(total / LIMIT);

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

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      router.replace('/panel');
      return;
    }
    fetchApplications(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

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

  return {
    applications,
    total,
    page,
    loading,
    filterStatus,
    setFilterStatus,
    actionLoading,
    expandedBio,
    setExpandedBio,
    totalPages,
    handlePageChange,
    handleApprove,
    openRejectModal,
    rejectModal,
    setRejectModal,
    rejectReason,
    setRejectReason,
    handleRejectConfirm,
  };
}

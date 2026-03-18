'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import {
  apiAcceptMeetingRequest,
  apiRejectMeetingRequest,
  apiAcceptGuestBooking,
  apiRejectGuestBooking,
  apiGetWizardUnifiedRequests,
  type UnifiedRequestDto,
} from '../../lib/api-meetings';
import { VALID_FILTERS, type RejectModalState } from './types';

const notifyChanged = () => window.dispatchEvent(new Event('ewrozka:pending-requests-changed'));

export function useWnioski() {
  const searchParams = useSearchParams();
  const [user] = useState(() => getStoredUser());

  const [items, setItems]   = useState<UnifiedRequestDto[]>([]);
  const [total, setTotal]   = useState(0);

  const [offset, setOffset]             = useState(0);
  const [limit, setLimit]               = useState(20);
  const [statusFilter, setStatusFilter] = useState(() => {
    const fromUrl = searchParams.get('status') ?? 'pending';
    return VALID_FILTERS.includes(fromUrl) ? fromUrl : 'pending';
  });
  const [sortBy, setSortBy]             = useState('scheduledAt');
  const [sortOrder, setSortOrder]       = useState<'ASC' | 'DESC'>('DESC');

  const [loading, setLoading]           = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [rejectModal, setRejectModal] = useState<RejectModalState>({
    open: false, id: null, kind: 'guest', reason: '',
  });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetWizardUnifiedRequests(user.token, {
        status: statusFilter || undefined,
        limit, offset, sortBy, order: sortOrder,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się załadować wniosków');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, offset, limit, sortBy, sortOrder]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener('ewrozka:pending-requests-changed', handler);
    return () => window.removeEventListener('ewrozka:pending-requests-changed', handler);
  }, [fetchAll]);

  const handleAccept = async (item: UnifiedRequestDto) => {
    if (!user) return;
    setProcessingId(item.id);
    try {
      if (item.kind === 'regular') {
        await apiAcceptMeetingRequest(user.token, Number(item.id));
      } else {
        await apiAcceptGuestBooking(user.token, item.id);
      }
      toast.success('Wniosek zaakceptowany!');
      notifyChanged();
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd akceptacji');
    } finally { setProcessingId(null); }
  };

  const handleReject = (item: UnifiedRequestDto) => {
    setRejectModal({ open: true, id: item.id, kind: item.kind, reason: '' });
  };

  const handleConfirmReject = async () => {
    if (!user || rejectModal.id === null) return;
    const { id, kind, reason } = rejectModal;
    if (!reason.trim()) {
      setRejectModal(m => ({ ...m, showError: true }));
      return;
    }
    setRejectModal(m => ({ ...m, open: false }));
    setProcessingId(id);
    try {
      if (kind === 'regular') {
        await apiRejectMeetingRequest(user.token, Number(id), reason.trim());
      } else {
        await apiRejectGuestBooking(user.token, id, reason.trim());
      }
      toast.success('Wniosek odrzucony.');
      notifyChanged();
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd odrzucenia');
    } finally {
      setProcessingId(null);
      setRejectModal({ open: false, id: null, kind: 'guest', reason: '' });
    }
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(col);
      setSortOrder('DESC');
    }
    setOffset(0);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return {
    items, total, offset, setOffset, limit, setLimit,
    statusFilter, setStatusFilter,
    sortBy, sortOrder, toggleSort,
    loading, processingId,
    rejectModal, setRejectModal,
    handleAccept, handleReject, handleConfirmReject,
    totalPages, currentPage,
  };
}

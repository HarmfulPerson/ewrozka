'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetClientUnifiedRequests, type ClientRequestDto } from '../../lib/api-meetings';
import { apiRateAppointment } from '../../lib/api-calendar';

const VALID_FILTERS = ['', 'pending', 'accepted', 'paid', 'completed', 'rejected', 'cancelled'];

export function useMojeSpotkania() {
  const searchParams = useSearchParams();
  const [user] = useState(() => getStoredUser());

  const [items, setItems] = useState<ClientRequestDto[]>([]);
  const [total, setTotal] = useState(0);

  const [offset, setOffset]             = useState(0);
  const [limit, setLimit]               = useState(20);
  const [statusFilter, setStatusFilter] = useState(() => {
    const fromUrl = searchParams.get('status') ?? '';
    return VALID_FILTERS.includes(fromUrl) ? fromUrl : '';
  });
  const [sortBy, setSortBy]             = useState('scheduledAt');
  const [sortOrder, setSortOrder]       = useState<'ASC' | 'DESC'>('DESC');

  const [loading, setLoading]           = useState(true);

  const [hoverRating, setHoverRating] = useState<Record<string, number>>({});
  const [pendingRating, setPendingRating] = useState<Record<string, { stars: number; comment: string }>>({});
  const [submittingRating, setSubmittingRating] = useState<string | null>(null);

  const [paymentModal, setPaymentModal] = useState<{
    appointmentUid: string;
    amountZl: string;
    title: string;
  } | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetClientUnifiedRequests(user.token, {
        status: statusFilter || undefined,
        limit, offset, sortBy, order: sortOrder,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, offset, limit, sortBy, sortOrder]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePay = (item: ClientRequestDto) => {
    if (!item.appointmentUid) return;
    setPaymentModal({
      appointmentUid: item.appointmentUid,
      amountZl: item.priceGrosze ? `${(item.priceGrosze / 100).toFixed(2)} zł` : 'Płatność',
      title: item.advertisementTitle || 'Konsultacja',
    });
  };

  const handlePaymentSuccess = () => {
    setPaymentModal(null);
    toast.success('Płatność zakończona pomyślnie!');
    fetchAll();
  };

  const handleSelectStar = (itemId: string, stars: number) => {
    setPendingRating(prev => ({
      ...prev,
      [itemId]: { stars, comment: prev[itemId]?.comment ?? '' },
    }));
  };

  const handleSubmitRating = async (item: ClientRequestDto) => {
    if (!user || !item.appointmentUid) return;
    const pending = pendingRating[item.uid];
    if (!pending) return;
    setSubmittingRating(item.uid);
    try {
      await apiRateAppointment(user.token, item.appointmentUid, pending.stars, pending.comment || undefined);
      toast.success(`Oceniłeś spotkanie na ${pending.stars} ${pending.stars === 1 ? 'gwiazdkę' : pending.stars < 5 ? 'gwiazdki' : 'gwiazdek'}!`);
      setItems(prev => prev.map(i => i.uid === item.uid ? { ...i, rating: pending.stars } : i));
      setPendingRating(prev => {
        const next = { ...prev };
        delete next[item.uid];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zapisać oceny');
    } finally {
      setSubmittingRating(null);
    }
  };

  const getJoinStatus = (startsAt: string | null) => {
    if (!startsAt) return { canJoin: false, tooltip: '' };
    const diff = new Date(startsAt).getTime() - 5 * 60 * 1000 - Date.now();
    if (diff <= 0) return { canJoin: true, tooltip: '' };
    const totalMins = Math.ceil(diff / 60000);
    const d = Math.floor(totalMins / 1440);
    const h = Math.floor((totalMins % 1440) / 60);
    const m = totalMins % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} d`);
    if (h > 0) parts.push(`${h} h`);
    if (m > 0 || parts.length === 0) parts.push(`${m} min`);
    return { canJoin: false, tooltip: `Dostępne za ${parts.join(' ')}` };
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
    user,
    items,
    total,
    offset,
    setOffset,
    limit,
    setLimit,
    statusFilter,
    setStatusFilter,
    sortBy,
    sortOrder,
    loading,
    hoverRating,
    setHoverRating,
    pendingRating,
    submittingRating,
    paymentModal,
    setPaymentModal,
    handlePay,
    handlePaymentSuccess,
    handleSelectStar,
    handleSubmitRating,
    getJoinStatus,
    toggleSort,
    totalPages,
    currentPage,
  };
}

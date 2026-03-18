'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../../../lib/auth-mock';
import {
  apiGetAdminWizards,
  type AdminWizardRow,
  type AdminWizardsFilters,
  type AdminWizardsSortBy,
} from '../../../lib/api-admin';

const LIMIT = 10;

export function useWizardsList() {
  const router = useRouter();
  const [user] = useState(() => getStoredUser());
  const [data, setData] = useState<AdminWizardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminWizardsFilters>({});
  const [meetingsMin, setMeetingsMin] = useState('');
  const [meetingsMax, setMeetingsMax] = useState('');
  const [earnedMinZl, setEarnedMinZl] = useState('');
  const [earnedMaxZl, setEarnedMaxZl] = useState('');
  const [availableNow, setAvailableNow] = useState(false);
  const [sortBy, setSortBy] = useState<AdminWizardsSortBy>('pendingVideo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchWizards = useCallback(async (targetPage: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await apiGetAdminWizards(
        user.token,
        filters,
        sortBy,
        sortOrder,
        targetPage,
        LIMIT,
      );
      setData(result.data);
      setTotal(result.total);
      setPage(result.page);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user, filters, sortBy, sortOrder]);

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      router.replace('/panel');
      return;
    }
    fetchWizards(1);
  }, [user, router, fetchWizards]);

  const totalPages = Math.ceil(total / LIMIT);

  const handleApplyFilters = () => {
    const effective: AdminWizardsFilters = {};
    const minM = meetingsMin.trim() ? parseInt(meetingsMin, 10) : NaN;
    const maxM = meetingsMax.trim() ? parseInt(meetingsMax, 10) : NaN;
    if (!isNaN(minM)) effective.minMeetings = minM;
    if (!isNaN(maxM)) effective.maxMeetings = maxM;
    const minNum = earnedMinZl.trim() ? parseFloat(earnedMinZl.replace(',', '.')) : NaN;
    const maxNum = earnedMaxZl.trim() ? parseFloat(earnedMaxZl.replace(',', '.')) : NaN;
    if (!isNaN(minNum)) effective.minEarnedGrosze = Math.round(minNum * 100);
    if (!isNaN(maxNum)) effective.maxEarnedGrosze = Math.round(maxNum * 100);
    if (availableNow) effective.availableNow = true;
    setFilters(effective);
  };

  const handleSort = (col: AdminWizardsSortBy) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return {
    data,
    total,
    page,
    loading,
    totalPages,
    meetingsMin,
    setMeetingsMin,
    meetingsMax,
    setMeetingsMax,
    earnedMinZl,
    setEarnedMinZl,
    earnedMaxZl,
    setEarnedMaxZl,
    availableNow,
    setAvailableNow,
    sortBy,
    handleApplyFilters,
    handleSort,
    fetchWizards,
    router,
  };
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetMyClientRequests, MeetingRequestDto } from '../../lib/api-meetings';

export function useMojeWnioski() {
  const [user] = useState(() => getStoredUser());
  const [requests, setRequests] = useState<MeetingRequestDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetMyClientRequests(user.token, {
        status: statusFilter || undefined,
        limit,
        offset,
      });
      setRequests(data.requests);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować wniosków');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, limit, offset]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setOffset(0);
  };

  return {
    requests,
    loading,
    error,
    statusFilter,
    offset,
    limit,
    totalPages,
    currentPage,
    setOffset,
    handleLimitChange,
    handleStatusFilterChange,
  };
}

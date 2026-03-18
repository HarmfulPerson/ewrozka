'use client';

import { useEffect, useState, useCallback } from 'react';
import { getStoredUser } from '../../lib/auth-mock';
import { apiGetMyAppointments, AppointmentDto } from '../../lib/api-calendar';
import { apiPayForAppointment } from '../../lib/api-meetings';

export function useWizyty() {
  const [user] = useState(() => getStoredUser());
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('upcoming');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetMyAppointments(user.token, {
        filter: filterType || undefined,
        limit,
        offset,
      });
      setAppointments(data.appointments);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować wizyt');
    } finally {
      setLoading(false);
    }
  }, [user, filterType, limit, offset]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handlePay = async (id: number) => {
    if (!user) return;
    setPayingId(id);
    setError(null);
    setSuccess(null);

    try {
      await apiPayForAppointment(user.token, id);
      setSuccess('Płatność została przetworzona! Spotkanie zostało potwierdzone.');
      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się przetworzyć płatności');
    } finally {
      setPayingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0);
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setOffset(0);
  };

  return {
    appointments,
    loading,
    error,
    success,
    payingId,
    filterType,
    offset,
    limit,
    totalPages,
    currentPage,
    setOffset,
    handlePay,
    handleLimitChange,
    handleFilterChange,
  };
}

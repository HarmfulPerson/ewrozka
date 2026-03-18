'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import {
  apiGetMyAvailability,
  apiCreateAvailability,
  apiDeleteAvailability,
  AvailabilityDto,
} from '../../lib/api-calendar';
import { getWeekStart } from './constants';

export function useAvailability() {
  const [user] = useState(() => getStoredUser());
  const [availabilities, setAvailabilities] = useState<AvailabilityDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState('upcoming');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [repeat, setRepeat] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AvailabilityDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiGetMyAvailability(user.token, {
        filter: filterType || undefined,
        limit, offset, sortOrder,
      });
      setAvailabilities(data.availabilities);
      setTotal(data.total);
    } catch {
      toast.error('Nie udało się załadować dostępności');
    } finally {
      setLoading(false);
    }
  }, [user, filterType, offset, limit, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    setOffset(0);
  };

  const openAddModal = () => {
    setSelectedDays([]); setStartTime('09:00'); setEndTime('17:00');
    setRepeat(false); setRepeatWeeks(1); setFormError(null);
    setAddModalOpen(true);
  };

  const toggleDay = (i: number) => {
    setSelectedDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort());
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);
    setSubmitting(true);
    try {
      if (selectedDays.length === 0) throw new Error('Wybierz przynajmniej jeden dzień');
      const [sH = 0, sM = 0] = startTime.split(':').map(Number);
      const [eH = 0, eM = 0] = endTime.split(':').map(Number);
      if (eH * 60 + eM <= sH * 60 + sM) throw new Error('Godzina zakończenia musi być po godzinie rozpoczęcia');

      const now = new Date();
      const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
      const weekStart = getWeekStart();
      const weeks = repeat ? repeatWeeks : 1;
      let added = 0;

      for (let w = 0; w < weeks; w++) {
        for (const dayIdx of selectedDays) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + dayIdx + w * 7);
          dayDate.setHours(0, 0, 0, 0);
          if (dayDate < todayMidnight) continue;

          const start = new Date(dayDate); start.setHours(sH, sM, 0, 0);
          const end = new Date(dayDate); end.setHours(eH, eM, 0, 0);

          if (dayDate.getTime() === todayMidnight.getTime() && start < now) {
            throw new Error(`Godzina ${startTime} na dziś już minęła`);
          }
          await apiCreateAvailability(user.token, { startsAt: start.toISOString(), endsAt: end.toISOString() });
          added++;
        }
      }
      if (added === 0) throw new Error('Nie dodano żadnych bloków — dni w przeszłości');
      toast.success(`Dodano ${added} ${added === 1 ? 'blok' : added < 5 ? 'bloki' : 'bloków'} dostępności`);
      setAddModalOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Błąd');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await apiDeleteAvailability(user.token, deleteTarget.id);
      toast.success('Dostępność usunięta');
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd usuwania');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return {
    availabilities, total, loading,
    filterType, setFilterType,
    sortOrder, toggleSort,
    offset, setOffset,
    limit, setLimit,
    addModalOpen, setAddModalOpen, openAddModal,
    formError, selectedDays, toggleDay,
    startTime, setStartTime, endTime, setEndTime,
    repeat, setRepeat, repeatWeeks, setRepeatWeeks,
    submitting, handleAdd, timeSlots,
    deleteTarget, setDeleteTarget, deleting, confirmDelete,
    totalPages, currentPage,
  };
}

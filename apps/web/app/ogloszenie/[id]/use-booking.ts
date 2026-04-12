'use client';

import { useState } from 'react';
import { apiGetAvailableSlots, SlotDto } from '../../lib/api-booking';

export type BookingStep = 'choice' | 'slots' | 'guest-form';
export type DateStep = 'month' | 'day' | 'time';

export interface GuestFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface GuestFormErrors {
  name?: string;
  email?: string;
}

export function useBooking(advertisementUid: string | undefined) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<BookingStep>('choice');
  const [dateStep, setDateStep] = useState<DateStep>('month');

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [availableSlots, setAvailableSlots] = useState<SlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Guest form
  const [guestForm, setGuestForm] = useState<GuestFormData>({ name: '', email: '', phone: '', message: '' });
  const [guestErrors, setGuestErrors] = useState<GuestFormErrors>({});
  const [guestSuccess, setGuestSuccess] = useState(false);

  const loadSlotDates = async () => {
    if (!advertisementUid) return;
    setLoadingDates(true);
    try {
      const today = new Date();
      const end = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      const fromDate = today.toISOString().split('T')[0] ?? '';
      const toDate = end.toISOString().split('T')[0] ?? '';
      const response = await apiGetAvailableSlots(advertisementUid, fromDate, toDate);

      const toLocalDateStr = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      };
      const uniqueDates = [...new Set(response.slots.map(slot => toLocalDateStr(slot.startsAt)))];
      setAvailableDates(uniqueDates);

      const months = new Set(uniqueDates.map(d => d.substring(0, 7)));
      if (months.size === 1) {
        setSelectedMonth([...months][0]!);
        setDateStep('day');
      } else {
        setDateStep('month');
      }
    } catch {
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  };

  const loadSlotsForDate = async (dateStr: string) => {
    if (!advertisementUid) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setDateStep('time');
    setLoadingSlots(true);
    try {
      const nextDay = new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000);
      const toDate = nextDay.toISOString().split('T')[0] ?? '';
      const response = await apiGetAvailableSlots(advertisementUid, dateStr, toDate);
      setAvailableSlots(response.slots);
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const open = (isLoggedIn: boolean) => {
    setStep(isLoggedIn ? 'slots' : 'choice');
    setIsOpen(true);
    if (isLoggedIn) loadSlotDates();
  };

  const close = () => {
    setIsOpen(false);
    setStep('choice');
    setDateStep('month');
    setSelectedMonth(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableDates([]);
    setAvailableSlots([]);
    setSubmitting(false);
    setGuestForm({ name: '', email: '', phone: '', message: '' });
    setGuestErrors({});
    setGuestSuccess(false);
  };

  const selectMonth = (monthKey: string) => {
    setSelectedMonth(monthKey);
    setSelectedDate(null);
    setSelectedSlot(null);
    setDateStep('day');
  };

  const goBack = () => {
    if (dateStep === 'time') {
      setSelectedDate(null);
      setSelectedSlot(null);
      setDateStep('day');
    } else if (dateStep === 'day') {
      const months = new Set(availableDates.map(d => d.substring(0, 7)));
      if (months.size > 1) {
        setSelectedMonth(null);
        setDateStep('month');
      }
    }
  };

  const startGuestFlow = () => {
    setStep('guest-form');
    loadSlotDates();
  };

  const updateGuestField = (field: keyof GuestFormData, value: string) => {
    setGuestForm(prev => ({ ...prev, [field]: value }));
    if (field === 'name' || field === 'email') {
      setGuestErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateGuestForm = (): boolean => {
    const errs: GuestFormErrors = {};
    if (!guestForm.name.trim()) errs.name = 'Podaj imię i nazwisko';
    if (!guestForm.email.trim() || !guestForm.email.includes('@')) errs.email = 'Podaj poprawny adres e-mail';
    if (Object.keys(errs).length > 0) {
      setGuestErrors(errs);
      return false;
    }
    setGuestErrors({});
    return true;
  };

  const changeSlot = () => {
    setSelectedSlot(null);
    setDateStep('time');
  };

  // Grouped dates helper
  const groupedDates = (() => {
    const grouped: Record<string, string[]> = {};
    availableDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(dateStr);
    });
    return grouped;
  })();

  const monthKeys = Object.keys(groupedDates);
  const datesForMonth = selectedMonth ? (groupedDates[selectedMonth] ?? []) : [];
  const hasMultipleMonths = monthKeys.length > 1;

  return {
    isOpen, step, dateStep,
    availableDates, loadingDates,
    selectedMonth, selectedDate,
    availableSlots, loadingSlots,
    selectedSlot, submitting,
    guestForm, guestErrors, guestSuccess,
    groupedDates, monthKeys, datesForMonth, hasMultipleMonths,

    open, close,
    selectMonth, loadSlotsForDate, selectSlot: setSelectedSlot, goBack,
    startGuestFlow, updateGuestField, validateGuestForm, changeSlot,
    setSubmitting, setGuestSuccess, setGuestErrors,
  };
}

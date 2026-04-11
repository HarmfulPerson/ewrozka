'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getStoredUser } from '../lib/auth-mock';
import { apiGetMyAppointments, type AppointmentDto } from '../lib/api-calendar';
import {
  apiGetWizardGuestBookings,
  apiAcceptMeetingRequest,
  apiRejectMeetingRequest,
  apiAcceptGuestBooking,
  apiRejectGuestBooking,
  apiGetWizardUnifiedRequests,
  type UnifiedRequestDto,
} from '../lib/api-meetings';
import {
  apiGetMyFeaturedStatus,
  apiGetFeaturedConfig,
  type FeaturedStatusDto,
  type FeaturedConfigDto,
} from '../lib/api-payment';

export type UpcomingMeetingItem =
  | (AppointmentDto & { isGuest?: false })
  | {
      id: string;
      startsAt: string;
      durationMinutes: number;
      clientUsername?: string;
      meetingToken?: null;
      isGuest: true;
      guestBookingId: string;
    };

export type RejectModalState = {
  open: boolean;
  id: string | null;
  kind: 'regular' | 'guest';
  reason: string;
  showError?: boolean;
};

export function useWizardDashboard() {
  const [user] = useState(() => getStoredUser());
  const isWizard = user?.roles?.includes('wizard');
  const isAdmin = user?.roles?.includes('admin');

  const [appointments, setAppointments] = useState<UpcomingMeetingItem[]>([]);
  const [pendingItems, setPendingItems] = useState<UnifiedRequestDto[]>([]);
  const [acceptedItems, setAcceptedItems] = useState<UnifiedRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<RejectModalState>({ open: false, id: null, kind: 'regular', reason: '' });
  const [featuredStatus, setFeaturedStatus] = useState<FeaturedStatusDto>({ isFeatured: false, expiresAt: null });
  const [featuredConfig, setFeaturedConfig] = useState<FeaturedConfigDto | null>(null);
  const [featuredStatusLoading, setFeaturedStatusLoading] = useState(true);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!user || !isWizard) { setLoading(false); return; }
    setLoading(true);
    try {
      const [apptRes, guestRes, pendingRes, acceptedRes] = await Promise.all([
        apiGetMyAppointments(user.token, { status: 'paid', limit: 10 }),
        apiGetWizardGuestBookings(user.token),
        apiGetWizardUnifiedRequests(user.token, { status: 'pending', limit: 3, sortBy: 'createdAt', order: 'DESC' }),
        apiGetWizardUnifiedRequests(user.token, { status: 'accepted', limit: 3, sortBy: 'createdAt', order: 'DESC' }),
      ]);
      const guestAsAppointments: Array<{ id: string; startsAt: string; durationMinutes: number; clientUsername?: string; meetingToken?: null; isGuest: true; guestBookingId: string }> =
        (guestRes.bookings || [])
          .filter((b) => ['paid', 'completed'].includes(b.status))
          .map((b) => ({
            id: `guest-${b.id}`,
            startsAt: b.scheduledAt,
            durationMinutes: b.durationMinutes,
            clientUsername: b.guestName,
            meetingToken: null,
            isGuest: true as const,
            guestBookingId: b.id,
          }));
      const merged: UpcomingMeetingItem[] = [
        ...apptRes.appointments.map((a) => ({ ...a, isGuest: false as const })),
        ...guestAsAppointments,
      ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      const now = Date.now();
      const upcoming = merged.filter((m) => new Date(m.startsAt).getTime() + (m.durationMinutes || 0) * 60_000 > now);
      setAppointments(upcoming.slice(0, 3));
      setPendingItems(pendingRes.items);
      setAcceptedItems(acceptedRes.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, isWizard]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const handler = () => fetchDashboard();
    window.addEventListener('ewrozka:pending-requests-changed', handler);
    return () => window.removeEventListener('ewrozka:pending-requests-changed', handler);
  }, [fetchDashboard]);

  useEffect(() => {
    if (!user || !isWizard) return;
    Promise.all([
      apiGetMyFeaturedStatus(user.token),
      apiGetFeaturedConfig(),
    ])
      .then(([status, config]) => {
        setFeaturedStatus(status);
        setFeaturedConfig(config);
      })
      .catch(() => {})
      .finally(() => setFeaturedStatusLoading(false));
  }, [user, isWizard]);

  const notifyChanged = () => window.dispatchEvent(new Event('ewrozka:pending-requests-changed'));

  const handleAccept = async (item: UnifiedRequestDto) => {
    if (!user) return;
    setProcessingId(item.id);
    try {
      if (item.kind === 'regular') {
        // Phase 3: pass the meeting_request uid so the backend routes to the
        // /meeting-requests/uid/:uid/accept endpoint.
        await apiAcceptMeetingRequest(user.token, item.uid);
      } else {
        await apiAcceptGuestBooking(user.token, item.id);
      }
      toast.success('Wniosek zaakceptowany!');
      notifyChanged();
      await fetchDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd akceptacji');
    } finally { setProcessingId(null); }
  };

  const openRejectModal = (item: UnifiedRequestDto) => {
    // rejectModal.id carries the uid (meeting_request.uid for regular,
    // guest_booking.id for guest). For guest the id column is already uuid,
    // so item.id === item.uid.
    setRejectModal({ open: true, id: item.uid, kind: item.kind, reason: '' });
  };

  const handleConfirmReject = async () => {
    if (!user || rejectModal.id === null) return;
    const { id: uid, kind, reason } = rejectModal;
    if (!reason.trim()) {
      setRejectModal(m => ({ ...m, showError: true }));
      return;
    }
    setRejectModal(m => ({ ...m, open: false }));
    setProcessingId(uid);
    try {
      if (kind === 'regular') {
        await apiRejectMeetingRequest(user.token, uid, reason.trim());
      } else {
        await apiRejectGuestBooking(user.token, uid, reason.trim());
      }
      toast.success('Wniosek odrzucony.');
      notifyChanged();
      await fetchDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd odrzucenia');
    } finally {
      setProcessingId(null);
      setRejectModal({ open: false, id: null, kind: 'regular', reason: '' });
    }
  };

  const handleFeaturedSuccess = () => {
    setShowFeaturedModal(false);
    toast.success('Wyróżnienie zostało aktywowane! Twój profil jest teraz promowany.');
    if (user?.token) {
      apiGetMyFeaturedStatus(user.token).then(setFeaturedStatus).catch(() => {});
    }
  };

  return {
    user,
    isWizard,
    isAdmin,
    appointments,
    pendingItems,
    acceptedItems,
    loading,
    processingId,
    rejectModal,
    setRejectModal,
    featuredStatus,
    featuredConfig,
    featuredStatusLoading,
    showFeaturedModal,
    setShowFeaturedModal,
    handleAccept,
    openRejectModal,
    handleConfirmReject,
    handleFeaturedSuccess,
  };
}

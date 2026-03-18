'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../../../lib/auth-mock';
import {
  apiGetAdminWizard,
  apiSetAdminWizardFeatured,
  apiUpdateAdminWizardPlatformFee,
  apiResetWizardPlatformFeeToTier,
  apiApproveWizardVideo,
  apiRejectWizardVideo,
} from '../../../../lib/api-admin';

export type WizardData = Awaited<ReturnType<typeof apiGetAdminWizard>>;

export function useWizardProfile() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [user] = useState(() => getStoredUser());
  const [wizard, setWizard] = useState<WizardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [feePercent, setFeePercent] = useState<string>('');
  const [feeSaving, setFeeSaving] = useState(false);
  const [resetToTierLoading, setResetToTierLoading] = useState(false);
  const [videoApproveLoading, setVideoApproveLoading] = useState(false);
  const [videoRejectLoading, setVideoRejectLoading] = useState(false);

  useEffect(() => {
    if (!user?.roles?.includes('admin')) {
      router.replace('/panel');
      return;
    }
    if (Number.isNaN(id) || id < 1) {
      router.replace('/panel/admin/wrozki');
      return;
    }
    apiGetAdminWizard(user.token, id)
      .then(setWizard)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Nie udało się pobrać danych specjalisty.');
        router.replace('/panel/admin/wrozki');
      })
      .finally(() => setLoading(false));
  }, [user, id, router]);

  useEffect(() => {
    if (wizard?.platformFeePercent != null) {
      setFeePercent(String(wizard.platformFeePercent));
    } else {
      setFeePercent(String(wizard?.tierBasedFee?.feePercent ?? 20));
    }
  }, [wizard?.platformFeePercent, wizard?.tierBasedFee?.feePercent]);

  const handleSetFeatured = async () => {
    if (!user || !wizard) return;
    setFeaturedLoading(true);
    try {
      await apiSetAdminWizardFeatured(user.token, wizard.id);
      toast.success('Wyróżnienie ustawione bez płatności.');
      setWizard((prev) =>
        prev
          ? {
              ...prev,
              isFeatured: true,
              featuredExpiresAt: null,
            }
          : null,
      );
      const updated = await apiGetAdminWizard(user.token, wizard.id);
      setWizard(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setFeaturedLoading(false);
    }
  };

  const handleResetToTier = async () => {
    if (!user || !wizard) return;
    setResetToTierLoading(true);
    try {
      await apiResetWizardPlatformFeeToTier(user.token, wizard.id);
      toast.success('Prowizja z progów. Specjalista używa teraz naliczania z liczby spotkań.');
      const updated = await apiGetAdminWizard(user.token, wizard.id);
      setWizard(updated);
      setFeePercent(String(updated.tierBasedFee?.feePercent ?? 20));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd resetu');
    } finally {
      setResetToTierLoading(false);
    }
  };

  const handleApproveVideo = async () => {
    if (!user || !wizard) return;
    setVideoApproveLoading(true);
    try {
      await apiApproveWizardVideo(user.token, wizard.id);
      toast.success('Filmik zatwierdzony.');
      const updated = await apiGetAdminWizard(user.token, wizard.id);
      setWizard(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd zatwierdzenia');
    } finally {
      setVideoApproveLoading(false);
    }
  };

  const handleRejectVideo = async () => {
    if (!user || !wizard) return;
    setVideoRejectLoading(true);
    try {
      await apiRejectWizardVideo(user.token, wizard.id);
      toast.success('Filmik odrzucony.');
      const updated = await apiGetAdminWizard(user.token, wizard.id);
      setWizard(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd odrzucenia');
    } finally {
      setVideoRejectLoading(false);
    }
  };

  const handleSaveFee = async () => {
    if (!user || !wizard) return;
    const val = parseInt(feePercent, 10);
    if (Number.isNaN(val) || val < 0 || val > 100) {
      toast.error('Prowizja musi być liczbą 0–100');
      return;
    }
    setFeeSaving(true);
    try {
      await apiUpdateAdminWizardPlatformFee(user.token, wizard.id, val);
      toast.success(`Prowizja ustawiona na ${val}%`);
      setWizard((prev) => (prev ? { ...prev, platformFeePercent: val } : null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd zapisu');
    } finally {
      setFeeSaving(false);
    }
  };

  return {
    wizard,
    loading,
    featuredLoading,
    feePercent,
    setFeePercent,
    feeSaving,
    resetToTierLoading,
    videoApproveLoading,
    videoRejectLoading,
    handleSetFeatured,
    handleResetToTier,
    handleApproveVideo,
    handleRejectVideo,
    handleSaveFee,
  };
}

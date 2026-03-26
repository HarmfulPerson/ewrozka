'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import {
  apiGetMyAdvertisements,
  apiCreateAdvertisement,
  apiDeleteAdvertisement,
  AdvertisementDto,
} from '../../lib/api-advertisements';
import { apiCheckConnectReady } from '../../lib/api-payment';

export function useAdvertisements() {
  const [user] = useState(() => getStoredUser());
  const [advertisements, setAdvertisements] = useState<AdvertisementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectReady, setConnectReady] = useState<boolean | null>(null);

  const fetchAdvertisements = async () => {
    if (!user) return;
    try {
      const [data, connectData] = await Promise.all([
        apiGetMyAdvertisements(user.token),
        apiCheckConnectReady(user.token),
      ]);
      setAdvertisements(data.advertisements);
      setConnectReady(
        !!(connectData.connected && connectData.onboardingCompleted && connectData.payoutsEnabled),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować ogłoszeń');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvertisements();
  }, [user]);

  const createAdvertisement = async (
    title: string,
    description: string,
    priceZl: string,
    durationMinutes: string,
    imageFile: File | null,
  ) => {
    if (!user) return;

    setError(null);

    if (!title || !description || !priceZl || !durationMinutes) {
      throw new Error('Wszystkie pola są wymagane');
    }

    const priceFloat = parseFloat(priceZl.replace(',', '.'));
    const duration = parseInt(durationMinutes);

    if (isNaN(priceFloat) || priceFloat < 20) {
      throw new Error('Minimalna cena usługi to 20 zł');
    }

    if (duration <= 0) {
      throw new Error('Czas trwania musi być większy od 0');
    }

    const priceGrosze = Math.round(priceFloat * 100);

    await apiCreateAdvertisement(
      user.token,
      {
        title,
        description,
        priceGrosze,
        durationMinutes: duration,
      },
      imageFile || undefined,
    );

    toast.success('Ogłoszenie zostało dodane!');
    await fetchAdvertisements();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ewrozka:ads-count-changed'));
    }
  };

  const deleteAdvertisement = async (ad: AdvertisementDto) => {
    if (!user) return;

    await apiDeleteAdvertisement(user.token, ad.id);
    toast.success('Ogłoszenie zostało usunięte');
    await fetchAdvertisements();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ewrozka:ads-count-changed'));
    }
  };

  return {
    advertisements,
    loading,
    error,
    setError,
    connectReady,
    createAdvertisement,
    deleteAdvertisement,
  };
}

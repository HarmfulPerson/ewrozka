'use client';

import { useEffect, useState } from 'react';
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
  const [success, setSuccess] = useState<string | null>(null);
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
    setSuccess(null);

    if (!title || !description || !priceZl || !durationMinutes) {
      throw new Error('Wszystkie pola są wymagane');
    }

    const priceFloat = parseFloat(priceZl.replace(',', '.'));
    const duration = parseInt(durationMinutes);

    if (isNaN(priceFloat) || priceFloat <= 0) {
      throw new Error('Cena musi być większa od 0');
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

    setSuccess('Ogłoszenie zostało dodane!');
    await fetchAdvertisements();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ewrozka:ads-count-changed'));
    }
  };

  const deleteAdvertisement = async (ad: AdvertisementDto) => {
    if (!user) return;

    await apiDeleteAdvertisement(user.token, ad.id);
    setSuccess('Ogłoszenie zostało usunięte');
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
    success,
    setSuccess,
    connectReady,
    createAdvertisement,
    deleteAdvertisement,
  };
}

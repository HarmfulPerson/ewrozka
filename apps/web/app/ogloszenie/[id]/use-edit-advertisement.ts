'use client';

import { useState } from 'react';
import { AdvertisementDetailDto } from '../../lib/api';
import { apiUpdateAdvertisement } from '../../lib/api-advertisements';

export function useEditAdvertisement(
  advertisement: AdvertisementDetailDto | null,
  token: string | undefined,
  onSaved: (updated: Partial<AdvertisementDetailDto>) => void,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceZl, setPriceZl] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const open = () => {
    if (!advertisement) return;
    setTitle(advertisement.title);
    setDescription(advertisement.description);
    setPriceZl(((advertisement.priceGrosze ?? 0) / 100).toFixed(2));
    setDuration(String(advertisement.durationMinutes));
    setError('');
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const save = async () => {
    if (!advertisement || !token) return;

    const price = parseFloat(priceZl.replace(',', '.'));
    const dur = parseInt(duration, 10);

    if (!title.trim()) { setError('Podaj tytuł.'); return; }
    if (isNaN(price) || price <= 0) { setError('Podaj poprawną cenę.'); return; }
    if (isNaN(dur) || dur < 5) { setError('Czas trwania musi wynosić co najmniej 5 minut.'); return; }

    setSaving(true);
    setError('');
    try {
      const res = await apiUpdateAdvertisement(token, advertisement.id, {
        title: title.trim(),
        description: description.trim(),
        priceGrosze: Math.round(price * 100),
        durationMinutes: dur,
      });
      onSaved(res.advertisement);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  return {
    isOpen, title, description, priceZl, duration, saving, error,
    open, close, save,
    setTitle, setDescription, setPriceZl, setDuration,
  };
}

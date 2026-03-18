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
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const open = () => {
    if (!advertisement) return;
    setDescription(advertisement.description);
    setError('');
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const save = async () => {
    if (!advertisement || !token) return;

    if (!description.trim()) { setError('Podaj opis.'); return; }

    setSaving(true);
    setError('');
    try {
      const res = await apiUpdateAdvertisement(token, advertisement.id, {
        description: description.trim(),
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
    isOpen, description, saving, error,
    open, close, save, setDescription,
  };
}

'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { getStoredUser } from '../../lib/auth-mock';
import { apiChangePassword } from '../../lib/api';

export function usePasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwErrors, setPwErrors] = useState<{
    currentPassword?: boolean;
    newPassword?: boolean;
    confirmPassword?: boolean;
  }>({});

  const handleChangePassword = async () => {
    const storedUser = getStoredUser();
    if (!storedUser) return;

    const errs: typeof pwErrors = {};
    if (!currentPassword) errs.currentPassword = true;
    if (newPassword.length < 8) errs.newPassword = true;
    if (newPassword !== confirmPassword) errs.confirmPassword = true;

    if (Object.keys(errs).length > 0) {
      setPwErrors(errs);
      if (errs.currentPassword) toast.error('Wpisz obecne hasło');
      else if (errs.newPassword) toast.error('Nowe hasło musi mieć co najmniej 8 znaków');
      else if (errs.confirmPassword) toast.error('Hasła nie są zgodne');
      return;
    }

    setPwErrors({});
    setChangingPassword(true);
    try {
      await apiChangePassword(storedUser.token, currentPassword, newPassword);
      toast.success('Hasło zostało zmienione');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zmienić hasła');
    } finally {
      setChangingPassword(false);
    }
  };

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    changingPassword,
    pwErrors,
    setPwErrors,
    handleChangePassword,
  };
}

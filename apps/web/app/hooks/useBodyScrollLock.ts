import { useEffect } from 'react';

/**
 * Blokuje przewijanie body, gdy modal jest otwarty.
 * Przywraca overflow po odmontowaniu lub gdy isLocked = false.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = original;
    };
  }, [isLocked]);
}

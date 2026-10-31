'use client';

import { useEffect, useRef } from 'react';
import { getToken } from '@/lib/auth';

/**
 * Calls `onLoggedOut` when the login token disappears while the page is open — e.g. the member logged
 * out (or the account was removed) in ANOTHER tab. localStorage changes made by another tab fire the
 * `storage` event here; focus/visibility are re-checked too in case the event was missed (sleeping tab).
 * Only active while `enabled` is true, and fires at most once.
 */
export function useSessionWatcher(onLoggedOut: () => void, enabled = true) {
  const handlerRef = useRef(onLoggedOut);
  handlerRef.current = onLoggedOut;

  useEffect(() => {
    if (!enabled) return;
    let fired = false;
    const check = () => {
      if (fired || getToken()) return;
      fired = true;
      handlerRef.current();
    };
    const onStorage = (e: StorageEvent) => {
      // key === null means localStorage.clear() in the other tab.
      if (e.key === null || e.key === 'token') check();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}

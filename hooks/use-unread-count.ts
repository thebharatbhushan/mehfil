'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchUnreadCount, NOTIFICATIONS_CHANGED } from '@/lib/notifications';

const POLL_MS = 60_000;

/**
 * Unread-notification count for the signed-in member. Checks on mount, every minute while the tab is visible, when the
 * tab regains focus, and whenever another component (bell / page) changes the inbox. Pass enabled=false when signed out.
 */
export function useUnreadCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const res = await fetchUnreadCount();
    if (res.ok && res.data) setCount(res.data.unreadCount);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    refresh();
    const tick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = window.setInterval(tick, POLL_MS);
    const onChanged = (e: Event) => {
      const next = (e as CustomEvent<{ unreadCount?: number }>).detail?.unreadCount;
      if (typeof next === 'number') setCount(next);
    };
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    window.addEventListener(NOTIFICATIONS_CHANGED, onChanged);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChanged);
    };
  }, [enabled, refresh]);

  return { count, setCount, refresh };
}

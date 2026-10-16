'use client';

import { useEffect } from 'react';
import { API_BASE_URL } from '@/lib/mehfil';

const BEAT_MS = 15000; // how often a "still reading" heartbeat is sent
const IDLE_MS = 30000; // no scroll / mouse / key / touch for this long = not reading

/**
 * Reader-badge tracking for a signed-in member. While the poem page is VISIBLE and the member has recently
 * interacted with it, it sends a tiny heartbeat ({ poemId } only). The server measures the elapsed time itself,
 * so nothing here can claim a duration. Hidden tabs and idle pages send nothing. Silent: never shows UI,
 * never blocks the page, and every failure (guest, expired token, offline) is ignored.
 */
export function useReadingActivity(poemId?: string) {
  useEffect(() => {
    if (!poemId) return;
    let token: string | null = null;
    try {
      token = localStorage.getItem('token');
    } catch {}
    if (!token) return; // guests are not tracked

    let lastActivity = Date.now();
    const mark = () => {
      lastActivity = Date.now();
    };
    const events = ['scroll', 'mousemove', 'keydown', 'touchstart', 'click'] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivity > IDLE_MS) return;
      try {
        fetch(`${API_BASE_URL}/api/engagement/reading/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ poemId }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    };

    beat(); // the first beat only starts the server's clock
    const timer = window.setInterval(beat, BEAT_MS);
    return () => {
      window.clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [poemId]);
}

'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mehfil_theme';
const THEME_EVENT = 'mehfil-theme-change';
const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#C16A4B', dark: '#14100d' };

const isPref = (v: unknown): v is ThemePref => v === 'light' || v === 'dark' || v === 'system';

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (isPref(v)) return v;
  } catch {
    /* storage unavailable (private mode) – fall through to the default */
  }
  return 'light'; // the site's original look stays the default
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  return pref === 'dark' || (pref === 'system' && systemPrefersDark()) ? 'dark' : 'light';
}

/** Writes the resolved theme onto <html> (the inline script in app/layout.tsx does the same before first paint). */
export function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
}

/**
 * Light / Dark / System preference, persisted in localStorage (one small enum value).
 * The first render always reports 'light' (same on server and client) and the saved value is picked up
 * in an effect, so there is no hydration mismatch. Several components can use it at once; they stay in sync.
 */
export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>('light');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const sync = () => {
      const p = readThemePref();
      setPrefState(p);
      const r = resolveTheme(p);
      setResolved(r);
      applyTheme(r);
    };
    sync();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => readThemePref() === 'system' && sync();
    mq.addEventListener('change', onSystem);
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      mq.removeEventListener('change', onSystem);
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore – the choice still applies for this page view */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { pref, resolved, setPref };
}

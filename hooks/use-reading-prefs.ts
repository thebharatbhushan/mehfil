'use client';

import { useCallback, useEffect, useState } from 'react';

export type ReadingSize = 'sm' | 'md' | 'lg';
export type ReadingAlign = 'left' | 'center' | 'right';
export type ReadingTheme = 'light' | 'sepia' | 'dark' | 'contrast';

export interface ReadingPrefs {
  size: ReadingSize;
  align: ReadingAlign;
  theme: ReadingTheme;
}

export const DEFAULT_READING_PREFS: ReadingPrefs = { size: 'md', align: 'center', theme: 'light' };

export const READING_SIZES: ReadingSize[] = ['sm', 'md', 'lg'];

const STORAGE_KEY = 'mehfil_reading_prefs';

const ALIGNS: ReadingAlign[] = ['left', 'center', 'right'];
const THEMES: ReadingTheme[] = ['light', 'sepia', 'dark', 'contrast'];

/** Accept only known values so a stale or tampered entry can never reach the DOM. */
function sanitize(raw: unknown): ReadingPrefs {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    size: READING_SIZES.includes(o.size as ReadingSize) ? (o.size as ReadingSize) : DEFAULT_READING_PREFS.size,
    align: ALIGNS.includes(o.align as ReadingAlign) ? (o.align as ReadingAlign) : DEFAULT_READING_PREFS.align,
    theme: THEMES.includes(o.theme as ReadingTheme) ? (o.theme as ReadingTheme) : DEFAULT_READING_PREFS.theme,
  };
}

/**
 * Reading preferences persisted in localStorage.
 * The first render (server and client) always uses the defaults; saved values are applied in an
 * effect after mount, so there is no SSR/hydration mismatch. Only three small enum values are stored.
 */
export function useReadingPrefs() {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_READING_PREFS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPrefs(sanitize(JSON.parse(saved)));
    } catch {
      /* storage unavailable or corrupt: keep defaults */
    }
  }, []);

  const update = useCallback((patch: Partial<ReadingPrefs>) => {
    setPrefs((prev) => {
      const next = sanitize({ ...prev, ...patch });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private mode / quota: preference just won't persist */
      }
      return next;
    });
  }, []);

  return { prefs, update };
}

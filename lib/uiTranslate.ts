'use client';

/**
 * Translation for UI that is created AFTER the page was translated (dropdowns, popovers, lazily loaded lists).
 *
 * Google's website translator only reliably handles what is on the page when the language is applied, so
 * menus that mount on click (theme menu, notification panel, ...) stayed in Hindi. Those components now call
 * `useTr()` and translate their own strings into the language chosen in the language menu. Results are cached
 * (memory + localStorage), so each string is fetched at most once per language.
 *
 * Mark the translated container with `notranslate` / translate="no" so Google does not translate it a second time.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { LANG_EVENT, SOURCE_LANG, getCurrentLang } from '@/lib/googleTranslate';

const mem = new Map<string, string>();
const pending = new Map<string, Promise<void>>();
const STORE = 'mehfil-ui-tr:';
const key = (lang: string, text: string) => `${lang}\u0001${text}`;

function readStore(lang: string, text: string): string | undefined {
  try {
    return window.localStorage.getItem(STORE + key(lang, text)) ?? undefined;
  } catch {
    return undefined;
  }
}
function writeStore(lang: string, text: string, value: string) {
  try {
    window.localStorage.setItem(STORE + key(lang, text), value);
  } catch {
    /* storage full / blocked: memory cache still works */
  }
}

/** Cached translation, if we already have one. */
function peek(lang: string, text: string): string | undefined {
  const k = key(lang, text);
  const hit = mem.get(k);
  if (hit !== undefined) return hit;
  if (typeof window === 'undefined') return undefined;
  const stored = readStore(lang, text);
  if (stored !== undefined) mem.set(k, stored);
  return stored;
}

async function fetchTranslation(lang: string, text: string): Promise<string | null> {
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t' +
      `&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    const parts = Array.isArray(data) && Array.isArray(data[0]) ? (data[0] as unknown[]) : [];
    const out = parts.map((p) => (Array.isArray(p) && typeof p[0] === 'string' ? p[0] : '')).join('');
    return out.trim() ? out : null;
  } catch {
    return null;
  }
}

function request(lang: string, text: string): Promise<void> {
  const k = key(lang, text);
  const running = pending.get(k);
  if (running) return running;
  const job = fetchTranslation(lang, text).then((out) => {
    pending.delete(k);
    if (out === null) return; // keep showing the original text; a later render may retry
    mem.set(k, out);
    writeStore(lang, text, out);
  });
  pending.set(k, job);
  return job;
}

/** The language currently chosen in the language menu ('hi' = original). Updates live when it changes. */
export function useSiteLang(): string {
  const [lang, setLang] = useState(SOURCE_LANG);
  useEffect(() => {
    const sync = () => setLang(getCurrentLang());
    sync();
    window.addEventListener(LANG_EVENT, sync);
    return () => window.removeEventListener(LANG_EVENT, sync);
  }, []);
  return lang;
}

/**
 * Returns `tr(text)`: the text in the chosen language (original Hindi/English while it loads or if it fails).
 * The component re-renders by itself when new translations arrive.
 */
export function useTr(): (text: string) => string {
  const lang = useSiteLang();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  return useCallback(
    (text: string) => {
      if (!text || lang === SOURCE_LANG) return text;
      const hit = peek(lang, text);
      if (hit !== undefined) return hit;
      // Not fetched during render itself: queue it and re-render when it lands.
      queueMicrotask(() => {
        if (peek(lang, text) !== undefined) return;
        void request(lang, text).then(() => alive.current && bump());
      });
      return text;
    },
    [lang],
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme, type ThemePref } from '@/hooks/use-theme';
import {
  LANGUAGES,
  SOURCE_LANG,
  ensureGoogleTranslate,
  getCurrentLang,
  setSiteLanguage,
} from '@/lib/googleTranslate';
import { useSiteLang, useTr } from '@/lib/uiTranslate';

type Variant = 'nav' | 'drawer';

// `phrase` is what gets translated (a full phrase translates better than the single word `label`).
const THEME_OPTIONS: { key: ThemePref; label: string; phrase: string; sub: string; icon: string }[] = [
  { key: 'light', label: 'लाइट', phrase: 'लाइट मोड', sub: 'Light', icon: 'fa-sun' },
  { key: 'dark', label: 'डार्क', phrase: 'डार्क मोड', sub: 'Dark', icon: 'fa-moon' },
  { key: 'system', label: 'सिस्टम', phrase: 'सिस्टम (डिवाइस जैसा)', sub: 'System', icon: 'fa-desktop' },
];

/** Closes a popover on outside click / Escape. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, ref]);
}

/* ------------------------------------------------------------------ Theme */

export function ThemeSwitcher({ variant = 'nav' }: { variant?: Variant }) {
  const { pref, resolved, setPref } = useTheme();
  const tr = useTr();
  const translated = useSiteLang() !== SOURCE_LANG; // English sub-labels only make sense next to the Hindi original
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef);

  if (variant === 'drawer') {
    return (
      <div className="m-pref-row notranslate" translate="no" role="group" aria-label={`${tr('थीम')} · Theme`}>
        <span className="m-pref-label">
          <i className={`fas ${resolved === 'dark' ? 'fa-moon' : 'fa-sun'}`} aria-hidden="true" />
          <span className="m-drawer-link-text">
            {tr('थीम')}
            {!translated && <small>Theme</small>}
          </span>
        </span>
        <div className="m-seg">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`m-seg-btn${pref === o.key ? ' active' : ''}`}
              aria-pressed={pref === o.key}
              onClick={() => setPref(o.key)}
              aria-label={tr(o.phrase)}
              title={tr(o.phrase)}
            >
              <i className={`fas ${o.icon}`} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="site-ctl notranslate" translate="no" ref={rootRef}>
      <button
        type="button"
        className="site-ctl-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${tr('थीम बदलें')} · Change theme`}
        title={tr('थीम')}
      >
        <i className={`fas ${resolved === 'dark' ? 'fa-moon' : 'fa-sun'}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="site-ctl-menu site-ctl-menu--theme" role="menu">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="menuitemradio"
              aria-checked={pref === o.key}
              className={`site-ctl-item${pref === o.key ? ' active' : ''}`}
              onClick={() => {
                setPref(o.key);
                setOpen(false);
              }}
            >
              <i className={`fas ${o.icon}`} aria-hidden="true" />
              <span>
                {tr(o.phrase)} {!translated && <small>{o.sub}</small>}
              </span>
              {pref === o.key && <i className="fas fa-check site-ctl-check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Language */

export function LanguageSwitcher({ variant = 'nav' }: { variant?: Variant }) {
  const [current, setCurrent] = useState(SOURCE_LANG);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef);

  // Pick up a language chosen earlier (Google's cookie) and re-apply it as soon as the browser is idle.
  useEffect(() => {
    const lang = getCurrentLang();
    setCurrent(lang);
    if (lang === SOURCE_LANG) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => void ensureGoogleTranslate());
    else window.setTimeout(() => void ensureGoogleTranslate(), 600);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0];

  const toggle = () => {
    setOpen((v) => !v);
    void ensureGoogleTranslate(); // warm the script up while the menu is open
  };

  const choose = async (code: string) => {
    setOpen(false);
    if (code === current) return;
    setBusy(true);
    setCurrent(code);
    try {
      await setSiteLanguage(code);
    } finally {
      setBusy(false);
    }
  };

  const list = (
    <ul className="site-lang-list notranslate" translate="no" role="listbox" aria-label="Language">
      {LANGUAGES.map((l) => (
        <li key={l.code} role="presentation">
          <button
            type="button"
            role="option"
            aria-selected={l.code === current}
            className={`site-ctl-item${l.code === current ? ' active' : ''}`}
            onClick={() => void choose(l.code)}
            lang={l.code}
          >
            <span className="site-lang-native">{l.native}</span>
            <small>{l.english}</small>
            {l.code === current && <i className="fas fa-check site-ctl-check" aria-hidden="true" />}
          </button>
        </li>
      ))}
    </ul>
  );

  if (variant === 'drawer') {
    return (
      <div className="m-lang notranslate" translate="no" ref={rootRef}>
        <button
          type="button"
          className="m-drawer-link"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`भाषा · Language: ${currentLang.english}`}
        >
          <i className="fas fa-language" aria-hidden="true" />
          <span className="m-drawer-link-text">
            <span translate="yes">भाषा</span>
            <small>{busy ? 'Translating…' : `Language · ${currentLang.native}`}</small>
          </span>
          <i className={`fas fa-chevron-${open ? 'up' : 'down'} m-lang-caret`} aria-hidden="true" />
        </button>
        {open && <div className="m-lang-panel">{list}</div>}
      </div>
    );
  }

  return (
    <div className="site-ctl notranslate" translate="no" ref={rootRef}>
      <button
        type="button"
        className={`site-ctl-btn site-ctl-btn--lang${busy ? ' is-busy' : ''}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`भाषा बदलें · Language: ${currentLang.english}`}
        title="Language"
      >
        <i className="fas fa-globe" aria-hidden="true" />
        <span className="site-ctl-code">{current === SOURCE_LANG ? 'HI' : current.split('-')[0].toUpperCase()}</span>
      </button>
      {open && <div className="site-ctl-menu site-ctl-menu--lang">{list}</div>}
    </div>
  );
}

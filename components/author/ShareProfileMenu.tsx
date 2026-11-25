'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/site/ToastProvider';
import { SOURCE_LANG } from '@/lib/googleTranslate';
import { useSiteLang, useTr } from '@/lib/uiTranslate';
import './share-profile.css';

interface Props {
  /** Writer's display name, used in the share text. */
  name: string;
}

/** Link that is shared: the page's own origin + path (no query string, no hash, no tracking leftovers). */
function profileUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * "Share profile" button. On phones with the Web Share API one tap opens the native share sheet;
 * everywhere else (and if the native sheet is unavailable) it opens a small menu:
 * copy link, WhatsApp, X / Twitter, Facebook.
 * UI text is Hindi with an English sub-label (same pattern as the theme/language menus) and goes through useTr().
 */
export function ShareProfileMenu({ name }: Props) {
  const { showToast } = useToast();
  const tr = useTr();
  const translated = useSiteLang() !== SOURCE_LANG;
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const shareText = `${name} की रचनाएँ मेहफ़िल पर पढ़ें`;

  const onMainClick = async () => {
    const link = profileUrl();
    setUrl(link);
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (coarse && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${name} | Mehfil Poetry`, text: shareText, url: link });
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return; // the member closed the sheet: nothing to do
        /* any other failure: show the menu instead */
      }
    }
    setOpen((v) => !v);
  };

  const onCopy = async () => {
    const ok = await copyText(url || profileUrl());
    showToast(ok ? tr('🔗 प्रोफ़ाइल लिंक कॉपी हो गया!') : tr('लिंक कॉपी नहीं हो सका। कृपया पता-पट्टी से कॉपी करें।'), !ok);
    close(true);
  };

  const enc = encodeURIComponent;
  const links = [
    { key: 'wa', icon: 'fa-whatsapp', brand: true, hi: 'व्हाट्सऐप', en: 'WhatsApp', href: `https://wa.me/?text=${enc(`${shareText} ${url}`)}` },
    { key: 'x', icon: 'fa-x-twitter', brand: true, hi: 'X (ट्विटर)', en: 'X / Twitter', href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(url)}` },
    { key: 'fb', icon: 'fa-facebook-f', brand: true, hi: 'फ़ेसबुक', en: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  ];

  return (
    <div className="spm-root" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="ap-btn"
        onClick={onMainClick}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <i className="fas fa-share-alt" aria-hidden="true" /> प्रोफ़ाइल साझा करें
      </button>
      {open && (
        <div className="spm-menu notranslate" translate="no" role="menu" aria-label={`${tr('प्रोफ़ाइल साझा करें')} · Share profile`}>
          <button type="button" role="menuitem" className="spm-item" onClick={onCopy} autoFocus>
            <i className="fas fa-link" aria-hidden="true" />
            <span>{tr('लिंक कॉपी करें')}{!translated && <small>Copy link</small>}</span>
          </button>
          {links.map((l) => (
            <a
              key={l.key}
              role="menuitem"
              className="spm-item"
              href={l.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={() => close()}
            >
              <i className={`${l.brand ? 'fab' : 'fas'} ${l.icon}`} aria-hidden="true" />
              <span>{tr(l.hi)}{!translated && <small>{l.en}</small>}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/site/ToastProvider';
import { SOURCE_LANG } from '@/lib/googleTranslate';
import { useSiteLang, useTr } from '@/lib/uiTranslate';
import type { ProfileCardData } from '@/lib/shareCard/ProfileImageGenerator';
import './share-profile.css';

// The card editor, canvas renderer and fonts are only needed once the member opens "Share as card".
const ShareProfileCardModal = dynamic(() => import('@/components/share/ShareProfileCardModal'), { ssr: false });

interface Props {
  /** Writer's display name, used in the share text. */
  name: string;
  /** Public profile path (e.g. /u/rahul). Defaults to the current page, so pass it on private pages like /profile. */
  path?: string;
  /** Data for the "share as card" image. Omit to hide that option. The profile URL is added here. */
  card?: Omit<ProfileCardData, 'url' | 'name'>;
  /** Class of the trigger button (defaults to the public profile's `ap-btn`). */
  className?: string;
}

const MENU_W = 248;
const MOBILE_MAX = 760;

/** Link that is shared: this site's origin + the public profile path (no query string, no hash). */
function profileUrl(path?: string): string {
  return `${window.location.origin}${path || window.location.pathname}`;
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
 * "Share profile" button. The menu is rendered in a portal on <body> (so no parent card can clip it):
 * a bottom sheet on phones, a popover under the button on larger screens.
 * Options: share as card image (premium profile card), copy link, WhatsApp, X / Twitter, Facebook.
 * On touch devices with the Web Share API the button first tries the native share sheet.
 * UI text is Hindi with an English sub-label and goes through useTr().
 */
export function ShareProfileMenu({ name, path, card, className = 'ap-btn' }: Props) {
  const { showToast } = useToast();
  const tr = useTr();
  const translated = useSiteLang() !== SOURCE_LANG;
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [cardOpen, setCardOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null); // null = bottom sheet
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) btnRef.current?.focus();
  }, []);

  // Place the popover under the button (flip above if there is no room); phones get a bottom sheet instead.
  const place = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    if (window.innerWidth <= MOBILE_MAX) return setPos(null);
    const r = btn.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8));
    const menuH = menuRef.current?.offsetHeight ?? 260;
    const below = r.bottom + 8;
    const top = below + menuH > window.innerHeight - 8 ? Math.max(8, r.top - 8 - menuH) : below;
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true);
    const onMove = () => (window.innerWidth <= MOBILE_MAX ? place() : close());
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, close, place]);

  const shareText = `${name} की रचनाएँ मेहफ़िल पर पढ़ें`;

  const onMainClick = async () => {
    const link = profileUrl(path);
    setUrl(link);
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (coarse && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${name} | Mehfil Poetry`, text: shareText, url: link });
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return; // the sheet was closed: nothing to do
        /* any other failure: show the menu instead */
      }
    }
    setOpen((v) => !v);
  };

  const onCopy = async () => {
    const ok = await copyText(url || profileUrl(path));
    showToast(ok ? tr('🔗 प्रोफ़ाइल लिंक कॉपी हो गया!') : tr('लिंक कॉपी नहीं हो सका। कृपया पता-पट्टी से कॉपी करें।'), !ok);
    close(true);
  };

  const enc = encodeURIComponent;
  const links = [
    { key: 'wa', icon: 'fa-whatsapp', hi: 'व्हाट्सऐप', en: 'WhatsApp', href: `https://wa.me/?text=${enc(`${shareText} ${url}`)}` },
    { key: 'x', icon: 'fa-x-twitter', hi: 'X (ट्विटर)', en: 'X / Twitter', href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(url)}` },
    { key: 'fb', icon: 'fa-facebook-f', hi: 'फ़ेसबुक', en: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  ];

  const sheet = pos === null;
  const menu = open
    ? createPortal(
        <>
          {sheet && <div className="spm-backdrop" onClick={() => close()} aria-hidden="true" />}
          <div
            ref={menuRef}
            className={`spm-menu notranslate${sheet ? ' spm-sheet' : ''}`}
            style={sheet ? undefined : { top: pos.top, left: pos.left, width: MENU_W }}
            translate="no"
            role="menu"
            aria-label={`${tr('प्रोफ़ाइल साझा करें')} · Share profile`}
          >
            {card && (
              <button
                type="button"
                role="menuitem"
                className="spm-item spm-item-main"
                onClick={() => {
                  setOpen(false);
                  setCardOpen(true);
                }}
                autoFocus
              >
                <i className="far fa-image" aria-hidden="true" />
                <span>{tr('कार्ड के रूप में साझा करें')}{!translated && <small>Share as card image</small>}</span>
              </button>
            )}
            <button type="button" role="menuitem" className="spm-item" onClick={onCopy} autoFocus={!card}>
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
                <i className={`fab ${l.icon}`} aria-hidden="true" />
                <span>{tr(l.hi)}{!translated && <small>{l.en}</small>}</span>
              </a>
            ))}
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={className}
        onClick={onMainClick}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <i className="fas fa-share-alt" aria-hidden="true" /> प्रोफ़ाइल साझा करें
      </button>
      {menu}
      {cardOpen && card && (
        <ShareProfileCardModal
          data={{ ...card, name, url: url || profileUrl(path) }}
          onClose={() => setCardOpen(false)}
        />
      )}
    </>
  );
}

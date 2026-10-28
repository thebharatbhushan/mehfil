'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getToken } from '@/lib/auth';
import {
  fetchActiveSpotlight,
  isExcludedPath,
  isSuppressed,
  markDismissed,
  markShown,
  type SpotlightCampaign,
} from '@/lib/spotlight';
import './spotlight.css';

/**
 * Admin-managed promotional popup ("Mehfil Spotlight").
 * - One request per page view until a popup has been shown; failures are silent (the site never breaks).
 * - Rendered client-side only after the page is interactive, so it adds nothing to the indexable HTML.
 * - All admin text is rendered as plain text (no dangerouslySetInnerHTML).
 */

const SHOW_DELAY_MS = 1500;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const safeColor = (c: string) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : undefined);

function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  const list = (phrases || []).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!list.length) return <>{text}</>;
  const re = new RegExp(`(${list.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return (
    <>
      {text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="sp-hl">{part}</mark> : <span key={i}>{part}</span>))}
    </>
  );
}

function SpLink({
  href, newTab, className, onClick, children,
}: { href: string; newTab: boolean; className: string; onClick: () => void; children: ReactNode }) {
  const internal = href.startsWith('/') && !href.startsWith('//');
  if (internal && !newTab) {
    return <Link href={href} className={className} onClick={onClick}>{children}</Link>;
  }
  return (
    <a href={href} className={className} onClick={onClick} target={newTab ? '_blank' : undefined} rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function SpotlightPopup() {
  const pathname = usePathname() || '/';
  const [campaign, setCampaign] = useState<SpotlightCampaign | null>(null);
  const shownRef = useRef(false); // a popup has already been shown during this page load
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const campaignRef = useRef<SpotlightCampaign | null>(null);

  // 1) Ask the server which popup (if any) applies to this page - at most once a popup has been shown.
  useEffect(() => {
    if (shownRef.current || isExcludedPath(pathname)) return;
    const ctl = new AbortController();
    const timer = window.setTimeout(async () => {
      const audience = getToken() ? 'member' : 'guest';
      const c = await fetchActiveSpotlight(pathname, audience, ctl.signal);
      if (!c || ctl.signal.aborted || shownRef.current) return;
      if (isSuppressed(c)) return;
      // Never stack on top of another modal (e.g. the birthday card, a share dialog).
      // Only OPEN modals count: the site keeps closed ones (e.g. the mobile menu) in the DOM with aria-hidden="true".
      const modalOpen = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"], [role="alertdialog"]')).some(
        (el) => !el.closest('[aria-hidden="true"]') && el.getClientRects().length > 0,
      );
      if (modalOpen) return;
      shownRef.current = true;
      markShown(c);
      lastFocus.current = document.activeElement as HTMLElement | null;
      campaignRef.current = c;
      setCampaign(c);
    }, SHOW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      ctl.abort();
    };
  }, [pathname]);

  const close = useCallback(() => {
    if (campaignRef.current) markDismissed(campaignRef.current);
    campaignRef.current = null;
    setCampaign(null);
  }, []);

  // 2) While open: lock scrolling, handle Esc, trap focus, restore focus afterwards.
  useEffect(() => {
    if (!campaign) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !cardRef.current.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !cardRef.current.contains(active))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      const back = lastFocus.current;
      if (back && document.contains(back)) back.focus();
    };
  }, [campaign, close]);

  if (!campaign || typeof document === 'undefined') return null;
  const c = campaign;

  const style: Record<string, string> = {};
  const accent = safeColor(c.accentColor);
  const cta = safeColor(c.ctaColor) || accent;
  const ctaText = safeColor(c.ctaTextColor);
  if (accent) style['--sp-accent'] = accent;
  if (cta) style['--sp-cta'] = cta;
  if (ctaText) style['--sp-cta-text'] = ctaText;

  const hasPrimary = !!(c.ctaLabel && c.ctaUrl);
  const hasSecondary = !!(c.secondaryLabel && c.secondaryUrl);
  const buttons = (hasPrimary || hasSecondary) && (
    <>
      {hasPrimary && <SpLink href={c.ctaUrl} newTab={c.ctaOpenInNewTab} className="sp-btn sp-btn--primary" onClick={close}>{c.ctaLabel}</SpLink>}
      {hasSecondary && <SpLink href={c.secondaryUrl} newTab={c.ctaOpenInNewTab} className="sp-btn sp-btn--secondary" onClick={close}>{c.secondaryLabel}</SpLink>}
    </>
  );

  const closeBtn = (
    <button ref={closeRef} type="button" className={`sp-close${c.closeStyle === 'light' ? ' sp-close--light' : ''}`} onClick={close} aria-label="बंद करें / Close">
      <span aria-hidden="true">&times;</span>
    </button>
  );

  let card: ReactNode;
  if (c.mode === 'image' && c.image) {
    const img = (
      // Plain <img>: the poster keeps its own aspect ratio (width/height attributes reserve the space, CSS caps the size).
      // eslint-disable-next-line @next/next/no-img-element
      <img className="sp-img" src={c.image.url} alt={c.imageAlt || c.title || 'Announcement'} width={c.image.width || undefined} height={c.image.height || undefined} decoding="async" />
    );
    const wholeImageLink = c.ctaUrl && !c.ctaLabel;
    card = (
      <div ref={cardRef} className={`sp-card sp-card--image${buttons ? ' sp-has-bar' : ''}`} role="dialog" aria-modal="true" aria-label={c.imageAlt || c.title || 'Announcement'}>
        {closeBtn}
        <div className="sp-scroll">
          {wholeImageLink ? (
            <SpLink href={c.ctaUrl} newTab={c.ctaOpenInNewTab} className="sp-imglink" onClick={close}>{img}</SpLink>
          ) : img}
          {buttons && <div className="sp-bar">{buttons}</div>}
        </div>
      </div>
    );
  } else {
    const cardStyle: CSSProperties = {
      backgroundColor: safeColor(c.backgroundColor),
      backgroundImage: c.backgroundImage ? `url("${encodeURI(c.backgroundImage.url)}")` : undefined,
    };
    card = (
      <div ref={cardRef} className="sp-card" style={cardStyle} role="dialog" aria-modal="true" aria-labelledby={c.title ? 'sp-title' : undefined} aria-label={c.title ? undefined : 'Announcement'}>
        {closeBtn}
        <div className="sp-scroll">
          {c.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="sp-media" src={c.image.url} alt={c.imageAlt || c.title || ''} width={c.image.width || undefined} height={c.image.height || undefined} decoding="async" />
          )}
          <div className="sp-body">
            {c.title && <h2 id="sp-title" className="sp-title" dir="auto" style={{ color: safeColor(c.headingColor) }}><Highlighted text={c.title} phrases={c.highlights} /></h2>}
            {c.subtitle && <p className="sp-text" dir="auto" style={{ color: safeColor(c.textColor) }}><Highlighted text={c.subtitle} phrases={c.highlights} /></p>}
            {buttons && <div className="sp-actions">{buttons}</div>}
          </div>
        </div>
      </div>
    );
  }

  return createPortal(
    <div
      className="sp-overlay"
      style={style as CSSProperties}
      data-spotlight={c.id}
      onClick={(e) => { if (e.target === e.currentTarget && c.closeOnBackdrop) close(); }}
    >
      {card}
    </div>,
    document.body,
  );
}

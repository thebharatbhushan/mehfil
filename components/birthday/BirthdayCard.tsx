'use client';

import type { CSSProperties } from 'react';
import { Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getStoredUser, getToken } from '@/lib/auth';
import { getTurningAge } from '@/lib/birthday';
import { useOwnBirthday } from '@/lib/useOwnBirthday';

/**
 * Private birthday greeting.
 *
 * PRIVACY: only ever uses the logged-in user's OWN data (see useOwnBirthday), so it can only appear
 * for the person whose birthday it is — never for someone else, never on a public profile of theirs
 * seen by a visitor.
 *
 * When it opens (on the user's birthday, IST):
 *   1. right after they log in (or sign up)
 *   2. every time they open their profile page (/profile) or their own public page (/u/<username>)
 */

const CONFETTI_COLORS = ['#d9a441', '#f0cf86', '#c16a4b', '#e8c8ba', '#b8862d', '#fff3d6'];

// Deterministic "random" layout so the card never reshuffles between renders.
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  delay: ((i * 53) % 40) / 10,
  duration: 5.5 + ((i * 29) % 30) / 10,
  size: 6 + ((i * 7) % 6),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round: i % 3 === 0,
  drift: ((i * 19) % 60) - 30,
}));

const STARS = [
  { top: '12%', left: '8%', size: 14, delay: 0 },
  { top: '20%', left: '88%', size: 18, delay: 0.8 },
  { top: '64%', left: '5%', size: 12, delay: 1.6 },
  { top: '72%', left: '92%', size: 14, delay: 0.4 },
  { top: '8%', left: '58%', size: 10, delay: 1.2 },
];

function isOwnProfilePath(pathname: string, username?: string): boolean {
  if (pathname === '/profile' || pathname === '/profile/') return true;
  if (!username) return false;
  try {
    return decodeURIComponent(pathname).toLowerCase().replace(/\/$/, '') === `/u/${username}`.toLowerCase();
  } catch {
    return false;
  }
}

export function BirthdayCard() {
  const pathname = usePathname() || '/';
  const bday = useOwnBirthday();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const prevToken = useRef<string | null>(null);
  const pendingLogin = useRef(false);
  const shownForPath = useRef<string | null>(null);
  const [tick, setTick] = useState(0);

  // Trigger 1 — a login/signup: the auth token goes from "none/other" to a new value.
  useEffect(() => {
    prevToken.current = getToken();
    const onAuth = () => {
      const token = getToken();
      if (token && token !== prevToken.current) pendingLogin.current = true;
      if (!token) {
        pendingLogin.current = false;
        setOpen(false);
      }
      prevToken.current = token;
      // The login event may arrive before React has re-read the user; nudge the effect below.
      setTick((t) => t + 1);
    };
    window.addEventListener('mehfil-auth-change', onAuth);
    return () => window.removeEventListener('mehfil-auth-change', onAuth);
  }, []);

  // Decide whether to open. Waits for the DOB to be known (it may need a fetch right after login).
  useEffect(() => {
    if (!bday.loggedIn) {
      shownForPath.current = null;
      return;
    }
    if (!bday.resolved) return;
    if (!bday.isBirthday) {
      pendingLogin.current = false;
      return;
    }
    const username = getStoredUser()?.username;
    const onProfile = isOwnProfilePath(pathname, typeof username === 'string' ? username : undefined);
    if (!onProfile) shownForPath.current = null;

    if (pendingLogin.current) {
      pendingLogin.current = false;
      if (onProfile) shownForPath.current = pathname; // already celebrated; don't re-open for this visit
      setOpen(true);
    } else if (onProfile && shownForPath.current !== pathname) {
      shownForPath.current = pathname;
      setOpen(true);
    }
  }, [bday.loggedIn, bday.resolved, bday.isBirthday, pathname, tick]);

  // The card must disappear if the user logs out or the day rolls over.
  useEffect(() => {
    if (!bday.isBirthday) setOpen(false);
  }, [bday.isBirthday]);

  const age = useMemo(() => (bday.isBirthday ? getTurningAge(bday.dob, new Date()) : null), [bday.isBirthday, bday.dob]);

  const close = useCallback(() => {
    setOpen(false);
    lastFocus.current?.focus?.();
  }, []);

  // Modal behaviour: focus, Escape, scroll lock.
  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  if (!open || !bday.isBirthday) return null;

  const firstName = bday.firstName || 'दोस्त';
  return <BirthdayGreeting firstName={firstName} age={age} onClose={close} closeRef={closeRef} />;
}

/** Purely presentational greeting card (no data access) — reusable and easy to preview/test. */
export function BirthdayGreeting({
  firstName,
  age,
  onClose,
  closeRef,
}: {
  firstName: string;
  age: number | null;
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
}) {
  const close = onClose;
  return (
    <div className="bday-mask" onClick={close} role="presentation">
      <div
        className="bday-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bday-title"
        aria-describedby="bday-desc"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative layers (hidden from assistive tech) */}
        <div className="bday-glow" aria-hidden="true" />
        <div className="bday-confetti" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.round ? c.size : c.size * 1.7,
                background: c.color,
                borderRadius: c.round ? '50%' : 2,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                '--drift': `${c.drift}px`,
              } as CSSProperties}
            />
          ))}
        </div>
        {STARS.map((s, i) => (
          <span key={i} className="bday-star" aria-hidden="true" style={{ top: s.top, left: s.left, fontSize: s.size, animationDelay: `${s.delay}s` }}>
            ✦
          </span>
        ))}

        <button ref={closeRef} type="button" className="bday-close" onClick={close} aria-label="बंद करें">
          <i className="fas fa-times" aria-hidden="true" />
        </button>

        <div className="bday-body">
          <div className="bday-brand" aria-hidden="true">
            <span>❦</span> मेहफ़िल <span>❦</span>
          </div>

          <svg className="bday-cake" viewBox="0 0 120 110" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="bdayCakeTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff3d6" />
                <stop offset="1" stopColor="#f0cf86" />
              </linearGradient>
              <linearGradient id="bdayCakeBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#d98b6a" />
                <stop offset="1" stopColor="#b9593b" />
              </linearGradient>
            </defs>
            <ellipse cx="60" cy="102" rx="46" ry="5" fill="rgba(120,60,35,.18)" />
            <rect x="18" y="62" width="84" height="36" rx="8" fill="url(#bdayCakeBase)" />
            <rect x="26" y="40" width="68" height="28" rx="7" fill="url(#bdayCakeTop)" />
            <path d="M18 66c8 8 14-2 22 5s14-3 22 4 14-4 22 3 12-2 18 0" fill="none" stroke="#fff3d6" strokeWidth="5" strokeLinecap="round" />
            <rect x="57" y="22" width="6" height="20" rx="3" fill="#c16a4b" />
            <path className="bday-flame" d="M60 8c5 6 6 10 0 14-6-4-5-8 0-14z" fill="#f6b73c" />
            <circle cx="36" cy="54" r="3" fill="#c16a4b" />
            <circle cx="60" cy="56" r="3" fill="#c16a4b" />
            <circle cx="84" cy="54" r="3" fill="#c16a4b" />
          </svg>

          <p className="bday-kicker">जन्मदिन की हार्दिक शुभकामनाएँ! 🎂</p>
          <h2 id="bday-title" className="bday-title">
            जन्मदिन मुबारक हो, <span className="bday-name">{firstName}</span>! 🎉
          </h2>
          <p id="bday-desc" className="bday-lead">मेहफ़िल की ओर से आपके इस ख़ास दिन पर ढेरों शुभकामनाएँ।</p>

          {age !== null && <p className="bday-age">आज आप {age} बरस के हुए ✨</p>}

          <div className="bday-orn" aria-hidden="true"><span /><i className="fas fa-feather-alt" /><span /></div>

          <blockquote className="bday-sher">
            <span>आपकी ज़िंदगी का हर नया सफ़ा</span>
            <span>ख़ुशियों, मोहब्बत और खूबसूरत अल्फ़ाज़ से भरा हो।</span>
          </blockquote>

          <div className="bday-actions">
            <button type="button" className="primary-btn bday-btn" onClick={close}>शुक्रिया ✨</button>
            <Link href="/publish" className="secondary-btn bday-btn" onClick={close}>
              <i className="fas fa-feather" aria-hidden="true" /> आज कुछ लिखें
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BirthdayCard;

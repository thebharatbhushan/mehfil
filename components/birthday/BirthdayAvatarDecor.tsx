'use client';

import { useOwnBirthday } from '@/lib/useOwnBirthday';

/**
 * Party hat + twinkling sparkles on top of the profile picture — shown only to the logged-in user,
 * only on their own birthday (IST). Place it INSIDE the avatar's relatively-positioned ring, and only
 * where the avatar is the viewer's own (own profile page, or the author page when isOwner).
 * Decorative: pointer-events are off, so the avatar stays clickable.
 */
export function BirthdayAvatarDecor() {
  const { isBirthday } = useOwnBirthday();
  return isBirthday ? <BirthdayAvatarDecorView /> : null;
}

/** Presentational part (no data access). */
export function BirthdayAvatarDecorView() {
  return (
    <span className="bday-decor" role="img" aria-label="जन्मदिन मुबारक">
      <svg className="bday-hat" viewBox="0 0 64 70" focusable="false" aria-hidden="true">
        <defs>
          <linearGradient id="bdayHatGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f0cf86" />
            <stop offset="0.5" stopColor="#d9a441" />
            <stop offset="1" stopColor="#c16a4b" />
          </linearGradient>
        </defs>
        <path d="M32 4 L56 58 Q32 68 8 58 Z" fill="url(#bdayHatGrad)" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M20 34 Q32 40 44 34" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
        <path d="M14 48 Q32 56 50 48" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
        <circle cx="32" cy="6" r="5" fill="#fff3d6" stroke="#d9a441" strokeWidth="2" />
      </svg>
      <span className="bday-spark bday-spark-1">✦</span>
      <span className="bday-spark bday-spark-2">✦</span>
      <span className="bday-spark bday-spark-3">✧</span>
      <span className="bday-spark bday-spark-4">✦</span>
    </span>
  );
}

export default BirthdayAvatarDecor;

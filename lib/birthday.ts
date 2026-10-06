/**
 * Birthday helpers — pure functions, no storage, no network.
 *
 * Rules
 *  - A birthday is MONTH + DAY only. The birth year never affects whether today is the day.
 *  - "Today" is always the calendar date in Asia/Kolkata (IST), never the UTC date and never the
 *    browser's local zone, so nobody gets (or misses) their card because of UTC conversion.
 *  - The DOB string is read literally (YYYY-MM-DD, same as the profile form does with slice(0, 10)),
 *    so it is never shifted by a Date/timezone conversion.
 *  - 29 Feb birthdays are celebrated on 28 Feb in non-leap years.
 */

export const BIRTHDAY_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST has no daylight saving

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** Today's calendar date in IST. */
export function getTodayIST(now: Date = new Date()): CalendarDate {
  // Intl is used when available; the fixed-offset fallback gives the identical answer (IST has no DST).
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: BIRTHDAY_TIME_ZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(now);
    const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    if (year && month && day) return { year, month, day };
  } catch {
    /* fall through to the fixed offset */
  }
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Reads the calendar date out of a DOB string such as "1999-05-05" or "1999-05-05T00:00:00.000Z". */
export function parseDob(dob: unknown): CalendarDate | null {
  if (typeof dob !== 'string') return null;
  const match = dob.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day > daysInMonth) return null;
  return { year, month, day };
}

/** True when `now` (in IST) falls on the month/day of `dob`. */
export function isBirthdayToday(dob: unknown, now: Date = new Date()): boolean {
  const birth = parseDob(dob);
  if (!birth) return false;
  const today = getTodayIST(now);
  if (birth.month === 2 && birth.day === 29 && !isLeapYear(today.year)) {
    return today.month === 2 && today.day === 28;
  }
  return birth.month === today.month && birth.day === today.day;
}

/** The age being reached today, or null when it would look wrong (future DOB, > 120, < 1). */
export function getTurningAge(dob: unknown, now: Date = new Date()): number | null {
  const birth = parseDob(dob);
  if (!birth) return null;
  const age = getTodayIST(now).year - birth.year;
  return age >= 1 && age <= 120 ? age : null;
}

/** Milliseconds until the next midnight in IST (used to flip the card on/off exactly at midnight). */
export function msUntilNextISTMidnight(now: Date = new Date()): number {
  const shifted = now.getTime() + IST_OFFSET_MS;
  const dayMs = 24 * 60 * 60 * 1000;
  return dayMs - (((shifted % dayMs) + dayMs) % dayMs);
}

/** "YYYY-MM-DD" of today in IST — the key used to show the card only once per day per device. */
export function istDateKey(now: Date = new Date()): string {
  const t = getTodayIST(now);
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
}

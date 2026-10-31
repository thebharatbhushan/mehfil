'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchOwnProfile, getStoredUser, getToken, StoredUser } from '@/lib/auth';
import { isBirthdayToday, msUntilNextISTMidnight } from '@/lib/birthday';

/**
 * Birthday state of the LOGGED-IN user only.
 *
 * PRIVACY: reads the user's own stored login profile and, if that has no DOB (some login responses
 * omit it), their own /api/auth/profile. It never touches anyone else's data, so every consumer
 * (greeting card, avatar decoration) is automatically private to the birthday person.
 */
export interface OwnBirthday {
  loggedIn: boolean;
  userKey: string;
  firstName: string;
  dob: string | null;
  /** true once the DOB is known (stored or fetched) — or known to be unavailable */
  resolved: boolean;
  isBirthday: boolean;
}

const keyOf = (u: StoredUser | null) => String(u?._id || u?.id || u?.username || '');

export function useOwnBirthday(): OwnBirthday {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [fetched, setFetched] = useState<{ key: string; dob: string | null } | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const asked = useRef('');

  // Who is logged in (re-read on login / logout / profile edits).
  useEffect(() => {
    const read = () => setUser(getToken() ? getStoredUser() : null);
    read();
    window.addEventListener('mehfil-auth-change', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('mehfil-auth-change', read);
      window.removeEventListener('storage', read);
    };
  }, []);

  // Stored user has no DOB → ask the API for the user's own profile (once per user).
  const key = keyOf(user);
  const storedDob = typeof user?.dob === 'string' && user.dob ? user.dob : null;
  useEffect(() => {
    if (!user || !key || storedDob || asked.current === key || (fetched && fetched.key === key)) return;
    asked.current = key;
    const controller = new AbortController();
    fetchOwnProfile(controller.signal).then((own) => {
      if (controller.signal.aborted) return;
      setFetched({ key, dob: own && typeof own.dob === 'string' ? own.dob : null });
    });
    return () => {
      controller.abort();
      asked.current = ''; // allow a retry if the effect was torn down mid-request
    };
  }, [user, key, storedDob, fetched]);

  // Re-evaluate "today" at IST midnight and when the tab returns to the foreground.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, msUntilNextISTMidnight() + 1000);
    };
    const refresh = () => document.visibilityState === 'visible' && setNow(new Date());
    schedule();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const dob = storedDob || (fetched && fetched.key === key ? fetched.dob : null);
  const resolved = !!storedDob || (fetched !== null && fetched.key === key);
  return {
    loggedIn: !!user && !!key,
    userKey: key,
    firstName: (typeof user?.firstName === 'string' && user.firstName.trim()) || '',
    dob,
    resolved,
    isBirthday: !!user && !!key && isBirthdayToday(dob, now),
  };
}

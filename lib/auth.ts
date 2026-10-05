/**
 * Client-side auth/identity helpers.
 *
 * Login stores the token in localStorage and the user object in localStorage ("remember me") or
 * sessionStorage. Several parts of the app (header, bottom nav, author page, profile page) need to
 * answer "who is the logged-in user?", so the logic lives here once instead of being re-implemented.
 */
import { API_BASE_URL } from '@/lib/mehfil';

export interface StoredUser {
  _id?: string;
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePic?: string;
  bio?: string;
  email?: string;
  [key: string]: unknown;
}

const USER_KEY = 'mehfil_user';
const TOKEN_KEY = 'token';

function safeGet(store: Storage | undefined, key: string): string | null {
  try {
    return store ? store.getItem(key) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return safeGet(window.localStorage, TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const raw = safeGet(window.localStorage, USER_KEY) || safeGet(window.sessionStorage, USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoredUser) : null;
  } catch {
    return null;
  }
}

/** Updates the stored user in whichever storage currently holds it (keeps "remember me" behaviour). */
export function updateStoredUser(patch: Partial<StoredUser>): void {
  if (typeof window === 'undefined') return;
  const target = safeGet(window.localStorage, USER_KEY) ? window.localStorage : window.sessionStorage;
  const raw = safeGet(target, USER_KEY);
  if (!raw) return;
  try {
    target.setItem(USER_KEY, JSON.stringify({ ...JSON.parse(raw), ...patch }));
    window.dispatchEvent(new Event('mehfil-auth-change'));
  } catch {
    /* storage unavailable — ignore */
  }
}

function idFrom(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && '$oid' in value) return idFrom((value as { $oid: unknown }).$oid);
  return null;
}

/** Reads the (unverified) payload of a JWT. Only used to discover the user id, never to trust it. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Synchronous best-effort id of the logged-in user: stored user first, then the JWT payload
 * (covers a surviving token whose sessionStorage user object is gone after a browser restart).
 */
export function getCurrentUserId(): string | null {
  const user = getStoredUser();
  const fromUser = idFrom(user?._id) || idFrom(user?.id);
  if (fromUser) return fromUser;

  const token = getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return (
    idFrom(payload.id) || idFrom(payload._id) || idFrom(payload.userId) || idFrom(payload.uid) || idFrom(payload.sub)
  );
}

/** Fetches the logged-in user's own profile from the API using the token. */
export async function fetchOwnProfile(signal?: AbortSignal): Promise<StoredUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = (data && (data.user || data.profile)) as StoredUser | undefined;
    return user && typeof user === 'object' ? user : null;
  } catch {
    return null;
  }
}

/** Async version of getCurrentUserId that can fall back to asking the API who the token belongs to. */
export async function resolveCurrentUserId(signal?: AbortSignal): Promise<string | null> {
  const sync = getCurrentUserId();
  if (sync) return sync;
  const own = await fetchOwnProfile(signal);
  return idFrom(own?._id) || idFrom(own?.id);
}

/** URL of the logged-in user's public profile: /u/<username> when known, else the id URL. */
export function myProfileHref(id: string | null | undefined = getCurrentUserId()): string {
  const username = getStoredUser()?.username;
  if (typeof username === 'string' && username) return `/u/${encodeURIComponent(username)}`;
  return id ? `/author?id=${encodeURIComponent(id)}` : '/author';
}

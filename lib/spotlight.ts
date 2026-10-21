import { API_BASE_URL } from '@/lib/mehfil';

/**
 * Mehfil Spotlight - promotional popups managed from the admin panel.
 * The server decides WHICH campaign is eligible (status, schedule, page, audience, priority);
 * this module decides whether THIS browser has already seen it (dismissal / frequency rules).
 */

export interface SpotlightImage {
  url: string;
  width?: number;
  height?: number;
}

export interface SpotlightCampaign {
  id: string;
  revision: number;
  mode: 'image' | 'custom';
  title: string;
  subtitle: string;
  highlights: string[];
  image: SpotlightImage | null;
  backgroundImage: { url: string } | null;
  imageAlt: string;
  backgroundColor: string;
  headingColor: string;
  textColor: string;
  accentColor: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaOpenInNewTab: boolean;
  ctaColor: string;
  ctaTextColor: string;
  secondaryLabel: string;
  secondaryUrl: string;
  closeStyle: 'dark' | 'light';
  closeOnBackdrop: boolean;
  frequency: 'session' | 'day' | 'campaign';
  persistDays: number;
  stayDismissed: boolean;
}

/** Pages where a promo would interrupt a form the visitor is filling in. */
const NEVER_SHOW_ON = ['/login', '/signup'];

export function isExcludedPath(pathname: string): boolean {
  const p = (pathname || '/').replace(/\/+$/, '') || '/';
  return NEVER_SHOW_ON.some((x) => p === x || p.startsWith(`${x}/`));
}

// ---- data -------------------------------------------------------------------------------------

const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; value: SpotlightCampaign | null }>();

/** Never throws: any network/server problem simply means "no popup". */
export async function fetchActiveSpotlight(
  path: string,
  audience: 'guest' | 'member',
  signal?: AbortSignal,
): Promise<SpotlightCampaign | null> {
  const key = `${audience}|${path}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  try {
    const qs = new URLSearchParams({ path, audience });
    const res = await fetch(`${API_BASE_URL}/api/spotlight/active?${qs.toString()}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const value = data && data.success && data.campaign && typeof data.campaign.id === 'string' ? (data.campaign as SpotlightCampaign) : null;
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

// ---- "have they seen it?" ---------------------------------------------------------------------

const LOCAL_KEY = 'mehfil.spotlight.v1';
const SESSION_KEY = 'mehfil.spotlight.session.v1';
const DAY_MS = 86_400_000;

interface Record_ {
  shown?: number;
  dismissed?: number;
}

export interface SpotlightStores {
  local: Pick<Storage, 'getItem' | 'setItem'> | null;
  session: Pick<Storage, 'getItem' | 'setItem'> | null;
}

// Fallback when storage is blocked (private mode): at least never repeat within this page load.
const memory: { local: Record<string, Record_>; session: Record<string, number> } = { local: {}, session: {} };

export function browserStores(): SpotlightStores {
  let local: Storage | null = null;
  let session: Storage | null = null;
  try { local = window.localStorage; } catch { /* blocked */ }
  try { session = window.sessionStorage; } catch { /* blocked */ }
  return { local, session };
}

const keyOf = (c: Pick<SpotlightCampaign, 'id' | 'revision'>) => `${c.id}:${c.revision || 1}`;

function readLocal(stores: SpotlightStores): Record<string, Record_> {
  try {
    const raw = stores.local?.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...(parsed && typeof parsed === 'object' ? parsed : {}), ...memory.local };
  } catch {
    return { ...memory.local };
  }
}

function writeLocal(stores: SpotlightStores, key: string, patch: Record_, now: number) {
  const all = readLocal(stores);
  all[key] = { ...all[key], ...patch };
  memory.local[key] = all[key];
  // Forget records older than 400 days so the list can never grow without bound.
  for (const k of Object.keys(all)) {
    const r = all[k];
    if (now - Math.max(r.shown || 0, r.dismissed || 0) > 400 * DAY_MS) delete all[k];
  }
  try { stores.local?.setItem(LOCAL_KEY, JSON.stringify(all)); } catch { /* quota / blocked: memory fallback is enough */ }
}

function readSession(stores: SpotlightStores): Record<string, number> {
  try {
    const raw = stores.session?.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...(parsed && typeof parsed === 'object' ? parsed : {}), ...memory.session };
  } catch {
    return { ...memory.session };
  }
}

/** True when this browser must NOT see the campaign again right now. */
export function isSuppressed(c: SpotlightCampaign, now = Date.now(), stores: SpotlightStores = browserStores()): boolean {
  const key = keyOf(c);
  const rec = readLocal(stores)[key];
  if (c.stayDismissed && rec?.dismissed) return true; // "until the next campaign"
  if (c.frequency === 'day') return !!rec?.shown && now - rec.shown < DAY_MS;
  if (c.frequency === 'campaign') return !!rec?.shown && now - rec.shown < Math.max(1, c.persistDays || 30) * DAY_MS;
  return key in readSession(stores); // 'session' (default)
}

/** Call when the popup opens: stops it re-opening on every page during the configured period. */
export function markShown(c: SpotlightCampaign, now = Date.now(), stores: SpotlightStores = browserStores()) {
  const key = keyOf(c);
  memory.session[key] = now;
  try {
    const s = readSession(stores);
    s[key] = now;
    stores.session?.setItem(SESSION_KEY, JSON.stringify(s));
  } catch { /* memory fallback */ }
  writeLocal(stores, key, { shown: now }, now);
}

/** Call when the visitor closes it or clicks a button. */
export function markDismissed(c: SpotlightCampaign, now = Date.now(), stores: SpotlightStores = browserStores()) {
  writeLocal(stores, keyOf(c), { dismissed: now }, now);
}

/** Test helper. */
export function _resetSpotlightMemory() {
  memory.local = {};
  memory.session = {};
  cache.clear();
}

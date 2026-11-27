/**
 * Referral + rewards client helpers.
 * The browser only ever holds the referral CODE (kept for 30 days, across pages, until signup) and an anonymous visitor id.
 * Attribution, success and XP are decided by the backend; nothing here can change them.
 */
import { API_BASE_URL } from '@/lib/mehfil';
import { SITE_URL } from '@/lib/seo';
import { getToken } from '@/lib/auth';

const CODE_KEY = 'mehfil_ref';
const VISITOR_KEY = 'mehfil_ref_visitor';
const TRACKED_KEY = 'mehfil_ref_tracked';
const COOKIE = 'mehfil_ref';
const TTL_DAYS = 30;
const CODE_RE = /^[A-Z0-9]{4,16}$/;

export const normalizeRefCode = (raw: unknown): string | null => {
  const code = String(raw ?? '').trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
};

function readCookie(): string | null {
  try {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`));
    return hit ? decodeURIComponent(hit.split('=')[1]) : null;
  } catch {
    return null;
  }
}

/** Saves a referral code (localStorage + cookie, 30 days) so it survives page changes before signup. */
export function storeReferralCode(raw: unknown): string | null {
  const code = normalizeRefCode(raw);
  if (!code || typeof window === 'undefined') return null;
  try {
    window.localStorage.setItem(CODE_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch { /* storage unavailable */ }
  try {
    document.cookie = `${COOKIE}=${code}; path=/; max-age=${TTL_DAYS * 86400}; SameSite=Lax`;
  } catch { /* cookies unavailable */ }
  return code;
}

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CODE_KEY);
    if (raw) {
      const { code, at } = JSON.parse(raw);
      if (Date.now() - Number(at) < TTL_DAYS * 86400000) return normalizeRefCode(code);
    }
  } catch { /* fall through to cookie */ }
  return normalizeRefCode(readCookie());
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(CODE_KEY); } catch { /* ignore */ }
  try { document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`; } catch { /* ignore */ }
}

function visitorId(): string {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,80}$/.test(id)) {
      id = (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `anon${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Counts this browser once per code for the inviter's "invited" number (best-effort, silent on failure). */
export function trackReferralVisit(code: string): void {
  try {
    if (window.sessionStorage.getItem(TRACKED_KEY) === code) return;
    window.sessionStorage.setItem(TRACKED_KEY, code);
  } catch { /* ignore */ }
  fetch(`${API_BASE_URL}/api/rewards/referral/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, visitorId: visitorId() }),
    keepalive: true,
  }).catch(() => {});
}

export const referralUrl = (code: string) => `${SITE_URL}/join?ref=${encodeURIComponent(code)}`;

/* ---------------------------------- API ---------------------------------- */

export interface ApiResult<T> { ok: boolean; status: number; data?: T; message?: string }

export async function rewardsApi<T>(path: string, init: RequestInit = {}, auth = true): Promise<ApiResult<T>> {
  try {
    const token = auth ? getToken() : null;
    const res = await fetch(`${API_BASE_URL}/api/rewards${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.success === false) return { ok: false, status: res.status, message: body?.message || 'कुछ गड़बड़ हुई। कृपया दोबारा कोशिश कीजिए।' };
    return { ok: true, status: res.status, data: body as T };
  } catch {
    return { ok: false, status: 0, message: 'सर्वर से संपर्क नहीं हो सका। इंटरनेट जाँचकर दोबारा कोशिश कीजिए।' };
  }
}

export interface BadgeLite { key: string; name: string; icon?: string; description?: string; unlockedAt?: string }
export interface ReferralSummary {
  code: string;
  path: string;
  stats: { totalInvited: number; registered: number; pending: number; successful: number; activeReferredWriters: number; xpEarned: number; conversionRate: number };
  next: { count: number; xp: number; title: string; badge: BadgeLite | null; remaining: number } | null;
  progress: { current: number; target: number; fraction: number; completed: boolean };
  milestones: { count: number; xp: number; title: string; reached: boolean; badge: BadgeLite | null; badgeUnlocked: boolean }[];
  badges: BadgeLite[];
  showOnLeaderboard: boolean;
}
export interface ReferralHistoryItem { id: string; name: string; profilePic: string; status: 'pending' | 'successful'; conditions: { emailVerified: boolean; profileCompleted: boolean; poemPublished: boolean }; registeredAt: string; completedAt: string | null }
export interface FrameRequirement { type: string; threshold: number | null; badgeKey: string | null; met: boolean; current?: number }
export interface FrameItem { key: string; name: string; nameHi: string; description: string; unlocked: boolean; selected: boolean; source: string | null; requirements: FrameRequirement[] }
export interface RewardBadge { key: string; name: string; description: string; icon: string; group: 'referral' | 'general'; unlocked: boolean; unlockedAt: string | null; condition: { type: string; threshold: number | null }; progress: { current: number; required: number } | null }
export interface BoardRow { rank: number; writer: { _id: string; firstName: string; lastName: string; username: string; profilePic: string; profileFrame: string }; successfulReferrals: number; xpFromReferrals: number; badge: { key: string; name: string; icon: string } | null }

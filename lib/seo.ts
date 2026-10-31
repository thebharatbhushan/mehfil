import { API_BASE_URL } from '@/lib/mehfil';
import { normalizeFrameKey, sanitizeBadges } from '@/lib/recognition';
import type { Poem, Writer } from '@/lib/mehfil';

/**
 * Public site origin used for canonical URLs, Open Graph and the sitemap.
 * Defaults to the origin that was already hard-coded in robots.ts / sitemap.ts.
 * Optionally override with NEXT_PUBLIC_SITE_URL (new, additive variable).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mehfilbb.vercel.app').replace(/\/+$/, '');
export const SITE_NAME = 'Mehfil';

/** Static branded share image (public/og-image.png, 1200x630). Used wherever a page has no genuine image of its own. */
export const DEFAULT_OG_IMAGE = { url: '/og-image.png', width: 1200, height: 630, alt: 'मेहफ़िल — हिंदी कविता, शायरी और साहित्य' };

/** Collapse whitespace and cut to `max` characters on a word boundary. */
export function truncate(text: string | undefined | null, max = 155): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-–—\s]+$/, '')}…`;
}

/** Single-line, trimmed text: user-supplied values are normalised before they reach <title>/meta/JSON-LD. */
export function oneLine(text: string | undefined | null): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export function fullNameOf(a?: { firstName?: string; lastName?: string; username?: string } | null): string {
  const n = oneLine(`${a?.firstName || ''} ${a?.lastName || ''}`);
  return n || oneLine(a?.username);
}

export function absoluteUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Only genuine http(s) images are usable; returns undefined otherwise (no placeholder is ever invented). */
export function pickImage(...candidates: Array<string | undefined | null>): string | undefined {
  for (const c of candidates) if (c && /^https?:\/\//i.test(c)) return c;
  return undefined;
}

type ApiResult<T> = { status: number; data: T | null };

async function getApi<T>(path: string): Promise<ApiResult<T>> {
  // A sleeping free-tier backend can need 30s+ to wake: retry once with a longer timeout on network errors / 5xx
  // so a cold start does not get cached as "no poems" for the revalidate window.
  let last: ApiResult<T> = { status: 0, data: null };
  for (const timeout of [10000, 30000]) {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(timeout) });
      if (res.ok) return { status: res.status, data: (await res.json()) as T };
      last = { status: res.status, data: null };
      if (res.status < 500) return last;
    } catch {
      // Network error / timeout: status 0 = "unknown", never treated as "missing".
      last = { status: 0, data: null };
    }
  }
  return last;
}

/** Same endpoint the poem page already uses. `missing` is true only when the API answers 404. */
export async function fetchPoemBySlug(slug: string): Promise<{ poem: Poem | null; missing: boolean }> {
  const { status, data } = await getApi<{ poem?: Poem } & Partial<Poem>>(`/api/poems/slug/${encodeURIComponent(slug)}`);
  const p = data?.poem || (data && data._id ? (data as Poem) : null);
  return { poem: p && p.title ? p : null, missing: status === 404 };
}

/** Same endpoint the author page already uses (accepts id or username). */
export async function fetchAuthor(ident: string): Promise<{ author: { user: Writer; poems: Poem[]; hasMore: boolean } | null; missing: boolean }> {
  const { status, data } = await getApi<{ user?: Writer; poems?: Poem[]; hasMore?: boolean }>(`/api/auth/user/${encodeURIComponent(ident)}?page=1&limit=12`);
  if (!data?.user) return { author: null, missing: status === 404 };
  return {
    author: { user: data.user, poems: data.poems || (data.user as Writer & { poems?: Poem[] }).poems || [], hasMore: !!data.hasMore },
    missing: false,
  };
}

export type PoemsPage = { poems: Poem[]; page: number; limit: number; total: number; totalPages: number };

/** One page of poems from the paginated API (null = API unreachable). */
export async function fetchPoemsPage(page = 1, limit = 16, slim = false, q = ''): Promise<PoemsPage | null> {
  const { data } = await getApi<{ poems?: Poem[]; page?: number; limit?: number; total?: number; totalPages?: number } | Poem[]>(
    `/api/poems?page=${page}&limit=${limit}${slim ? '&slim=1' : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
  );
  if (!data) return null;
  const list = (Array.isArray(data) ? data : data.poems) || [];
  const poems = list.filter((p) => p && p.slug && p.title);
  const meta = Array.isArray(data) ? {} : data;
  const total = meta.total ?? poems.length;
  return { poems, page: meta.page ?? page, limit: meta.limit ?? limit, total, totalPages: meta.totalPages ?? Math.max(1, Math.ceil(total / limit)) };
}

/**
 * Every poem (sitemap, category counts, poets...), gathered in several small requests of 100 instead of one huge one.
 * null = the API could not be reached (unknown), as opposed to [] = reachable but no poems.
 */
export async function fetchAllPoemsOrNull(): Promise<Poem[] | null> {
  // slim=1: excerpt-only rows (no full poem bodies) so these site-wide lists stay small as the library grows.
  const first = await fetchPoemsPage(1, 100, true);
  if (!first) return null;
  const all = [...first.poems];
  const pages = Array.from({ length: Math.min(first.totalPages, 100) - 1 }, (_, i) => i + 2);
  for (let i = 0; i < pages.length; i += 5) {
    const batch = await Promise.all(pages.slice(i, i + 5).map((n) => fetchPoemsPage(n, 100, true)));
    batch.forEach((b) => b && all.push(...b.poems));
  }
  return all;
}

export async function fetchAllPoems(): Promise<Poem[]> {
  return (await fetchAllPoemsOrNull()) || [];
}

export async function fetchFeaturedPoems(): Promise<Poem[]> {
  const { data } = await getApi<{ poems?: Poem[] } | Poem[]>('/api/poems/featured');
  return ((Array.isArray(data) ? data : data?.poems) || []).filter((p) => p && p.slug && p.title);
}

export type WritersPage = { writers: Array<Writer & { poemCount?: number; style?: string }>; page: number; limit: number; total: number; totalPages: number };

/** One page of the public writers directory (null = API unreachable). Never loads the whole user list. */
export async function fetchWritersPage(page = 1, limit = 12): Promise<WritersPage | null> {
  const { data } = await getApi<{ writers?: WritersPage['writers']; page?: number; limit?: number; total?: number; totalPages?: number }>(
    `/api/auth/writers?page=${page}&limit=${limit}`,
  );
  if (!data) return null;
  const writers = data.writers || [];
  const total = data.total ?? writers.length;
  return { writers, page: data.page ?? page, limit: data.limit ?? limit, total, totalPages: data.totalPages ?? Math.max(1, Math.ceil(total / limit)) };
}

/** Every public writer (for the sitemap). Reads the paginated PUBLIC directory - never an admin endpoint. */
export async function fetchAllWriters(): Promise<Writer[]> {
  const first = await fetchWritersPage(1, 50);
  if (!first) return [];
  const all: Writer[] = [...first.writers];
  const lastPage = Math.min(first.totalPages, 200);
  for (let page = 2; page <= lastPage; page++) {
    const next = await fetchWritersPage(page, 50);
    if (!next) break;
    all.push(...next.writers);
  }
  return all;
}

/** Public author URL built the same way as the existing `authorHref`, but only for usernames. */
export function authorPath(a: { username?: string } | null | undefined): string | null {
  return a?.username ? `/u/${encodeURIComponent(String(a.username).toLowerCase())}` : null;
}

export function readingMinutes(body?: string): number {
  return Math.max(1, Math.round((body || '').split(/\s+/).filter(Boolean).length / 120));
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

/** Page number from `?page=`: missing/invalid/zero values mean page 1 (never an error). */
export function parsePage(raw: string | undefined): number {
  return /^\d+$/.test(raw || '') ? Math.max(1, parseInt(raw as string, 10)) : 1;
}

/**
 * Only fields that are already shown publicly are ever passed from the server into client components
 * (and therefore into the page HTML). Email, DOB and any other private field the API might return are dropped.
 */
export function publicWriter(w: Writer): Writer {
  return {
    _id: w._id,
    username: w.username,
    firstName: w.firstName ?? '',
    lastName: w.lastName,
    profilePic: w.profilePic,
    bio: w.bio,
    city: w.city,
    languagePref: w.languagePref,
    createdAt: w.createdAt,
    poemsCount: w.poemsCount,
    socialLinks: w.socialLinks,
    // Only present on the single-author endpoint; list/poem pages are unchanged.
    ...(w.badges?.length ? { badges: sanitizeBadges(w.badges) } : {}),
    ...(normalizeFrameKey(w.profileFrame) !== 'default' ? { profileFrame: { key: normalizeFrameKey(w.profileFrame) } } : {}),
  };
}

export function publicPoem(p: Poem): Poem {
  return {
    _id: p._id,
    slug: p.slug,
    title: p.title,
    body: p.body,
    category: p.category,
    tags: p.tags,
    ...(p.youtubeVideoId ? { youtubeVideoId: p.youtubeVideoId } : {}),
    createdAt: p.createdAt,
    author: p.author
      ? {
          _id: p.author._id,
          username: p.author.username,
          firstName: p.author.firstName,
          lastName: p.author.lastName,
          profilePic: p.author.profilePic,
          socialLinks: p.author.socialLinks,
        }
      : undefined,
  };
}

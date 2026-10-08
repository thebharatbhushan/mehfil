import { API_BASE_URL } from '@/lib/mehfil';
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
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { status: res.status, data: null };
    return { status: res.status, data: (await res.json()) as T };
  } catch {
    // Network error / timeout (e.g. a sleeping free-tier backend): status 0 = "unknown", never treated as "missing".
    return { status: 0, data: null };
  }
}

/** Same endpoint the poem page already uses. `missing` is true only when the API answers 404. */
export async function fetchPoemBySlug(slug: string): Promise<{ poem: Poem | null; missing: boolean }> {
  const { status, data } = await getApi<{ poem?: Poem } & Partial<Poem>>(`/api/poems/slug/${encodeURIComponent(slug)}`);
  const p = data?.poem || (data && data._id ? (data as Poem) : null);
  return { poem: p && p.title ? p : null, missing: status === 404 };
}

/** Same endpoint the author page already uses (accepts id or username). */
export async function fetchAuthor(ident: string): Promise<{ author: { user: Writer; poems: Poem[] } | null; missing: boolean }> {
  const { status, data } = await getApi<{ user?: Writer; poems?: Poem[] }>(`/api/auth/user/${encodeURIComponent(ident)}`);
  if (!data?.user) return { author: null, missing: status === 404 };
  return {
    author: { user: data.user, poems: data.poems || (data.user as Writer & { poems?: Poem[] }).poems || [] },
    missing: false,
  };
}

/** null = the API could not be reached (unknown), as opposed to [] = reachable but no poems. */
export async function fetchAllPoemsOrNull(): Promise<Poem[] | null> {
  const { data } = await getApi<{ poems?: Poem[] } | Poem[]>('/api/poems');
  if (!data) return null;
  return ((Array.isArray(data) ? data : data.poems) || []).filter((p) => p && p.slug && p.title);
}

export async function fetchAllPoems(): Promise<Poem[]> {
  return (await fetchAllPoemsOrNull()) || [];
}

export async function fetchFeaturedPoems(): Promise<Poem[]> {
  const { data } = await getApi<{ poems?: Poem[] } | Poem[]>('/api/poems/featured');
  return ((Array.isArray(data) ? data : data?.poems) || []).filter((p) => p && p.slug && p.title);
}

export async function fetchAllWriters(): Promise<Writer[]> {
  const { data } = await getApi<{ users?: Writer[] }>('/api/admin/users');
  return data?.users || [];
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

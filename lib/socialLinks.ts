/**
 * Social / website links — single source of truth for the frontend.
 *
 * - Platform list (order = display order)
 * - URL normalisation + validation (http/https only; platform hosts enforced)
 * - Helpers that turn a stored `socialLinks` object into a safe list for rendering
 *
 * Keys follow the existing profile convention (`instagram`, `x`, `website`, `linkedin` already
 * existed on the profile page); `facebook`, `youtube` and `goodreads` are new.
 * Every field is optional. The backend must apply the same rules (see BACKEND_PATCH.md) — this
 * file is defence in depth, never the only line of defence.
 */

export type SocialKey = 'instagram' | 'facebook' | 'x' | 'youtube' | 'linkedin' | 'goodreads' | 'website';

export type SocialLinks = Partial<Record<SocialKey, string>>;

export interface SocialPlatform {
  key: SocialKey;
  label: string;
  placeholder: string;
  /** Allowed hostnames (without www./m.). Empty = any public host (personal website). */
  hosts: string[];
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username', hosts: ['instagram.com', 'instagr.am'] },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username', hosts: ['facebook.com', 'fb.com', 'fb.me'] },
  { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/username', hosts: ['x.com', 'twitter.com'] },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@username', hosts: ['youtube.com', 'youtu.be'] },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username', hosts: ['linkedin.com'] },
  { key: 'goodreads', label: 'Goodreads', placeholder: 'https://goodreads.com/username', hosts: ['goodreads.com'] },
  { key: 'website', label: 'Website', placeholder: 'https://example.com', hosts: [] },
];

export const SOCIAL_KEYS = SOCIAL_PLATFORMS.map((p) => p.key);

export const MAX_SOCIAL_URL_LENGTH = 300;

const PLATFORM_BY_KEY = new Map(SOCIAL_PLATFORMS.map((p) => [p.key, p]));

function stripSubdomain(host: string): string {
  return host.toLowerCase().replace(/^(www|m|mobile)\./, '');
}

function hostMatches(host: string, allowed: string[]): boolean {
  const bare = stripSubdomain(host);
  return allowed.some((h) => bare === h || bare.endsWith(`.${h}`));
}

/** Rejects localhost / raw IPs / single-label hosts so "Website" must be a real public domain. */
function isPublicHostname(host: string): boolean {
  if (!host.includes('.')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false; // IPv4
  if (host.includes(':') || host.startsWith('[')) return false; // IPv6
  if (/\.(local|localhost|internal|test)$/i.test(host)) return false;
  return /^[a-z0-9.-]+$/i.test(host) || /^[^\s/]+$/u.test(host); // allow IDN
}

export interface SocialLinkResult {
  ok: boolean;
  /** Normalised https URL ('' when the field is empty — that is valid and means "remove"). */
  value: string;
  error?: string;
}

/**
 * Normalises and validates one link.
 *  - empty / whitespace            → ok, value ''
 *  - "instagram.com/me"            → "https://instagram.com/me"
 *  - "javascript:…", "data:…", …   → rejected (only http/https allowed)
 */
export function validateSocialLink(key: SocialKey, raw: unknown): SocialLinkResult {
  const platform = PLATFORM_BY_KEY.get(key);
  if (!platform) return { ok: false, value: '', error: 'अमान्य प्लेटफ़ॉर्म।' };
  if (raw === undefined || raw === null) return { ok: true, value: '' };
  if (typeof raw !== 'string') return { ok: false, value: '', error: 'अमान्य लिंक।' };

  let input = raw.trim();
  if (!input) return { ok: true, value: '' };
  if (input.length > MAX_SOCIAL_URL_LENGTH) {
    return { ok: false, value: '', error: `${platform.label}: लिंक ${MAX_SOCIAL_URL_LENGTH} अक्षरों से छोटा रखें।` };
  }
  // Control characters / whitespace inside a URL are never legitimate.
  if (/[\u0000-\u001f\u007f\s]/.test(input)) {
    return { ok: false, value: '', error: `${platform.label}: लिंक में रिक्त स्थान नहीं होना चाहिए।` };
  }

  // A scheme is anything like "word:" before the first slash. Only http/https may pass.
  const schemeMatch = input.match(/^([a-z][a-z0-9+.-]*):/i);
  if (schemeMatch && !/^https?$/i.test(schemeMatch[1])) {
    // "example.com:8080/x" looks like a scheme to the regex — treat host:port as scheme-less.
    const looksLikeHostPort = /^[a-z0-9.-]+:\d+(\/|$)/i.test(input);
    if (!looksLikeHostPort) {
      return { ok: false, value: '', error: `${platform.label}: केवल http/https लिंक मान्य हैं।` };
    }
  }
  if (input.startsWith('//')) input = `https:${input}`;
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, value: '', error: `${platform.label}: कृपया सही URL दर्ज करें।` };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, value: '', error: `${platform.label}: केवल http/https लिंक मान्य हैं।` };
  }
  if (url.username || url.password) {
    return { ok: false, value: '', error: `${platform.label}: लिंक में यूज़रनेम/पासवर्ड नहीं हो सकता।` };
  }
  if (!isPublicHostname(url.hostname)) {
    return { ok: false, value: '', error: `${platform.label}: कृपया सही URL दर्ज करें।` };
  }
  if (platform.hosts.length > 0) {
    if (!hostMatches(url.hostname, platform.hosts)) {
      return { ok: false, value: '', error: `${platform.label}: लिंक ${platform.hosts[0]} का होना चाहिए।` };
    }
    // Profile links are always served over https.
    url.protocol = 'https:';
  }

  const normalised = url.toString();
  if (normalised.length > MAX_SOCIAL_URL_LENGTH) {
    return { ok: false, value: '', error: `${platform.label}: लिंक ${MAX_SOCIAL_URL_LENGTH} अक्षरों से छोटा रखें।` };
  }
  // Drop the trailing slash the URL API adds to bare origins ("https://example.com/").
  return { ok: true, value: url.pathname === '/' && !url.search && !url.hash ? normalised.replace(/\/$/, '') : normalised };
}

export interface SocialFormResult {
  ok: boolean;
  /** Normalised values for every key (empty string = cleared). Only meaningful when ok. */
  values: Record<SocialKey, string>;
  /** Per-field error messages. */
  errors: Partial<Record<SocialKey, string>>;
}

/** Validates the whole settings form at once. */
export function validateSocialForm(form: Partial<Record<SocialKey, string>>): SocialFormResult {
  const values = {} as Record<SocialKey, string>;
  const errors: Partial<Record<SocialKey, string>> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const result = validateSocialLink(platform.key, form[platform.key]);
    values[platform.key] = result.value;
    if (!result.ok && result.error) errors[platform.key] = result.error;
  }
  return { ok: Object.keys(errors).length === 0, values, errors };
}

export interface VisibleSocialLink {
  key: SocialKey;
  label: string;
  url: string;
  /** "@username" or the bare domain, when it can be derived safely. */
  handle: string;
}

function firstPathSegment(url: URL): string {
  return url.pathname.split('/').filter(Boolean)[0] || '';
}

/** Human-friendly secondary text: "@username" for social platforms, "example.com" for websites. */
export function deriveHandle(key: SocialKey, url: string): string {
  try {
    const u = new URL(url);
    const host = stripSubdomain(u.hostname);
    if (key === 'website') {
      const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
      const shown = `${host}${path}`;
      return shown.length > 40 ? `${shown.slice(0, 37)}…` : shown;
    }
    const parts = u.pathname.split('/').filter(Boolean);
    let name = '';
    if (key === 'linkedin') name = ['in', 'company', 'pub'].includes(parts[0]) ? parts[1] || '' : parts[0] || '';
    else if (key === 'youtube') name = parts[0]?.startsWith('@') ? parts[0] : ['c', 'user', 'channel'].includes(parts[0]) ? parts[1] || '' : '';
    else if (key === 'goodreads') name = ''; // goodreads profile paths are numeric ids / slugs, not handles
    else name = firstPathSegment(u);
    name = decodeURIComponent(name).replace(/^@/, '');
    if (!name || name.length > 30 || /^(profile\.php|people|pages|channel|user|show)$/i.test(name)) return '';
    return `@${name}`;
  } catch {
    return '';
  }
}

/**
 * Turns whatever the API returned into the list that may be rendered: known platforms only,
 * re-validated on the client, empty / invalid / unsafe values dropped silently.
 * (`twitter` is accepted as a legacy alias for `x`.)
 */
export function getVisibleSocialLinks(links: unknown): VisibleSocialLink[] {
  if (!links || typeof links !== 'object') return [];
  const source = links as Record<string, unknown>;
  const out: VisibleSocialLink[] = [];
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = source[platform.key] ?? (platform.key === 'x' ? source.twitter : undefined);
    const result = validateSocialLink(platform.key, raw);
    if (result.ok && result.value) {
      out.push({ key: platform.key, label: platform.label, url: result.value, handle: deriveHandle(platform.key, result.value) });
    }
  }
  return out;
}

export function hasSocialLinks(links: unknown): boolean {
  return getVisibleSocialLinks(links).length > 0;
}

/** Form defaults from a user's stored links (twitter alias honoured). */
export function toSocialForm(links: unknown): Record<SocialKey, string> {
  const source = (links && typeof links === 'object' ? links : {}) as Record<string, unknown>;
  const form = {} as Record<SocialKey, string>;
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = source[platform.key] ?? (platform.key === 'x' ? source.twitter : undefined);
    form[platform.key] = typeof raw === 'string' ? raw : '';
  }
  return form;
}

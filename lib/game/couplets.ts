import type { Poem } from '@/lib/mehfil';
import { getFirstAkshar, getLastAkshar, normalizeForMatch } from './akshar';

/** One sher: two lines, who wrote it and where it comes from. */
export interface Couplet {
  id: string;
  lines: [string, string];
  poet: string;
  /** Poem title on Mehfil, or the published collection for the local public-domain fallback. */
  source: string;
  /** Link to the poem on Mehfil (community couplets only). */
  href?: string;
}

/** A couplet plus the precomputed values the game compares. */
export interface Entry extends Couplet {
  first: string; // first akshar of line 1
  last: string; // last akshar of line 2
  k1: string; // match key of line 1
  kfull: string; // match key of line 1 + line 2
}

/** Below this many usable community couplets the local public-domain fallback is added. */
export const MIN_SITE_COUPLETS = 30;

const MIN_LINE = 6;
const MAX_LINE = 90; // same limit the sher-of-the-day card uses

function devanagariShare(line: string): number {
  const letters = line.match(/\p{L}/gu) || [];
  if (!letters.length) return 0;
  const dev = line.match(/[ऄ-हक़-य़]/g) || [];
  return dev.length / letters.length;
}

const isHindiLine = (line: string) => line.length >= MIN_LINE && line.length <= MAX_LINE && devanagariShare(line) >= 0.7;

/**
 * Couplets from Mehfil poems. Same selection rule as the sher-of-the-day card (shayari category, or a very short
 * poem), taking the first two lines. Only Devanagari couplets are kept (Hindi-only MVP).
 */
export function coupletsFromPoems(poems: Poem[]): Couplet[] {
  const out: Couplet[] = [];
  for (const poem of poems || []) {
    if (!poem || !poem.slug) continue;
    const lines = String(poem.body || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    const isShayari = (poem.category || '').toLowerCase() === 'shayari';
    if (!isShayari && lines.length > 4) continue;
    const [a, b] = lines;
    if (!isHindiLine(a) || !isHindiLine(b)) continue;
    const name = poem.author ? `${poem.author.firstName || ''} ${poem.author.lastName || ''}`.trim() : '';
    out.push({
      id: `poem-${poem._id || poem.slug}`,
      lines: [a, b],
      poet: name || 'अज्ञात शायर',
      source: poem.title ? `मेहफ़िल · ${poem.title}` : 'मेहफ़िल',
      href: `/poem/${poem.slug}`,
    });
  }
  return out;
}

/** Adds the comparison fields; drops couplets without a usable first/last akshar and exact duplicates. */
export function toEntries(couplets: Couplet[]): Entry[] {
  const seen = new Set<string>();
  const out: Entry[] = [];
  for (const c of couplets) {
    if (!c || !Array.isArray(c.lines) || c.lines.length < 2) continue;
    const [l1, l2] = c.lines;
    const first = getFirstAkshar(l1);
    const last = getLastAkshar(l2);
    if (!first || !last) continue;
    const kfull = normalizeForMatch(`${l1} ${l2}`);
    if (!kfull || seen.has(kfull)) continue;
    seen.add(kfull);
    out.push({ ...c, lines: [l1, l2], first, last, k1: normalizeForMatch(l1), kfull });
  }
  return out;
}

/** Community couplets first; the local fallback is added only when there are fewer than MIN_SITE_COUPLETS of them. */
export function buildPool(site: Couplet[], fallback: Couplet[]): { entries: Entry[]; usedFallback: boolean } {
  const siteEntries = toEntries(site);
  if (siteEntries.length >= MIN_SITE_COUPLETS) return { entries: siteEntries, usedFallback: false };
  return { entries: toEntries([...site, ...fallback]), usedFallback: true };
}

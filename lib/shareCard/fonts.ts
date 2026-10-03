/**
 * Fonts for the share card.
 *
 * Canvas text does NOT trigger web-font downloads on its own, and the @fontsource packages split each
 * family by unicode-range, so a font file is only fetched once a matching character is requested.
 * `ensureCardFonts` therefore asks the browser to load exactly the faces needed for this poem
 * (document.fonts.load(font, text)) BEFORE the canvas is drawn. Without this, Hindi/Urdu would render
 * in a fallback font (or as empty boxes) on first draw.
 *
 * Only fonts that app/fonts.ts already ships are used - nothing extra to download or install:
 *   Latin       Cormorant Garamond, Inter
 *   Devanagari  Tiro Devanagari Hindi, Noto Serif Devanagari
 *   Urdu        Noto Nastaliq Urdu
 */
import type { FontStyleId } from './types';

export type Script = 'latin' | 'deva' | 'arab';

const RE_ARAB = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const RE_DEVA = /[ऀ-ॿ꣠-ꣿ]/;
const RE_LATIN = /[A-Za-zÀ-ɏ]/;

/** Which scripts occur in the text. */
export function scriptsIn(text: string): Record<Script, boolean> {
  return { latin: RE_LATIN.test(text), deva: RE_DEVA.test(text), arab: RE_ARAB.test(text) };
}

/**
 * Right-to-left base direction, decided like dir="auto": by the first strongly-directional letter.
 * (The reading page uses dir="auto" per line as well, so the card matches what readers see.)
 */
export function isRtlLine(text: string): boolean {
  for (const ch of text) {
    if (RE_ARAB.test(ch)) return true;
    if (RE_DEVA.test(ch) || RE_LATIN.test(ch)) return false;
  }
  return false;
}

interface FontStyleDef {
  id: FontStyleId;
  /** Poem body: CSS font shorthand pieces. */
  weight: { latin: number; deva: number; arab: number };
  families: { latin: string; deva: string; arab: string };
  /** Visual size correction so the scripts look equally big at the same nominal size. */
  scale: { latin: number; deva: number; arab: number };
  /** Line-height as a multiple of font size (mirrors the 1.95 poetry line-height used on the reading page). */
  lineHeight: { latin: number; deva: number; arab: number };
  /** Letter spacing applied to pure-Latin lines only (tracking breaks Arabic-script joining). */
  latinTracking: number;
  /** Author name. */
  nameWeight: number;
  nameTracking: number;
}

const CORMORANT = '"Cormorant Garamond"';
const INTER = '"Inter"';
const TIRO = '"Tiro Devanagari Hindi"';
const NOTO_DEVA = '"Noto Serif Devanagari"';
const NASTALIQ = '"Noto Nastaliq Urdu"';

export const FONT_STYLES: Record<FontStyleId, FontStyleDef> = {
  classic: {
    id: 'classic',
    weight: { latin: 500, deva: 400, arab: 400 },
    families: { latin: CORMORANT, deva: TIRO, arab: NASTALIQ },
    scale: { latin: 1.12, deva: 1, arab: 0.92 },
    lineHeight: { latin: 1.42, deva: 1.62, arab: 1.95 },
    latinTracking: 0,
    nameWeight: 700,
    nameTracking: 1,
  },
  elegant: {
    id: 'elegant',
    weight: { latin: 500, deva: 400, arab: 400 },
    families: { latin: CORMORANT, deva: NOTO_DEVA, arab: NASTALIQ },
    scale: { latin: 1.14, deva: 0.96, arab: 0.9 },
    lineHeight: { latin: 1.5, deva: 1.7, arab: 2.0 },
    latinTracking: 1.2,
    nameWeight: 600,
    nameTracking: 4,
  },
  modern: {
    id: 'modern',
    weight: { latin: 500, deva: 600, arab: 700 },
    families: { latin: INTER, deva: NOTO_DEVA, arab: NASTALIQ },
    scale: { latin: 0.88, deva: 0.94, arab: 0.88 },
    lineHeight: { latin: 1.5, deva: 1.66, arab: 1.95 },
    latinTracking: -0.2,
    nameWeight: 600,
    nameTracking: 2,
  },
  urdu: {
    id: 'urdu',
    weight: { latin: 500, deva: 400, arab: 400 },
    families: { latin: CORMORANT, deva: TIRO, arab: NASTALIQ },
    scale: { latin: 1.14, deva: 1, arab: 1.06 },
    lineHeight: { latin: 1.5, deva: 1.7, arab: 2.15 },
    latinTracking: 0.4,
    nameWeight: 700,
    nameTracking: 1,
  },
};

/**
 * Font shorthand for a line. The stack lists all three poem scripts so mixed-language lines fall back
 * glyph-by-glyph to the correct face; the line's dominant script goes first.
 */
export function poemFont(style: FontStyleId, dominant: Script, sizePx: number): string {
  const s = FONT_STYLES[style];
  const order: Script[] = [dominant, ...(['latin', 'deva', 'arab'] as Script[]).filter((x) => x !== dominant)];
  const stack = order.map((k) => s.families[k]).join(', ');
  return `${s.weight[dominant]} ${Math.round(sizePx * s.scale[dominant] * 10) / 10}px ${stack}, serif`;
}

export function nameFont(style: FontStyleId, dominant: Script, sizePx: number): string {
  const s = FONT_STYLES[style];
  const order: Script[] = [dominant, ...(['latin', 'deva', 'arab'] as Script[]).filter((x) => x !== dominant)];
  const stack = order.map((k) => s.families[k]).join(', ');
  const weight = dominant === 'arab' ? s.weight.arab : s.nameWeight;
  return `${weight} ${sizePx}px ${stack}, serif`;
}

export const BRAND_DEVA_FONT = `700 54px ${NOTO_DEVA}, ${TIRO}, serif`;
export const URL_FONT = `500 30px ${INTER}, ${CORMORANT}, sans-serif`;

/** Dominant script of a line: Arabic/Devanagari win over Latin when present (they need the taller metrics). */
export function dominantScript(text: string): Script {
  const sc = scriptsIn(text);
  if (sc.arab && (!sc.deva || isRtlLine(text))) return 'arab';
  if (sc.deva) return 'deva';
  if (sc.arab) return 'arab';
  return 'latin';
}

let epoch = 0;
/** Bumps whenever new faces finish loading so cached text measurements can be discarded. */
export function fontEpoch(): number {
  return epoch;
}

/** Make sure every face the card needs for `text` is loaded. Resolves (never rejects) within `timeoutMs`. */
export async function ensureCardFonts(style: FontStyleId, text: string, timeoutMs = 6000): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.load !== 'function') return;
  const sc = scriptsIn(text);
  const def = FONT_STYLES[style];
  const jobs: Promise<unknown>[] = [];
  const add = (font: string, sample: string) => jobs.push(document.fonts.load(font, sample).catch(() => []));

  (['latin', 'deva', 'arab'] as Script[]).forEach((k) => {
    if (!sc[k]) return;
    add(`${def.weight[k]} 40px ${def.families[k]}`, text);
  });
  // Author name (any script) and the fixed brand strings.
  add(`${def.nameWeight} 40px ${def.families.latin}`, 'Mehfil mehfil.in');
  add(`${def.nameWeight} 40px ${def.families.deva}`, 'मेहफ़िल');
  add(BRAND_DEVA_FONT, 'मेहफ़िल');
  add(URL_FONT, 'mehfil.in');

  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, timeoutMs))]);
  epoch++;
}

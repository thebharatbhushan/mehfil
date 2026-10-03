/**
 * Poem text layout for the share card.
 *
 * - Original text is preserved: every source line stays a line, blank lines stay stanza gaps.
 * - A source line is only broken when it is wider than the card; the break happens at word boundaries
 *   (and, for a single over-long word, between grapheme clusters).
 * - Each line gets its own base direction (like dir="auto" on the reading page), so Urdu lines are laid
 *   out right-to-left and Hindi/English left-to-right inside the same poem.
 * - The poem is shrunk in small steps to fit one card, but never below MIN_FIT_PX; beyond that it is
 *   split over several cards at stanza breaks.
 */
import { FONT_STYLES, dominantScript, fontEpoch, isRtlLine, poemFont, scriptsIn } from './fonts';
import type { Script } from './fonts';
import { MIN_FIT_PX } from './types';
import type { FontStyleId } from './types';

export interface Row {
  kind: 'line' | 'gap';
  text: string;
  rtl: boolean;
  font: string;
  /** Letter spacing in px (pure-Latin lines only). */
  tracking: number;
  width: number;
  height: number;
  /** Baseline offset from the top of the row. */
  baseline: number;
}

export interface PoemLayout {
  pages: Row[][];
  /** Nominal font size used (px on the 1080-wide card). */
  sizePx: number;
  paginated: boolean;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function ctx2d(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    measureCtx = c.getContext('2d') as CanvasRenderingContext2D;
  }
  return measureCtx;
}

/** Normalise line endings / whitespace; keep ZWJ/ZWNJ (needed for correct Hindi & Urdu shaping). */
export function normalizeBody(body: string): string[] {
  const raw = (body || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\u2028\u2029]/g, ' ')
    .split('\n')
    .map((l) => l.replace(/[ ]{2,}/g, ' ').trim());
  // collapse runs of blank lines into one gap, trim leading/trailing gaps
  const out: string[] = [];
  for (const l of raw) {
    if (l === '' && (out.length === 0 || out[out.length - 1] === '')) continue;
    out.push(l);
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
}

function graphemes(word: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(word), (s) => s.segment);
  return Array.from(word);
}

function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

function lineMetrics(ctx: CanvasRenderingContext2D, lineH: number, fallbackSize: number) {
  const m = ctx.measureText('मेहफ़िल Hgپ');
  const asc = typeof m.fontBoundingBoxAscent === 'number' ? m.fontBoundingBoxAscent : fallbackSize * 0.95;
  const desc = typeof m.fontBoundingBoxDescent === 'number' ? m.fontBoundingBoxDescent : fallbackSize * 0.45;
  // CSS "half-leading": the font's content area is centred inside the line box.
  return (lineH - (asc + desc)) / 2 + asc;
}

/** Splits one over-long word between grapheme clusters; the last piece is the (open) remainder. */
function breakWord(ctx: CanvasRenderingContext2D, word: string, maxW: number): string[] {
  const pieces: string[] = [];
  let piece = '';
  for (const g of graphemes(word)) {
    if (piece && ctx.measureText(piece + g).width > maxW) {
      pieces.push(piece);
      piece = g;
    } else {
      piece += g;
    }
  }
  pieces.push(piece);
  return pieces;
}

function wrap(ctx: CanvasRenderingContext2D, line: string, maxW: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of line.split(' ')) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width <= maxW) {
      cur = test;
      continue;
    }
    if (cur) {
      out.push(cur);
      cur = '';
    }
    if (ctx.measureText(word).width <= maxW) {
      cur = word;
    } else {
      const pieces = breakWord(ctx, word, maxW);
      cur = pieces.pop() as string;
      out.push(...pieces);
    }
  }
  if (cur) out.push(cur);
  return out;
}

function buildRows(lines: string[], style: FontStyleId, px: number, maxW: number): Row[] {
  const ctx = ctx2d();
  const def = FONT_STYLES[style];
  const rows: Row[] = [];

  for (const line of lines) {
    if (line === '') {
      rows.push({ kind: 'gap', text: '', rtl: false, font: '', tracking: 0, width: 0, height: Math.round(px * 0.85), baseline: 0 });
      continue;
    }
    const dom: Script = dominantScript(line);
    const present = scriptsIn(line);
    const rtl = isRtlLine(line);
    const font = poemFont(style, dom, px);
    const pureLatin = present.latin && !present.deva && !present.arab;
    const tracking = pureLatin ? def.latinTracking : 0;

    // Line-height: the tallest script present wins so mixed lines never collide with their neighbours.
    let lhMul = def.lineHeight[dom];
    (['latin', 'deva', 'arab'] as Script[]).forEach((k) => {
      if (present[k]) lhMul = Math.max(lhMul, def.lineHeight[k] * (def.scale[k] / def.scale[dom]));
    });
    const actualPx = px * def.scale[dom];
    const lineH = Math.round(actualPx * lhMul);

    ctx.font = font;
    ctx.direction = rtl ? 'rtl' : 'ltr';
    setTracking(ctx, tracking);
    const baseline = lineMetrics(ctx, lineH, actualPx);

    for (const piece of wrap(ctx, line, maxW)) {
      rows.push({
        kind: 'line',
        text: piece,
        rtl,
        font,
        tracking,
        width: ctx.measureText(piece).width,
        height: lineH,
        baseline,
      });
    }
  }
  ctx.direction = 'ltr';
  setTracking(ctx, 0);
  return rows;
}

export function rowsHeight(rows: Row[]): number {
  return rows.reduce((h, r) => h + r.height, 0);
}

function trimGaps(rows: Row[]): Row[] {
  let a = 0;
  let b = rows.length;
  while (a < b && rows[a].kind === 'gap') a++;
  while (b > a && rows[b - 1].kind === 'gap') b--;
  return rows.slice(a, b);
}

function paginate(rows: Row[], zoneH: number): Row[][] {
  const pages: Row[][] = [];
  let cur: Row[] = [];
  let h = 0;

  for (const row of rows) {
    if (row.kind === 'gap' && cur.length === 0) continue;
    if (h + row.height > zoneH && cur.length) {
      // Prefer breaking at a stanza gap in the lower part of the page.
      let split = -1;
      let acc = 0;
      for (let i = 0; i < cur.length; i++) {
        if (cur[i].kind === 'gap' && acc >= zoneH * 0.5) split = i;
        acc += cur[i].height;
      }
      if (split >= 0) {
        pages.push(trimGaps(cur.slice(0, split)));
        cur = cur.slice(split + 1);
        h = rowsHeight(cur);
      } else {
        pages.push(trimGaps(cur));
        cur = [];
        h = 0;
      }
      if (row.kind === 'gap') continue;
    }
    cur.push(row);
    h += row.height;
  }
  if (cur.length) pages.push(trimGaps(cur));
  return pages.filter((p) => p.length > 0);
}

const cache = new Map<string, PoemLayout>();

export function layoutPoem(body: string, style: FontStyleId, basePx: number, maxW: number, zoneH: number): PoemLayout {
  const key = `${fontEpoch()}|${style}|${basePx}|${maxW}|${zoneH}|${body}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const lines = normalizeBody(body);
  let result: PoemLayout | null = null;

  // Prefer a size where every original line stays on ONE row (poets choose their line breaks), as long
  // as that doesn't shrink the text more than ~22%. Otherwise accept the largest size that merely fits.
  const sourceLines = lines.filter((l) => l !== '').length;
  const noWrapFloor = Math.max(MIN_FIT_PX, Math.round(basePx * 0.78));
  let firstFit: PoemLayout | null = null;
  for (let px = basePx; px >= MIN_FIT_PX; px -= 2) {
    if (firstFit && px < noWrapFloor) break;
    const rows = buildRows(lines, style, px, maxW);
    if (rowsHeight(rows) > zoneH) continue;
    const wrapped = rows.filter((r) => r.kind === 'line').length > sourceLines;
    if (!wrapped) {
      result = { pages: [rows], sizePx: px, paginated: false };
      break;
    }
    if (!firstFit) firstFit = { pages: [rows], sizePx: px, paginated: false };
  }
  if (!result && firstFit) result = firstFit;

  if (!result) {
    const px = Math.min(basePx, Math.max(MIN_FIT_PX + 2, 40));
    const pages = paginate(buildRows(lines, style, px, maxW), zoneH);
    result = { pages: pages.length ? pages : [[]], sizePx: px, paginated: pages.length > 1 };
  }

  if (cache.size > 24) cache.delete(cache.keys().next().value as string);
  cache.set(key, result);
  return result;
}

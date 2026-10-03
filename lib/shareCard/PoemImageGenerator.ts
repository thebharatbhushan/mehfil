/**
 * PoemImageGenerator - draws the share card.
 *
 * One function, `renderCard`, paints the whole 1080 x 1350 card onto a canvas. The live preview and the
 * exported PNG both call it, so what the user sees is exactly what they download / share.
 *
 * Layers (back to front): background -> watermark (always) -> frame -> decoration -> author photo + name + title
 * -> poem -> footer (logo + mehfil.in).
 */
import { drawBrandLockup, drawFeather } from './logo';
import { loadAuthorImage, getLoadedAuthorImage } from './avatar';
import { drawDecoration, drawDivider, drawFrame } from './decorations';
import { URL_FONT, dominantScript, ensureCardFonts, isRtlLine, nameFont, FONT_STYLES } from './fonts';
import { layoutPoem } from './layout';
import type { PoemLayout } from './layout';
import { THEMES } from './themes';
import { CARD_HEIGHT, CARD_WIDTH, EXPORT_SCALE, SIZE_PX } from './types';
import type { ShareCardOptions, SharePoemData } from './types';

/** Geometry of the card (logical px on the 1080 x 1350 canvas). */
export const GEOMETRY = {
  avatarCy: 124,
  avatarR: 54,
  nameY: 226,
  nameMaxWidth: 560,
  titleY: 292,
  titleMaxWidth: 560,
  dividerY: 346,
  bodyX: 140,
  bodyWidth: CARD_WIDTH - 280,
  bodyTop: 376,
  bodyHeight: 656,
  footerLogoY: 1112,
  footerUrlY: 1210,
};

export interface RenderInfo {
  pageCount: number;
  /** Poem font size actually used (after shrink-to-fit). */
  sizePx: number;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getLayout(poem: SharePoemData, options: ShareCardOptions): PoemLayout {
  return layoutPoem(poem.body, options.font, SIZE_PX[options.size], GEOMETRY.bodyWidth, GEOMETRY.bodyHeight);
}

export function getPageCount(poem: SharePoemData, options: ShareCardOptions): number {
  return getLayout(poem, options).pages.length;
}

/**
 * Loads everything the card needs before the first render: the fonts for this poem and the author's
 * profile picture. Call (and await) before rendering. Never rejects.
 */
export async function prepareFonts(poem: SharePoemData, options: ShareCardOptions): Promise<void> {
  await Promise.all([
    ensureCardFonts(options.font, `${poem.body}\n${poem.authorName}\n${poem.title || ''}`),
    loadAuthorImage(poem.authorImage),
  ]);
}

function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Shrinks a single line to `maxW` (down to `minSize`), then ellipsizes. Leaves ctx.font set for the result. */
function fitLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontAt: (size: number) => string,
  startSize: number,
  minSize: number,
  maxW: number,
): { text: string; size: number; width: number } {
  let size = startSize;
  ctx.font = fontAt(size);
  while (ctx.measureText(text).width > maxW && size > minSize) {
    size -= 2;
    ctx.font = fontAt(size);
  }
  if (ctx.measureText(text).width > maxW) {
    const chars = Array.from(text);
    while (chars.length > 1 && ctx.measureText(chars.join('') + '…').width > maxW) chars.pop();
    text = chars.join('') + '…';
  }
  return { text, size, width: ctx.measureText(text).width };
}

/** Draws `text` centred on cx with its visual middle on cy. */
function drawCentred(ctx: CanvasRenderingContext2D, text: string, width: number, cy: number) {
  const m = ctx.measureText('Hgमेहپ');
  const asc = typeof m.fontBoundingBoxAscent === 'number' ? m.fontBoundingBoxAscent : parseFloat(ctx.font) * 0.95;
  const desc = typeof m.fontBoundingBoxDescent === 'number' ? m.fontBoundingBoxDescent : parseFloat(ctx.font) * 0.45;
  ctx.fillText(text, CARD_WIDTH / 2 - width / 2, cy + (asc - desc) / 2);
}

/**
 * Author profile picture, round, with a fine double ring. If the picture is missing / not loaded the
 * brand initial is drawn instead (same terracotta look as the site's own avatar fallback).
 */
function drawAvatar(ctx: CanvasRenderingContext2D, poem: SharePoemData, options: ShareCardOptions) {
  const theme = THEMES[options.background];
  const cx = CARD_WIDTH / 2;
  const cy = GEOMETRY.avatarCy;
  const r = GEOMETRY.avatarR;
  const img = getLoadedAuthorImage(poem.authorImage);

  ctx.save();
  // soft halo so the photo lifts off the paper
  ctx.shadowColor = theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(80,40,20,0.22)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = theme.isDark ? '#2a2830' : '#efe0d2';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (img && img.naturalWidth > 0) {
    // object-fit: cover
    const s = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, theme.logo[0]);
    g.addColorStop(1, theme.logo[1]);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const initial = Array.from((poem.authorName || 'म').trim())[0]?.toUpperCase() || 'म';
    const dom = dominantScript(initial);
    ctx.fillStyle = '#fff';
    ctx.direction = 'ltr';
    ctx.textBaseline = 'alphabetic';
    ctx.font = nameFont(options.font, dom, 58);
    drawCentred(ctx, initial, ctx.measureText(initial).width, cy);
  }
  ctx.restore();

  // rings
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
  ctx.strokeStyle = theme.accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 11, 0, Math.PI * 2);
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawName(ctx: CanvasRenderingContext2D, poem: SharePoemData, options: ShareCardOptions) {
  const name = (poem.authorName || '').trim();
  if (!name) return;
  const theme = THEMES[options.background];
  const dom = dominantScript(name);
  const tracking = dom === 'latin' ? FONT_STYLES[options.font].nameTracking : 0;

  ctx.save();
  ctx.direction = isRtlLine(name) ? 'rtl' : 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = theme.accent;
  setTracking(ctx, tracking);
  const fit = fitLine(ctx, name, (sz) => nameFont(options.font, dom, sz), dom === 'arab' ? 36 : 38, 24, GEOMETRY.nameMaxWidth);
  drawCentred(ctx, fit.text, fit.width, GEOMETRY.nameY);
  ctx.restore();
}

/** The poem's own title, set in curly quotes with stronger weight than the name but quieter than the poem. */
function drawTitle(ctx: CanvasRenderingContext2D, poem: SharePoemData, options: ShareCardOptions) {
  const raw = (poem.title || '').trim();
  if (!raw) return;
  const theme = THEMES[options.background];
  const dom = dominantScript(raw);
  const text = `\u201C${raw}\u201D`;

  ctx.save();
  ctx.direction = isRtlLine(raw) ? 'rtl' : 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = theme.ink;
  setTracking(ctx, 0);
  const fit = fitLine(ctx, text, (sz) => nameFont(options.font, dom, sz), dom === 'arab' ? 46 : 52, 30, GEOMETRY.titleMaxWidth);
  drawCentred(ctx, fit.text, fit.width, GEOMETRY.titleY);
  ctx.restore();
}

function drawPoem(ctx: CanvasRenderingContext2D, layout: PoemLayout, page: number, options: ShareCardOptions) {
  const theme = THEMES[options.background];
  const rows = layout.pages[Math.min(page, layout.pages.length - 1)] || [];
  const contentH = rows.reduce((h, r) => h + r.height, 0);
  // Centre the poem in its zone with a slight optical lift.
  let y = GEOMETRY.bodyTop + (GEOMETRY.bodyHeight - contentH) * 0.46;

  ctx.save();
  ctx.fillStyle = theme.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const row of rows) {
    if (row.kind === 'line') {
      ctx.font = row.font;
      ctx.direction = row.rtl ? 'rtl' : 'ltr';
      setTracking(ctx, row.tracking);
      let x = GEOMETRY.bodyX;
      if (options.align === 'center') x += (GEOMETRY.bodyWidth - row.width) / 2;
      else if (options.align === 'right') x += GEOMETRY.bodyWidth - row.width;
      ctx.fillText(row.text, x, y + row.baseline);
    }
    y += row.height;
  }
  ctx.restore();
}

function drawFooter(ctx: CanvasRenderingContext2D, options: ShareCardOptions, page: number, pageCount: number) {
  const theme = THEMES[options.background];
  drawDivider(ctx, theme, CARD_WIDTH / 2, GEOMETRY.footerLogoY - 62, 70);
  drawBrandLockup(ctx, theme, CARD_WIDTH / 2, GEOMETRY.footerLogoY);

  ctx.save();
  ctx.font = URL_FONT;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  setTracking(ctx, 3);
  ctx.fillStyle = theme.accent;
  const url = 'mehfil.in';
  const w = ctx.measureText(url).width;
  ctx.fillText(url, CARD_WIDTH / 2 - w / 2, GEOMETRY.footerUrlY);

  if (pageCount > 1) {
    setTracking(ctx, 1);
    ctx.font = `500 24px ${URL_FONT.split(' 30px ')[1]}`;
    ctx.fillStyle = theme.muted;
    const label = `${page + 1} / ${pageCount}`;
    ctx.fillText(label, CARD_WIDTH / 2 - ctx.measureText(label).width / 2, GEOMETRY.footerUrlY + 52);
  }
  ctx.restore();
}

/**
 * Paints the card. `scale` multiplies the logical 1080 x 1350 size: use ~0.4-0.6 for the preview,
 * EXPORT_SCALE for downloads.
 */
export function renderCard(
  canvas: HTMLCanvasElement,
  poem: SharePoemData,
  options: ShareCardOptions,
  { page = 0, scale = 1 }: { page?: number; scale?: number } = {},
): RenderInfo {
  const width = Math.round(CARD_WIDTH * scale);
  const height = Math.round(CARD_HEIGHT * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');

  const theme = THEMES[options.background];
  const layout = getLayout(poem, options);
  const pageIndex = Math.max(0, Math.min(page, layout.pages.length - 1));
  const seed = hash(`${poem.id}:${poem.body.length}`);

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.globalAlpha = 1;
  (ctx as unknown as { textRendering: string }).textRendering = 'optimizeLegibility';

  theme.paint(ctx, seed);

  // Mandatory Mehfil watermark: a large, faint feather behind the poem. It is always drawn - there is
  // deliberately no option to hide it. Low alpha keeps every line readable.
  drawFeather(ctx, CARD_WIDTH / 2 + 30, 700, 700, theme.isDark ? '#ffffff' : theme.accent, {
    rotateDeg: -18,
    alpha: theme.watermarkAlpha,
  });

  drawFrame(ctx, theme);
  drawDecoration(ctx, theme, options.decoration, seed);
  drawAvatar(ctx, poem, options);
  drawName(ctx, poem, options);
  drawTitle(ctx, poem, options);
  drawDivider(ctx, theme, CARD_WIDTH / 2, GEOMETRY.dividerY, 110);
  drawPoem(ctx, layout, pageIndex, options);
  drawFooter(ctx, options, pageIndex, layout.pages.length);

  return { pageCount: layout.pages.length, sizePx: layout.sizePx };
}

export function exportFileName(poem: SharePoemData, page: number, pageCount: number): string {
  const safeId = String(poem.id || 'poem').replace(/[^A-Za-z0-9_-]+/g, '');
  return pageCount > 1 ? `mehfil-poem-${safeId}-${page + 1}.png` : `mehfil-poem-${safeId}.png`;
}

/** Renders one page at export resolution and encodes it as PNG. */
export async function renderCardToBlob(
  poem: SharePoemData,
  options: ShareCardOptions,
  page = 0,
  scale = EXPORT_SCALE,
): Promise<Blob> {
  await prepareFonts(poem, options);
  const canvas = document.createElement('canvas');
  renderCard(canvas, poem, options, { page, scale });
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png');
  });
}


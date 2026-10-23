/**
 * Mehfil brand mark for canvas.
 *
 * Share cards use the official logo image (public/mehfil-logo.png, plus a cream/gold variant for dark themes).
 * The Font Awesome feather glyph (Free, CC BY 4.0) is still drawn as a vector path for the faint watermark and
 * as the fallback lock-up if the image is unavailable.
 */
import { BRAND_DEVA_FONT } from './fonts';
import { getLogoImage } from './brandImage';
export { preloadBrandLogo } from './brandImage';
import type { CardTheme } from './themes';

const FEATHER_PATH =
  'M278.5 215.6L23 471c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l74.8-74.8c7.4 4.6 15.3 8.2 23.8 10.5C200.3 452.8 270 454.5 338 409.4c12.2-8.1 5.8-25.4-8.8-25.4l-16.1 0c-5.1 0-9.2-4.1-9.2-9.2c0-4.1 2.7-7.6 6.5-8.8l97.7-29.3c3.4-1 6.4-3.1 8.4-6.1c4.4-6.4 8.6-12.9 12.6-19.6c6.2-10.3-1.5-23-13.5-23l-38.6 0c-5.1 0-9.2-4.1-9.2-9.2c0-4.1 2.7-7.6 6.5-8.8l80.9-24.3c4.6-1.4 8.4-4.8 10.2-9.3C494.5 163 507.8 86.1 511.9 36.8c.8-9.9-3-19.6-10-26.6s-16.7-10.8-26.6-10C391.5 7 228.5 40.5 137.4 131.6C57.3 211.7 56.7 302.3 71.3 356.4c2.1 7.9 12 9.6 17.8 3.8L253.6 195.8c6.2-6.2 16.4-6.2 22.6 0c5.4 5.4 6.1 13.6 2.2 19.8z';

let featherPath: Path2D | null = null;

function feather(): Path2D {
  if (!featherPath) featherPath = new Path2D(FEATHER_PATH);
  return featherPath;
}

/** Draws the feather centred on (cx, cy), `size` px square, filled with the brand gradient. */
export function drawFeather(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string | [string, string],
  opts: { rotateDeg?: number; alpha?: number } = {},
) {
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  ctx.translate(cx, cy);
  if (opts.rotateDeg) ctx.rotate((opts.rotateDeg * Math.PI) / 180);
  ctx.scale(size / 512, size / 512);
  ctx.translate(-256, -256);
  if (typeof fill === 'string') {
    ctx.fillStyle = fill;
  } else {
    const g = ctx.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, fill[0]);
    g.addColorStop(1, fill[1]);
    ctx.fillStyle = g;
  }
  ctx.fill(feather());
  ctx.restore();
}

/** Vertical offset from the visual centre line to the alphabetic baseline for the current font. */
export function centreToBaseline(ctx: CanvasRenderingContext2D, fallbackSize: number): number {
  const m = ctx.measureText('मेहफ़िल Hg');
  const asc = m.fontBoundingBoxAscent;
  const desc = m.fontBoundingBoxDescent;
  if (typeof asc === 'number' && typeof desc === 'number' && asc + desc > 0) return (asc - desc) / 2;
  return fallbackSize * 0.3;
}

/**
 * Official Mehfil logo (public/mehfil-logo*.png), centred on (cx, cy) and `height` px tall. Dark card themes get the
 * cream/gold variant so it stays readable. If the image has not loaded (yet) the old feather + wordmark lock-up is
 * drawn instead, so a card can never come out without branding. Returns the drawn width.
 */
export function drawBrandLockup(
  ctx: CanvasRenderingContext2D,
  theme: CardTheme,
  cx: number,
  cy: number,
  height = 104,
): number {
  const img = getLogoImage(theme.isDark ? 'light' : 'dark');
  if (img && img.naturalWidth > 0) {
    const w = (img.naturalWidth / img.naturalHeight) * height;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, cx - w / 2, cy - height / 2, w, height);
    ctx.restore();
    return w;
  }
  return drawTextLockup(ctx, theme, cx, cy);
}

/** Fallback: feather + "मेहफ़िल" wordmark, centred horizontally on cx. Returns the lock-up width. */
function drawTextLockup(ctx: CanvasRenderingContext2D, theme: CardTheme, cx: number, cy: number): number {
  const featherSize = 70;
  const gap = 18;

  ctx.save();
  ctx.font = BRAND_DEVA_FONT;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const word = 'मेहफ़िल';
  const textW = ctx.measureText(word).width;
  const total = featherSize + gap + textW;
  const left = cx - total / 2;

  drawFeather(ctx, left + featherSize / 2, cy, featherSize, theme.logo);

  const g = ctx.createLinearGradient(left + featherSize + gap, cy - 30, left + total, cy + 30);
  g.addColorStop(0, theme.logo[0]);
  g.addColorStop(1, theme.logo[1]);
  ctx.fillStyle = g;
  ctx.fillText(word, left + featherSize + gap, cy + centreToBaseline(ctx, 54));
  ctx.restore();
  return total;
}

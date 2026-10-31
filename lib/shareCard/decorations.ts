/**
 * Decorative layers for the share card. Everything is drawn procedurally (no image files), in the
 * corners and along the frame only, at low opacity, so the poem stays the focus.
 *
 * Safe-zone contract: nothing here may enter the poem area (x 110-970, y 240-1050), the author-name
 * area or the footer lock-up. Corner art is therefore capped at ~230 x 230 px.
 */
import { CARD_HEIGHT, CARD_WIDTH } from './types';
import type { DecorationId } from './types';
import type { CardTheme } from './themes';

const W = CARD_WIDTH;
const H = CARD_HEIGHT;
const INSET = 40;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---------- primitives ---------- */

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, color: string, filled: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.25, -len * 0.4, len * 0.75, -len * 0.34, len, 0);
  ctx.bezierCurveTo(len * 0.75, len * 0.34, len * 0.25, len * 0.4, 0, 0);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = rgba(color, 0.2);
    ctx.fill();
  }
  ctx.strokeStyle = rgba(color, 0.55);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len * 0.88, 0);
  ctx.strokeStyle = rgba(color, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.62, r * 0.4, r * 0.66, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.16);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.55);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = rgba(color, 0.6);
  ctx.fill();
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
  ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
  ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
  ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
  ctx.closePath();
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
  ctx.restore();
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
}

type Pt = { x: number; y: number };

function quad(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
}
function quadTangent(p0: Pt, c: Pt, p1: Pt, t: number): number {
  const u = 1 - t;
  return Math.atan2(2 * u * (c.y - p0.y) + 2 * t * (p1.y - c.y), 2 * u * (c.x - p0.x) + 2 * t * (p1.x - c.x));
}

function stem(ctx: CanvasRenderingContext2D, p0: Pt, c: Pt, p1: Pt, color: string, width = 1.6) {
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(c.x, c.y, p1.x, p1.y);
  ctx.strokeStyle = rgba(color, 0.55);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/* ---------- corner designs (drawn for the top-left corner, then mirrored) ---------- */

function cornerLeaves(ctx: CanvasRenderingContext2D, color: string, r: () => number) {
  const p0 = { x: 6, y: 196 };
  const c = { x: 14, y: 40 };
  const p1 = { x: 196, y: 8 };
  stem(ctx, p0, c, p1, color);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t = 0.1 + (0.86 * i) / (n - 1);
    const pt = quad(p0, c, p1, t);
    const ang = quadTangent(p0, c, p1, t);
    const side = i % 2 === 0 ? 1 : -1;
    const len = 50 - t * 20 + r() * 6;
    leaf(ctx, pt.x, pt.y, len, ang + side * (0.95 + r() * 0.2), color, true);
  }
  const tip = quad(p0, c, p1, 1);
  leaf(ctx, tip.x, tip.y, 30, quadTangent(p0, c, p1, 1), color, true);
  // inner small sprig
  const q0 = { x: 40, y: 120 };
  const qc = { x: 46, y: 70 };
  const q1 = { x: 110, y: 52 };
  stem(ctx, q0, qc, q1, color, 1.2);
  for (let i = 0; i < 4; i++) {
    const t = 0.25 + i * 0.25;
    const pt = quad(q0, qc, q1, t);
    leaf(ctx, pt.x, pt.y, 24 - i * 2, quadTangent(q0, qc, q1, t) + (i % 2 ? 1 : -1) * 1.0, color, false);
  }
}

function cornerFlowers(ctx: CanvasRenderingContext2D, color: string, r: () => number) {
  const p0 = { x: 8, y: 190 };
  const c = { x: 10, y: 34 };
  const p1 = { x: 184, y: 10 };
  stem(ctx, p0, c, p1, color);
  [0.34, 0.66, 0.97].forEach((t, i) => {
    const pt = quad(p0, c, p1, t);
    flower(ctx, pt.x + (i === 2 ? 0 : 2), pt.y + (i === 2 ? 0 : 2), 22 - i * 4, r() * Math.PI, color);
  });
  for (let i = 0; i < 5; i++) {
    const t = 0.12 + i * 0.17;
    const pt = quad(p0, c, p1, t);
    leaf(ctx, pt.x, pt.y, 28, quadTangent(p0, c, p1, t) + (i % 2 ? 1.1 : -1.1), color, true);
  }
  // buds
  [[96, 70], [64, 108], [128, 40]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.45);
    ctx.fill();
  });
}

function cornerBotanical(ctx: CanvasRenderingContext2D, color: string, r: () => number) {
  // two fine pressed-plant sprigs, one along each edge, line-only
  const sprig = (p0: Pt, c: Pt, p1: Pt, n: number) => {
    stem(ctx, p0, c, p1, color, 1.1);
    for (let i = 0; i < n; i++) {
      const t = 0.18 + (0.78 * i) / (n - 1);
      const pt = quad(p0, c, p1, t);
      const ang = quadTangent(p0, c, p1, t);
      const len = 30 - t * 10 + r() * 4;
      leaf(ctx, pt.x, pt.y, len, ang + 0.8, color, false);
      leaf(ctx, pt.x, pt.y, len, ang - 0.8, color, false);
    }
    const tip = quad(p0, c, p1, 1);
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(color, 0.6);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };
  sprig({ x: 10, y: 150 }, { x: 8, y: 60 }, { x: 42, y: 14 }, 5);
  sprig({ x: 70, y: 12 }, { x: 130, y: 6 }, { x: 188, y: 38 }, 5);
  // berries
  [[26, 176], [112, 26], [150, 26]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.3);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function cornerOrnament(ctx: CanvasRenderingContext2D, color: string) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(color, 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 150);
  ctx.lineTo(0, 22);
  ctx.quadraticCurveTo(0, 0, 22, 0);
  ctx.lineTo(150, 0);
  ctx.stroke();
  ctx.strokeStyle = rgba(color, 0.32);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(14, 96);
  ctx.lineTo(14, 30);
  ctx.quadraticCurveTo(14, 14, 30, 14);
  ctx.lineTo(96, 14);
  ctx.stroke();
  diamond(ctx, 0, 0, 9, color, 0.75);
  diamond(ctx, 0, 170, 4.5, color, 0.6);
  diamond(ctx, 170, 0, 4.5, color, 0.6);
  [[34, 34]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.6);
    ctx.fill();
  });
}

/* ---------- public ---------- */

const CORNER_FN: Partial<Record<DecorationId, (ctx: CanvasRenderingContext2D, color: string, r: () => number) => void>> = {
  leaves: cornerLeaves,
  flowers: cornerFlowers,
  botanical: cornerBotanical,
  ornaments: (ctx, color) => cornerOrnament(ctx, color),
};

function overlaps(x: number, y: number, pad: number, rects: Array<[number, number, number, number]>) {
  return rects.some(([rx, ry, rw, rh]) => x > rx - pad && x < rx + rw + pad && y > ry - pad && y < ry + rh + pad);
}

function drawStars(ctx: CanvasRenderingContext2D, color: string, r: () => number) {
  // Keep clear of the poem, the author name and the footer lock-up.
  const keepOut: Array<[number, number, number, number]> = [
    [110, 240, W - 220, 810],
    [240, 110, W - 480, 130],
    [300, 1050, W - 600, 230],
  ];
  let placed = 0;
  let guard = 0;
  while (placed < 30 && guard++ < 600) {
    const x = 70 + r() * (W - 140);
    const y = 70 + r() * (H - 140);
    if (overlaps(x, y, 18, keepOut)) continue;
    sparkle(ctx, x, y, 5 + r() * 12, color, 0.28 + r() * 0.32);
    placed++;
  }
  placed = 0;
  guard = 0;
  while (placed < 46 && guard++ < 900) {
    const x = 60 + r() * (W - 120);
    const y = 60 + r() * (H - 120);
    if (overlaps(x, y, 10, keepOut)) continue;
    ctx.beginPath();
    ctx.arc(x, y, 0.9 + r() * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.2 + r() * 0.3);
    ctx.fill();
    placed++;
  }
}

export function drawFrame(ctx: CanvasRenderingContext2D, theme: CardTheme) {
  if (theme.frame === 'none') return;
  ctx.save();
  const rr = (inset: number, radius: number) => {
    const x = inset;
    const y = inset;
    const w = W - inset * 2;
    const h = H - inset * 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  };
  if (theme.frame === 'double') {
    rr(INSET, 26);
    ctx.strokeStyle = rgba(theme.accent, 0.42);
    ctx.lineWidth = 2;
    ctx.stroke();
    rr(INSET + 14, 16);
    ctx.strokeStyle = rgba(theme.accent, 0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    rr(INSET + 4, 4);
    ctx.strokeStyle = rgba(theme.accent, 0.4);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/** Small ornamental rule: ——— ◆ ——— */
export function drawDivider(ctx: CanvasRenderingContext2D, theme: CardTheme, cx: number, y: number, half = 120) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(theme.accent, 0.45);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.lineTo(cx - 16, y);
  ctx.moveTo(cx + 16, y);
  ctx.lineTo(cx + half, y);
  ctx.stroke();
  diamond(ctx, cx, y, 6, theme.accent, 0.7);
  ctx.beginPath();
  ctx.arc(cx - half - 9, y, 2, 0, Math.PI * 2);
  ctx.arc(cx + half + 9, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = rgba(theme.accent, 0.5);
  ctx.fill();
  ctx.restore();
}

export function drawDecoration(ctx: CanvasRenderingContext2D, theme: CardTheme, decoration: DecorationId, seed: number) {
  if (decoration === 'none') return;
  const color = theme.accent;

  if (decoration === 'stars') {
    ctx.save();
    drawStars(ctx, theme.isDark ? '#ffffff' : color, mulberry32(seed ^ 0x51ed270b));
    ctx.restore();
    return;
  }

  const fn = CORNER_FN[decoration];
  if (!fn) return;
  const anchor = decoration === 'ornaments' ? INSET + 26 : INSET + 12;
  const corners: Array<[number, number, number, number]> = [
    [anchor, anchor, 1, 1],
    [W - anchor, anchor, -1, 1],
    [anchor, H - anchor, 1, -1],
    [W - anchor, H - anchor, -1, -1],
  ];
  // same seed for each corner so the four corners mirror each other exactly
  const base = (seed ^ 0x2545f491) >>> 0;
  corners.forEach(([x, y, sx, sy]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    fn(ctx, color, mulberry32(base));
    ctx.restore();
  });
}

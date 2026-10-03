import { CARD_HEIGHT, CARD_WIDTH } from './types';
import type { BackgroundId } from './types';

export interface CardTheme {
  id: BackgroundId;
  isDark: boolean;
  /** Poem and author text. */
  ink: string;
  /** Secondary text / hairlines. */
  muted: string;
  /** Brand accent used for ornaments, frame and the URL. */
  accent: string;
  /** Logo gradient stops. */
  logo: [string, string];
  /** Frame hairline style. */
  frame: 'double' | 'single' | 'none';
  /** Opacity of the big background watermark. */
  watermarkAlpha: number;
  /** Two colours for the picker swatch. */
  swatch: [string, string];
  paint: (ctx: CanvasRenderingContext2D, seed: number) => void;
}

const W = CARD_WIDTH;
const H = CARD_HEIGHT;

function linear(ctx: CanvasRenderingContext2D, a: string, b: string, c?: string) {
  const g = ctx.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, a);
  if (c) g.addColorStop(0.55, c);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function radial(ctx: CanvasRenderingContext2D, inner: string, outer: string, cy = H * 0.42) {
  const g = ctx.createRadialGradient(W / 2, cy, 60, W / 2, cy, H * 0.85);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function vignette(ctx: CanvasRenderingContext2D, rgb: string, strength: number) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.82);
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(1, `rgba(${rgb},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const THEMES: Record<BackgroundId, CardTheme> = {
  classic: {
    id: 'classic',
    isDark: false,
    ink: '#33241c',
    muted: '#8a6a58',
    accent: '#b4573a',
    logo: ['#c16a4b', '#a84c2e'],
    frame: 'double',
    watermarkAlpha: 0.055,
    swatch: ['#fffaf2', '#f6e8d4'],
    paint(ctx) {
      linear(ctx, '#fffaf3', '#f6e8d5', '#fcf3e6');
      vignette(ctx, '170,110,70', 0.1);
    },
  },
  cream: {
    id: 'cream',
    isDark: false,
    ink: '#3a2e1c',
    muted: '#8c7650',
    accent: '#97692c',
    logo: ['#b07a34', '#8a5a1f'],
    frame: 'double',
    watermarkAlpha: 0.06,
    swatch: ['#f8efd9', '#eedfba'],
    paint(ctx) {
      radial(ctx, '#faf2de', '#ecdcb6');
      vignette(ctx, '140,100,40', 0.1);
    },
  },
  paper: {
    id: 'paper',
    isDark: false,
    ink: '#2a2926',
    muted: '#7d776c',
    accent: '#7a5a3c',
    logo: ['#8d6a47', '#6b4b30'],
    frame: 'single',
    watermarkAlpha: 0.05,
    swatch: ['#f5f2ea', '#e4dfd2'],
    paint(ctx, seed) {
      ctx.fillStyle = '#f5f2ea';
      ctx.fillRect(0, 0, W, H);
      // Fine paper grain + a few long fibres, deterministic so preview and export match.
      const r = rng(seed ^ 0x9e3779b1);
      ctx.save();
      for (let i = 0; i < 5200; i++) {
        const x = r() * W;
        const y = r() * H;
        ctx.fillStyle = r() > 0.5 ? `rgba(120,105,80,${0.025 + r() * 0.05})` : `rgba(255,255,255,${0.15 + r() * 0.25})`;
        ctx.fillRect(x, y, 1 + r() * 1.6, 1 + r() * 1.6);
      }
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 70; i++) {
        const x = r() * W;
        const y = r() * H;
        ctx.strokeStyle = `rgba(120,105,80,${0.04 + r() * 0.05})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40, x + (r() - 0.5) * 70, y + (r() - 0.5) * 70);
        ctx.stroke();
      }
      ctx.restore();
      vignette(ctx, '110,95,70', 0.14);
    },
  },
  dark: {
    id: 'dark',
    isDark: true,
    ink: '#f2e9db',
    muted: '#a89c88',
    accent: '#d6ac5e',
    logo: ['#e0b86c', '#c4923f'],
    frame: 'double',
    watermarkAlpha: 0.04,
    swatch: ['#26242b', '#141317'],
    paint(ctx) {
      linear(ctx, '#232127', '#121115', '#1b1a1f');
      vignette(ctx, '0,0,0', 0.35);
    },
  },
  night: {
    id: 'night',
    isDark: true,
    ink: '#eaf0fb',
    muted: '#93a3c0',
    accent: '#c8b27c',
    logo: ['#d8c28c', '#b89a58'],
    frame: 'double',
    watermarkAlpha: 0.045,
    swatch: ['#243a63', '#0a1322'],
    paint(ctx) {
      radial(ctx, '#223457', '#091120', H * 0.3);
      vignette(ctx, '0,0,10', 0.3);
    },
  },
  warm: {
    id: 'warm',
    isDark: false,
    ink: '#3b2016',
    muted: '#8d5a43',
    accent: '#8f3f23',
    logo: ['#b0502f', '#8a3a1f'],
    frame: 'double',
    watermarkAlpha: 0.06,
    swatch: ['#f8e3cf', '#efc4a2'],
    paint(ctx) {
      linear(ctx, '#f9e6d3', '#eec3a0', '#f4d3b8');
      vignette(ctx, '150,70,30', 0.13);
    },
  },
  minimal: {
    id: 'minimal',
    isDark: false,
    ink: '#1d1d1f',
    muted: '#86868b',
    accent: '#8c8c91',
    logo: ['#c16a4b', '#a84c2e'],
    frame: 'none',
    watermarkAlpha: 0.045,
    swatch: ['#ffffff', '#f0f0f2'],
    paint(ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
    },
  },
};

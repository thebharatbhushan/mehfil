/** Reads the site's CSS variables (light or dark) so the canvas always matches the current theme. */

export interface Color {
  n: number; // 0xRRGGBB for Phaser
  css: string; // '#rrggbb'
}

export interface Palette {
  dark: boolean;
  bg: Color;
  card: Color;
  accent: Color;
  accentSoft: Color;
  accentText: Color; // accent used as text (lighter on dark)
  text: Color;
  muted: Color;
  border: Color;
  good: Color;
  bad: Color;
}

let probe: CanvasRenderingContext2D | null = null;

/** Any CSS colour (hex, rgb(a), hsl) -> opaque RGB, via a 1px canvas. */
export function parseColor(input: string, fallback = '#888888'): Color {
  try {
    probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!probe) throw new Error('no 2d context');
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = input || fallback;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    const n = (r << 16) | (g << 8) | b;
    return { n, css: `#${n.toString(16).padStart(6, '0')}` };
  } catch {
    const n = parseInt(fallback.slice(1), 16);
    return { n, css: fallback };
  }
}

export function readPalette(): Palette {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const dark = root.getAttribute('data-theme') === 'dark';
  return {
    dark,
    bg: parseColor(v('--bg'), dark ? '#14100d' : '#fef9f2'),
    card: parseColor(v('--card-bg'), dark ? '#1f1915' : '#fffdf8'),
    accent: parseColor(v('--accent'), '#a85a3f'),
    accentSoft: parseColor(v('--accent-soft'), dark ? '#4a2f24' : '#e8c8ba'),
    accentText: parseColor(v('--accent-fg') || v('--accent-dark'), dark ? '#e8a283' : '#9e4f36'),
    text: parseColor(v('--text-dark'), dark ? '#f0e7de' : '#2c241f'),
    muted: parseColor(v('--text-muted'), dark ? '#b5a698' : '#756256'),
    border: parseColor(v('--border-light'), dark ? '#3a312b' : '#e2d6ca'),
    good: parseColor(dark ? '#6fc28a' : '#2f7d4a'),
    bad: parseColor(dark ? '#e57c72' : '#b3392f'),
  };
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

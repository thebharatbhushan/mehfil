import type { Entry } from '@/lib/game/couplets';
import type { Palette } from './theme';

/** Logical canvas size. The wrapper's CSS aspect-ratio (3 / 5) matches it, so the DOM overlay and the canvas line up exactly. */
export const GAME_W = 480;
export const GAME_H = 800;

/** Shared with every scene through game.registry. */
export interface GameContext {
  entries: Entry[];
  usedFallback: boolean;
  /** Absolutely-positioned DOM layer on top of the canvas (sher text, options, buttons). Managed by the scenes. */
  overlay: HTMLElement;
  palette: () => Palette;
}

export const CTX_KEY = 'ctx';
export const THEME_EVENT = 'mehfil-game-theme';

export const FONT_UI = "'Noto Serif Devanagari', 'Lora', Georgia, serif";

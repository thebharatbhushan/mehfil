/** Best scores in localStorage (one small JSON value, no personal data). Every access is wrapped: private mode / blocked storage must never break the game. */
const KEY = 'mehfil_game_best_v1';

export type GameMode = 'antakshari' | 'complete';

function readAll(): Partial<Record<GameMode, number>> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getBestScore(mode: GameMode): number {
  const v = Number(readAll()[mode]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** Saves `score` if it beats the stored best. Returns the best after the call and whether this score set a new one. */
export function saveBestScore(mode: GameMode, score: number): { best: number; isNew: boolean } {
  const prev = getBestScore(mode);
  if (score <= prev) return { best: prev, isNew: false };
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [mode]: score }));
  } catch {
    /* storage unavailable: the score still shows on the result screen */
  }
  return { best: score, isNew: score > 0 };
}

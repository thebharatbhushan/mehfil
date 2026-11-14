/** Best score for "शेर पहचानिए" in localStorage (one small number, no personal data). Separate key from the other game; every access is guarded. */
const KEY = 'mehfil_poet_game_best_v1';

export function getBest(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number): { best: number; isNew: boolean } {
  const prev = getBest();
  if (score <= prev) return { best: prev, isNew: false };
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    /* storage unavailable: the score still shows on the result screen */
  }
  return { best: score, isNew: true };
}

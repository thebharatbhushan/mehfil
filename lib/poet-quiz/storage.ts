/** Best score for "शायर की पहचान" in localStorage (one small number, no personal data). Own key; every access is guarded. */
const KEY = 'mehfil_poet_quiz_best_v1';

export function saveBest(score: number): { best: number; isNew: boolean } {
  let prev = 0;
  try {
    const v = Number(localStorage.getItem(KEY));
    prev = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    /* storage unavailable */
  }
  if (score <= prev) return { best: prev, isNew: false };
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    /* the score still shows on the result screen */
  }
  return { best: score, isNew: true };
}

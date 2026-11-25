/** Weekly writing streak returned by the Mehfil API on profile responses (weeks only, never XP or counts of likes). */
export interface WriterStreak {
  current: number;
  longest: number;
  wroteThisWeek: boolean;
  atRisk: boolean;
  milestone?: { weeks: number; key: string; label: string } | null;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** Only known, well-typed fields ever reach the UI. Returns null when there is no active streak to show. */
export function sanitizeStreak(input: unknown): WriterStreak | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as Record<string, unknown>;
  const current = num(s.current);
  const m = s.milestone as Record<string, unknown> | null | undefined;
  return {
    current,
    longest: Math.max(num(s.longest), current),
    wroteThisWeek: s.wroteThisWeek === true,
    atRisk: s.atRisk === true,
    milestone: m && typeof m.label === 'string' && num(m.weeks) ? { weeks: num(m.weeks), key: String(m.key ?? ''), label: m.label } : null,
  };
}

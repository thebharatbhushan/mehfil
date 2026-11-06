/**
 * Pure game rules for Sher Antakshari (no Phaser, no DOM), so they can be unit-tested with plain `node --test`.
 */
import { normalizeForMatch } from './akshar';
import type { Entry } from './couplets';

export type Rng = () => number;

export interface Scoring {
  points: number;
  streakBonus: number;
  streakAfter: number;
}
export interface AntakshariConfig extends Scoring {
  rounds: number;
  seconds: number;
}
export interface CompleteConfig extends Scoring {
  questions: number;
  seconds: number;
}

export const ANTAKSHARI: AntakshariConfig = { rounds: 5, seconds: 20, points: 10, streakBonus: 5, streakAfter: 3 };
export const COMPLETE: CompleteConfig = { questions: 10, seconds: 15, points: 10, streakBonus: 5, streakAfter: 3 };

/* ---------------------------------- helpers --------------------------------- */

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pickOne = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

export const FUZZY_THRESHOLD = 0.78;

/**
 * Best dataset match for what the player typed: compared with line 1 and with the whole sher, and a long enough
 * typed beginning of the sher also counts (so the player can type just the first few words).
 */
export function findTypedMatch(pool: readonly Entry[], typed: string, threshold = FUZZY_THRESHOLD): { entry: Entry; score: number } | null {
  const t = normalizeForMatch(typed);
  if (t.length < 3) return null;
  let best: { entry: Entry; score: number } | null = null;
  for (const e of pool) {
    let score = Math.max(similarity(t, e.k1), similarity(t, e.kfull));
    if (t.length >= 8 && (e.k1.startsWith(t) || e.kfull.startsWith(t))) score = Math.max(score, 0.95);
    if (score >= threshold && (!best || score > best.score)) best = { entry: e, score };
  }
  return best;
}

/** Streak rule shared by both modes: +points per correct answer, +bonus from the 3rd correct answer in a row on. */
function award(streakAfterHit: number, cfg: Scoring) {
  return { points: cfg.points, bonus: streakAfterHit >= cfg.streakAfter ? cfg.streakBonus : 0 };
}

/* ------------------------------ Mode 1: Antakshari --------------------------- */

export type AnswerResult =
  | { kind: 'correct'; entry: Entry; points: number; bonus: number }
  | { kind: 'wrong_akshar'; entry: Entry } // a real sher from the dataset, but it starts with another akshar
  | { kind: 'used'; entry: Entry } // already played in this game
  | { kind: 'no_match' };

export class AntakshariGame {
  readonly rounds: number;
  readonly seconds: number;
  round = 0; // 1-based once begin() has run
  score = 0;
  streak = 0;
  correct = 0;
  roundsWon = 0; // rounds where the computer had no reply
  over = false;
  current!: Entry; // the sher the player has to answer
  private used = new Set<string>();
  private optionIds: string[] = [];
  private readonly pool: readonly Entry[];
  private readonly rng: Rng;
  private readonly cfg: AntakshariConfig;

  // (no constructor parameter properties: Node's built-in type stripping, used by the tests, does not support them)
  constructor(pool: readonly Entry[], rng: Rng = Math.random, cfg: AntakshariConfig = ANTAKSHARI) {
    this.pool = pool;
    this.rng = rng;
    this.cfg = cfg;
    this.rounds = cfg.rounds;
    this.seconds = cfg.seconds;
  }

  /** A game needs at least one sher that can be answered by another one. */
  static canPlay(pool: readonly Entry[]): boolean {
    return pool.some((a) => pool.some((b) => b.id !== a.id && b.first === a.last));
  }

  get required(): string {
    return this.current.last;
  }

  /** Unused couplets that start with the last akshar of `of` (not `of` itself). */
  continuations(of: Entry): Entry[] {
    return this.pool.filter((e) => e.id !== of.id && !this.used.has(e.id) && e.first === of.last);
  }

  /** Starts round 1. Returns false when the data cannot support a game. */
  begin(): boolean {
    this.round = 1;
    this.over = false;
    const first = this.freshStart();
    if (!first) {
      this.over = true;
      return false;
    }
    this.setCurrent(first);
    return true;
  }

  /** Up to 4 shown choices: 1-2 valid answers and the rest start with a different akshar. */
  options(): Entry[] {
    const valid = shuffle(this.continuations(this.current), this.rng);
    const takeValid = Math.min(valid.length, this.rng() < 0.3 ? 2 : 1);
    const chosen = valid.slice(0, takeValid);
    const distractors = shuffle(
      this.pool.filter((e) => e.id !== this.current.id && !this.used.has(e.id) && e.first !== this.required),
      this.rng,
    ).slice(0, 4 - chosen.length);
    const all = shuffle([...chosen, ...distractors], this.rng);
    this.optionIds = all.map((e) => e.id);
    return all;
  }

  answerByPick(id: string): AnswerResult {
    const entry = this.pool.find((e) => e.id === id && this.optionIds.includes(e.id));
    if (!entry) return { kind: 'no_match' };
    return this.judge(entry);
  }

  answerByText(text: string): AnswerResult {
    const match = findTypedMatch(this.pool, text);
    return match ? this.judge(match.entry) : { kind: 'no_match' };
  }

  private judge(entry: Entry): AnswerResult {
    if (this.used.has(entry.id)) return { kind: 'used', entry };
    if (entry.first !== this.required) return { kind: 'wrong_akshar', entry };
    this.used.add(entry.id);
    this.streak += 1;
    this.correct += 1;
    const { points, bonus } = award(this.streak, this.cfg);
    this.score += points + bonus;
    return { kind: 'correct', entry, points, bonus };
  }

  /** Wrong pick or timeout: streak resets. Returns a sher that would have been right (to show), if any. */
  fail(): Entry | null {
    this.streak = 0;
    const options = this.continuations(this.current);
    return options.length ? pickOne(options, this.rng) : null;
  }

  /**
   * The computer's answer to the player's sher: an unused sher starting with the player's last akshar that the
   * player could in turn answer. null = the computer is stuck, so the player wins the round.
   */
  computerReply(player: Entry): Entry | null {
    const candidates = this.pool.filter((e) => e.id !== player.id && !this.used.has(e.id) && e.first === player.last);
    const playable = candidates.filter((c) =>
      this.pool.some((n) => n.id !== c.id && n.id !== player.id && !this.used.has(n.id) && n.first === c.last),
    );
    if (!playable.length) {
      this.roundsWon += 1;
      return null;
    }
    const reply = pickOne(playable, this.rng);
    this.used.add(reply.id);
    return reply;
  }

  /**
   * Moves to the next round. `reply` is the computer's sher to answer next; with no reply (computer stuck, or the
   * player missed the round) a fresh sher is dealt. Returns false when the game is over.
   */
  nextRound(reply: Entry | null): boolean {
    if (this.round >= this.rounds) {
      this.over = true;
      return false;
    }
    const next = reply ?? this.freshStart();
    if (!next) {
      this.over = true; // the pool is exhausted
      return false;
    }
    this.round += 1;
    this.setCurrent(next);
    return true;
  }

  private setCurrent(e: Entry) {
    this.current = e;
    this.used.add(e.id);
    this.optionIds = [];
  }

  /** A random unused sher the player can answer; if every sher was used, allow a recycle of the pool once. */
  private freshStart(): Entry | null {
    const answerable = () => this.pool.filter((e) => !this.used.has(e.id) && this.continuations(e).length > 0);
    let list = answerable();
    if (!list.length && this.used.size) {
      this.used.clear();
      list = answerable();
    }
    return list.length ? pickOne(list, this.rng) : null;
  }
}

/* --------------------------- Mode 2: Complete the sher ------------------------- */

export interface Question {
  entry: Entry;
  options: string[]; // second lines, shuffled
  correctIndex: number;
}

export class CompleteGame {
  readonly total: number;
  readonly seconds: number;
  readonly questions: Question[];
  index = 0; // index of the question currently shown
  score = 0;
  streak = 0;
  correct = 0;
  private readonly rng: Rng;
  private readonly cfg: CompleteConfig;

  constructor(pool: readonly Entry[], rng: Rng = Math.random, cfg: CompleteConfig = COMPLETE) {
    this.rng = rng;
    this.cfg = cfg;
    this.seconds = cfg.seconds;
    const picked = shuffle(pool, rng).slice(0, cfg.questions);
    this.questions = picked.map((e) => this.makeQuestion(e, pool));
    this.total = this.questions.length;
  }

  static canPlay(pool: readonly Entry[]): boolean {
    return new Set(pool.map((e) => normalizeForMatch(e.lines[1]))).size >= 4;
  }

  private makeQuestion(entry: Entry, pool: readonly Entry[]): Question {
    const correctText = entry.lines[1];
    const correctKey = normalizeForMatch(correctText);
    const seen = new Set([correctKey]);
    // Distractors are second lines of OTHER couplets; lines of a similar length are preferred so length gives nothing away.
    const others = shuffle(pool.filter((e) => e.id !== entry.id), this.rng)
      .filter((e) => {
        const k = normalizeForMatch(e.lines[1]);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => Math.abs(a.lines[1].length - correctText.length) - Math.abs(b.lines[1].length - correctText.length));
    const distractors = shuffle(others.slice(0, 8), this.rng).slice(0, 3).map((e) => e.lines[1]);
    const options = shuffle([correctText, ...distractors], this.rng);
    return { entry, options, correctIndex: options.indexOf(correctText) };
  }

  get current(): Question | null {
    return this.questions[this.index] ?? null;
  }

  get over(): boolean {
    return this.index >= this.total;
  }

  /** Records the answer for the current question (does not advance; call next()). */
  answer(optionIndex: number): { correct: boolean; points: number; bonus: number } {
    const q = this.current;
    if (!q || optionIndex !== q.correctIndex) {
      this.streak = 0;
      return { correct: false, points: 0, bonus: 0 };
    }
    this.streak += 1;
    this.correct += 1;
    const { points, bonus } = award(this.streak, this.cfg);
    this.score += points + bonus;
    return { correct: true, points, bonus };
  }

  timeout() {
    this.streak = 0;
  }

  next(): Question | null {
    this.index += 1;
    return this.current;
  }
}

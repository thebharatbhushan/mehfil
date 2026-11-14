/**
 * Pure game rules for "शेर पहचानिए" (Guess the Poet). No React, no DOM, so they can be unit-tested with plain `node --test`.
 * Questions live in questions.json; nothing here is hardcoded poetry.
 */

export type Rng = () => number;

export interface Poet {
  id: string;
  /** Devanagari display name */
  name: string;
  /** Latin-script name, shown as a small secondary label */
  en?: string;
}

export interface RawQuestion {
  id: string;
  /** id of the poet who wrote it (must exist in `poets`) */
  poet: string;
  lines: string[];
}

export interface QuestionBank {
  poets: Poet[];
  questions: RawQuestion[];
}

/** A ready-to-play question: four distinct poets, exactly one of them correct. */
export interface Question {
  id: string;
  lines: [string, string];
  options: Poet[];
  correctIndex: number;
}

export const QUESTIONS_PER_GAME = 10;
export const OPTION_COUNT = 4;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

/**
 * Validates untrusted data (a JSON file today, an API response tomorrow). Bad rows are dropped, never thrown on:
 * unknown poet, fewer than two non-empty lines, duplicate id, duplicate sher text.
 */
export function sanitizeBank(input: unknown): QuestionBank {
  const src = (input && typeof input === 'object' ? input : {}) as { poets?: unknown; questions?: unknown };
  const poets: Poet[] = [];
  const poetIds = new Set<string>();
  const poetNames = new Set<string>();
  for (const p of Array.isArray(src.poets) ? src.poets : []) {
    const id = clean(p?.id);
    const name = clean(p?.name);
    if (!id || !name || poetIds.has(id) || poetNames.has(name)) continue;
    poetIds.add(id);
    poetNames.add(name);
    const en = clean(p?.en);
    poets.push(en ? { id, name, en } : { id, name });
  }

  const questions: RawQuestion[] = [];
  const ids = new Set<string>();
  const texts = new Set<string>();
  for (const q of Array.isArray(src.questions) ? src.questions : []) {
    const id = clean(q?.id);
    const poet = clean(q?.poet);
    const lines = (Array.isArray(q?.lines) ? q.lines : []).map(clean).filter(Boolean);
    if (!id || ids.has(id) || !poetIds.has(poet) || lines.length < 2) continue;
    const text = lines.slice(0, 2).join(' ');
    if (texts.has(text)) continue;
    ids.add(id);
    texts.add(text);
    questions.push({ id, poet, lines: lines.slice(0, 2) });
  }
  return { poets, questions };
}

/** A game needs at least one question and enough distinct poets to fill four options. */
export function canPlay(bank: QuestionBank): boolean {
  return bank.questions.length > 0 && bank.poets.length >= OPTION_COUNT;
}

export function makeQuestion(raw: RawQuestion, poets: readonly Poet[], rng: Rng = Math.random): Question | null {
  const correct = poets.find((p) => p.id === raw.poet);
  if (!correct || raw.lines.length < 2) return null;
  const wrong = shuffle(poets.filter((p) => p.id !== correct.id), rng).slice(0, OPTION_COUNT - 1);
  if (wrong.length < OPTION_COUNT - 1) return null;
  const options = shuffle([correct, ...wrong], rng);
  return { id: raw.id, lines: [raw.lines[0], raw.lines[1]], options, correctIndex: options.findIndex((p) => p.id === correct.id) };
}

export class PoetGame {
  readonly questions: Question[];
  readonly total: number;
  index = 0;
  score = 0;
  private answered = false;

  constructor(bank: QuestionBank, rng: Rng = Math.random, perGame: number = QUESTIONS_PER_GAME) {
    // The bank is sampled without replacement, so a sher can never repeat inside one game.
    const picked = shuffle(bank.questions, rng).slice(0, perGame);
    this.questions = picked.map((q) => makeQuestion(q, bank.poets, rng)).filter((q): q is Question => q !== null);
    this.total = this.questions.length;
  }

  get current(): Question | null {
    return this.questions[this.index] ?? null;
  }

  get over(): boolean {
    return this.index >= this.total;
  }

  /** Records the answer once per question; repeated calls (double taps) are ignored. */
  answer(optionIndex: number): { correct: boolean; alreadyAnswered: boolean } {
    const q = this.current;
    if (!q || this.answered) return { correct: false, alreadyAnswered: true };
    this.answered = true;
    const correct = optionIndex === q.correctIndex;
    if (correct) this.score += 1;
    return { correct, alreadyAnswered: false };
  }

  /** Moves on; returns false when there are no more questions. */
  next(): boolean {
    if (!this.answered) return !this.over;
    this.index += 1;
    this.answered = false;
    return !this.over;
  }
}

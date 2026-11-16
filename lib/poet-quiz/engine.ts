/**
 * Pure game rules for "शायर की पहचान" (Poet Quiz). No React, no DOM, so they can be unit-tested with plain `node --test`.
 * The questions live in questions.json; nothing here is hardcoded literary content.
 */

export type Rng = () => number;
export type Level = 'easy' | 'medium' | 'hard';
export type Category = 'clue' | 'work' | 'takhallus' | 'style' | 'history';

export const CATEGORIES: Category[] = ['clue', 'work', 'takhallus', 'style', 'history'];
export const CATEGORY_LABEL: Record<Category, string> = {
  clue: 'शायर की पहचान',
  work: 'रचना और रचनाकार',
  takhallus: 'तख़ल्लुस / उपनाम',
  style: 'शैली और धारा',
  history: 'साहित्य-इतिहास',
};

export interface Question {
  id: string;
  category: Category;
  level: Level;
  question: string;
  answer: string;
  wrong: string[];
  explanation: string;
  /** where an editor can verify the fact */
  source?: string;
}

export interface Round {
  q: Question;
  options: string[];
  correctIndex: number;
}

export const QUESTIONS_PER_GAME = 10;
export const MIN_QUESTIONS = 5;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : '');
const LEVELS: Level[] = ['easy', 'medium', 'hard'];

/**
 * Validates untrusted data (a JSON file today, an API response tomorrow). Bad rows are dropped, never thrown on:
 * inactive, marked `disputed`, unknown category, missing question/answer/explanation, not exactly three distinct wrong
 * options, a wrong option equal to the answer, duplicate id or duplicate question text.
 */
export function sanitizeQuestions(input: unknown): Question[] {
  const src = (input && typeof input === 'object' ? (input as { questions?: unknown }).questions : input) as unknown;
  const out: Question[] = [];
  const ids = new Set<string>();
  const texts = new Set<string>();
  for (const r of Array.isArray(src) ? src : []) {
    if (!r || r.active === false || r.disputed === true) continue;
    const id = clean(r.id);
    const question = clean(r.question);
    const answer = clean(r.answer);
    const explanation = clean(r.explanation);
    const wrong = (Array.isArray(r.wrong) ? r.wrong : []).map(clean).filter(Boolean);
    if (!id || !question || !answer || !explanation || ids.has(id) || texts.has(question)) continue;
    if (!CATEGORIES.includes(r.category)) continue;
    if (wrong.length !== 3 || new Set([answer, ...wrong]).size !== 4) continue;
    ids.add(id);
    texts.add(question);
    const q: Question = { id, category: r.category, level: LEVELS.includes(r.level) ? r.level : 'medium', question, answer, wrong, explanation };
    const source = clean(r.source);
    if (source) q.source = source;
    out.push(q);
  }
  return out;
}

export function canPlay(qs: readonly Question[]): boolean {
  return qs.length >= MIN_QUESTIONS;
}

export function makeRound(q: Question, rng: Rng = Math.random): Round {
  const options = shuffle([q.answer, ...q.wrong], rng);
  return { q, options, correctIndex: options.indexOf(q.answer) };
}

/**
 * Picks questions for one game without repeats and with a mix of question types: the bank is shuffled inside each
 * category and the categories are then dealt out round-robin (in random category order), so a 10-question game
 * spreads over all five types when the bank has them.
 */
export function pickMixed(qs: readonly Question[], count: number, rng: Rng = Math.random): Question[] {
  const buckets = shuffle(CATEGORIES, rng)
    .map((c) => shuffle(qs.filter((q) => q.category === c), rng))
    .filter((b) => b.length > 0);
  const picked: Question[] = [];
  while (picked.length < count && buckets.some((b) => b.length > 0)) {
    for (const b of buckets) {
      const q = b.shift();
      if (q && picked.length < count) picked.push(q);
    }
  }
  return shuffle(picked, rng);
}

export interface CategoryStat {
  attempted: number;
  correct: number;
}

export class PoetQuiz {
  readonly rounds: Round[];
  readonly total: number;
  index = 0;
  score = 0;
  attempted = 0;
  readonly byCategory: Partial<Record<Category, CategoryStat>> = {};
  private answered = false;

  constructor(qs: readonly Question[], rng: Rng = Math.random, perGame: number = QUESTIONS_PER_GAME) {
    this.rounds = pickMixed(qs, perGame, rng).map((q) => makeRound(q, rng));
    this.total = this.rounds.length;
  }

  get current(): Round | null {
    return this.rounds[this.index] ?? null;
  }
  get over(): boolean {
    return this.index >= this.total;
  }

  /** One answer per question; later calls (double taps) change nothing. */
  answer(optionIndex: number): { correct: boolean; alreadyAnswered: boolean } {
    const r = this.current;
    if (!r || this.answered) return { correct: false, alreadyAnswered: true };
    this.answered = true;
    this.attempted += 1;
    const correct = optionIndex === r.correctIndex;
    if (correct) this.score += 1;
    const s = (this.byCategory[r.q.category] ??= { attempted: 0, correct: 0 });
    s.attempted += 1;
    if (correct) s.correct += 1;
    return { correct, alreadyAnswered: false };
  }

  /** Moves on after an answer; returns false when the game is over. Does nothing before the question is answered. */
  next(): boolean {
    if (!this.answered) return !this.over;
    this.index += 1;
    this.answered = false;
    return !this.over;
  }
}

/** Short Hindi verdict for the final screen. */
export function performance(score: number, total: number): string {
  const r = total > 0 ? score / total : 0;
  if (r >= 0.9) return 'कमाल! आप तो अदब के सच्चे जानकार हैं।';
  if (r >= 0.7) return 'बहुत अच्छे! शायरों और कवियों की अच्छी पहचान है।';
  if (r >= 0.4) return 'अच्छी कोशिश! थोड़ा और पढ़िए और फिर आइए।';
  return 'कोई बात नहीं, फिर खेलिए और नए नाम जानिए।';
}

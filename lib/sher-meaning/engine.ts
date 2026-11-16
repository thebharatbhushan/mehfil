/**
 * Pure game rules for "शायरी का मतलब" (Decode the Sher). No React, no DOM, so they can be unit-tested with plain `node --test`.
 * The shers and their interpretations live in questions.json; nothing here is hardcoded literary content.
 */

export type Rng = () => number;
export type Level = 'easy' | 'medium' | 'hard';

export interface Vocab {
  word: string;
  meaning: string;
}

export interface Question {
  id: string;
  poet: string;
  poetEn?: string;
  lines: string[];
  /** the best-supported interpretation */
  answer: string;
  /** three plausible but less accurate readings */
  wrong: string[];
  explanation: string;
  vocab: Vocab[];
  level: Level;
  /** where an editor can verify the reading */
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
 * inactive, flagged `contested` (a genuinely ambiguous sher is kept out of scored play), missing poet/lines/explanation,
 * not exactly three distinct wrong readings, a wrong reading equal to the answer, duplicate id or duplicate sher.
 */
export function sanitizeQuestions(input: unknown): Question[] {
  const src = (input && typeof input === 'object' ? (input as { questions?: unknown }).questions : input) as unknown;
  const out: Question[] = [];
  const ids = new Set<string>();
  const texts = new Set<string>();
  for (const r of Array.isArray(src) ? src : []) {
    if (!r || r.active === false || r.contested === true) continue;
    const id = clean(r.id);
    const poet = clean(r.poet);
    const lines = (Array.isArray(r.lines) ? r.lines : []).map(clean).filter(Boolean);
    const answer = clean(r.answer);
    const explanation = clean(r.explanation);
    const wrong = (Array.isArray(r.wrong) ? r.wrong : []).map(clean).filter(Boolean);
    if (!id || !poet || !answer || !explanation || lines.length < 2 || ids.has(id)) continue;
    if (wrong.length !== 3 || new Set([answer, ...wrong]).size !== 4) continue;
    const text = lines.join(' ');
    if (texts.has(text)) continue;
    ids.add(id);
    texts.add(text);
    const vocab: Vocab[] = (Array.isArray(r.vocab) ? r.vocab : [])
      .map((v: { word?: unknown; meaning?: unknown }) => ({ word: clean(v?.word), meaning: clean(v?.meaning) }))
      .filter((v: Vocab) => v.word && v.meaning);
    const q: Question = { id, poet, lines, answer, wrong, explanation, vocab, level: LEVELS.includes(r.level) ? r.level : 'medium' };
    const poetEn = clean(r.poetEn);
    const source = clean(r.source);
    if (poetEn) q.poetEn = poetEn;
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

export class DecodeGame {
  readonly rounds: Round[];
  readonly total: number;
  index = 0;
  score = 0;
  attempted = 0;
  private answered = false;

  constructor(qs: readonly Question[], rng: Rng = Math.random, perGame: number = QUESTIONS_PER_GAME) {
    // Sampled without replacement: a sher never repeats inside one game.
    this.rounds = shuffle(qs, rng).slice(0, perGame).map((q) => makeRound(q, rng));
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
  if (r >= 0.9) return 'कमाल! आप शेर की गहराई तक पहुँचते हैं।';
  if (r >= 0.7) return 'बहुत अच्छे! शेरों की आपकी समझ अच्छी है।';
  if (r >= 0.4) return 'अच्छी कोशिश! शेरों को थोड़ा और ठहरकर पढ़िए।';
  return 'कोई बात नहीं, फिर खेलिए और शेरों के मायने जानिए।';
}

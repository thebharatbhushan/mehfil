/**
 * Pure game rules for "ग़लती पकड़िए" (Spot the Mistake). No React, no DOM, so they can be unit-tested with plain `node --test`.
 * Each question stores the verified original sher, the modified sher and the exact position of the one replaced word
 * (line + word index), so a repeated word is judged by position, never by its text.
 */

export type Rng = () => number;

export interface Mistake {
  /** 0-based line */
  line: number;
  /** 0-based word index inside that line */
  index: number;
  original: string;
  replacement: string;
}

export interface Question {
  id: string;
  poet: string;
  poetEn?: string;
  /** verified original sher, line by line */
  original: string[];
  /** the sher shown to the player: identical to `original` except for one word */
  modified: string[];
  mistake: Mistake;
  note?: string;
}

/** A word on the screen. `id` is unique per question and position. */
export interface Token {
  id: string;
  line: number;
  index: number;
  text: string;
}

export const QUESTIONS_PER_GAME = 10;
export const MIN_QUESTIONS = 5;
export const POINTS_PER_CORRECT = 1;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

/** Comparison form of a word: Unicode-normalised, zero-width marks removed. */
export const wordKey = (w: string) => w.normalize('NFC').replace(/[​-‍﻿]/g, '').trim();

export const words = (line: string): string[] => line.split(/\s+/).filter(Boolean);

/** The words of the modified sher as tokens with unique ids, line by line. */
export function tokensOf(q: Pick<Question, 'id' | 'modified'>): Token[][] {
  return q.modified.map((line, l) => words(line).map((text, index) => ({ id: `${q.id}:${l}:${index}`, line: l, index, text })));
}

export function mistakeTokenId(q: Pick<Question, 'id' | 'mistake'>): string {
  return `${q.id}:${q.mistake.line}:${q.mistake.index}`;
}

/**
 * Validates untrusted data (a JSON file today, an API response tomorrow). Bad rows are dropped, never thrown on.
 * A row is kept only if the modified sher differs from the original in exactly one word, at exactly the stored
 * position, and that word is the stored replacement: i.e. the stored data proves the question is well-formed.
 */
export function sanitizeQuestions(input: unknown): Question[] {
  const src = (input && typeof input === 'object' ? (input as { questions?: unknown }).questions : input) as unknown;
  const out: Question[] = [];
  const ids = new Set<string>();
  const texts = new Set<string>();
  for (const r of Array.isArray(src) ? src : []) {
    if (!r || r.active === false) continue;
    const id = clean(r.id);
    const poet = clean(r.poet);
    const original = (Array.isArray(r.original) ? r.original : []).map(clean).filter(Boolean);
    const modified = (Array.isArray(r.modified) ? r.modified : []).map(clean).filter(Boolean);
    const m = r.mistake;
    if (!id || !poet || ids.has(id) || original.length < 2 || original.length !== modified.length || !m) continue;
    const line = Number(m.line);
    const index = Number(m.index);
    if (!Number.isInteger(line) || !Number.isInteger(index) || line < 0 || line >= original.length || index < 0) continue;

    // exactly one differing word, at the stored position
    let diffs = 0;
    let shape = true;
    let at: { line: number; index: number; o: string; m: string } | null = null;
    for (let l = 0; l < original.length; l++) {
      const o = words(original[l]);
      const n = words(modified[l]);
      if (o.length !== n.length) {
        shape = false;
        break;
      }
      for (let i = 0; i < o.length; i++) {
        if (wordKey(o[i]) !== wordKey(n[i])) {
          diffs += 1;
          at = { line: l, index: i, o: o[i], m: n[i] };
        }
      }
    }
    if (!shape || diffs !== 1 || !at || at.line !== line || at.index !== index) continue;
    if (wordKey(at.o) !== wordKey(clean(m.original)) || wordKey(at.m) !== wordKey(clean(m.replacement))) continue;

    const text = original.join(' ');
    if (texts.has(text)) continue;
    ids.add(id);
    texts.add(text);
    const q: Question = { id, poet, original, modified, mistake: { line, index, original: at.o, replacement: at.m } };
    const poetEn = clean(r.poetEn);
    const note = clean(r.note);
    if (poetEn) q.poetEn = poetEn;
    if (note) q.note = note;
    out.push(q);
  }
  return out;
}

export function canPlay(qs: readonly Question[]): boolean {
  return qs.length >= MIN_QUESTIONS;
}

export interface CheckResult {
  correct: boolean;
  points: number;
  /** false when ignored: nothing selected, or the question was already checked */
  counted: boolean;
}

export class MistakeGame {
  readonly questions: Question[];
  readonly total: number;
  index = 0;
  score = 0;
  /** questions answered so far */
  attempted = 0;
  correctCount = 0;
  /** id of the word the player has picked (changeable until "जाँचिए") */
  selected: string | null = null;
  checked = false;
  lastCorrect = false;

  constructor(qs: readonly Question[], rng: Rng = Math.random, perGame: number = QUESTIONS_PER_GAME) {
    // Sampled without replacement: a sher never repeats inside one game.
    this.questions = shuffle(qs, rng).slice(0, perGame);
    this.total = this.questions.length;
  }

  get current(): Question | null {
    return this.questions[this.index] ?? null;
  }
  get over(): boolean {
    return this.index >= this.total;
  }

  /** Picks (or, tapping the same word again, un-picks) a word. Locked after "जाँचिए". */
  select(tokenId: string): boolean {
    const q = this.current;
    if (!q || this.checked) return false;
    if (!tokensOf(q).some((line) => line.some((t) => t.id === tokenId))) return false;
    this.selected = this.selected === tokenId ? null : tokenId;
    return true;
  }

  /** One check per question, no retry; points only for the right position. */
  check(): CheckResult {
    const q = this.current;
    if (!q || this.checked || !this.selected) return { correct: false, points: 0, counted: false };
    this.checked = true;
    this.attempted += 1;
    this.lastCorrect = this.selected === mistakeTokenId(q);
    const points = this.lastCorrect ? POINTS_PER_CORRECT : 0;
    if (this.lastCorrect) this.correctCount += 1;
    this.score += points;
    return { correct: this.lastCorrect, points, counted: true };
  }

  /** Next sher after checking; returns false when the game is over. Does nothing before the question is checked. */
  next(): boolean {
    if (!this.checked) return !this.over;
    this.index += 1;
    this.selected = null;
    this.checked = false;
    this.lastCorrect = false;
    return !this.over;
  }
}

/** Short Hindi verdict for the final screen. */
export function performance(score: number, total: number): string {
  const r = total > 0 ? score / total : 0;
  if (r >= 0.9) return 'कमाल! आपकी नज़र से कोई ग़लती नहीं बचती।';
  if (r >= 0.7) return 'बहुत अच्छे! शेरों पर आपकी पकड़ मज़बूत है।';
  if (r >= 0.4) return 'अच्छी कोशिश! शेर थोड़ा और पढ़िए।';
  return 'कोई बात नहीं, फिर खेलिए और शेर याद कीजिए।';
}

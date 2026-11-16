/**
 * Pure game rules for "अल्फ़ाज़ सजाइए" (Arrange the Words). No React, no DOM, so they can be unit-tested with plain `node --test`.
 * The shers live in shers.json; nothing here is hardcoded poetry.
 *
 * Every word tile has its own unique id (`<sher id>:<position>`), so a repeated word ("आगे आगे", "है … है") is two
 * independent tiles. The answer is checked by comparing the whole arranged sequence with the original, word by word.
 */

export type Rng = () => number;
export type Level = 'easy' | 'medium' | 'hard';

export interface Sher {
  id: string;
  lines: string[];
  poet: string;
  poetEn?: string;
  language?: string;
  level: Level;
  meaning?: string;
}

export interface Tile {
  id: string;
  text: string;
}

export interface Puzzle {
  sher: Sher;
  /** first line, shown as the clue */
  given: string;
  /** tiles in the original order */
  original: Tile[];
  /** the same tiles, shuffled */
  shuffled: Tile[];
}

export const SHERS_PER_GAME = 5;
export const MIN_SHERS = 3;
export const POINTS = { first: 10, second: 5, later: 2 } as const;
/** "उत्तर देखिए" is offered after this many wrong checks */
export const REVEAL_AFTER = 2;

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

/** Comparison key of a word: Unicode-normalised, with harmless punctuation (quotes, commas, danda, dashes at the ends) removed. */
export function wordKey(text: string): string {
  return text
    .normalize('NFC')
    .replace(/^[\s'"‘’“”`.,;:!?।॥…\-–—()\[\]]+|[\s'"‘’“”`.,;:!?।॥…\-–—()\[\]]+$/gu, '')
    .replace(/[​-‍﻿]/g, '');
}

/** The sher is shown with its first line given; only the words of the remaining line(s) are shuffled for the player to arrange. */
export const givenLine = (lines: readonly string[]): string => lines[0] ?? '';
export const hiddenLines = (lines: readonly string[]): string[] => lines.slice(1);

/** Words of a line (or lines) in original order (split on any whitespace, so extra spaces never create empty tiles). */
export function tokenize(lines: readonly string[]): string[] {
  return lines.flatMap((l) => l.split(/\s+/)).filter(Boolean);
}

/**
 * Validates untrusted data (a JSON file today, an API response tomorrow). Bad rows are dropped, never thrown on:
 * inactive, missing poet, fewer than two lines, fewer than three words in the line to arrange, duplicate id or duplicate sher text.
 */
export function sanitizeShers(input: unknown): Sher[] {
  const src = (input && typeof input === 'object' ? (input as { shers?: unknown }).shers : input) as unknown;
  const out: Sher[] = [];
  const ids = new Set<string>();
  const texts = new Set<string>();
  for (const r of Array.isArray(src) ? src : []) {
    if (!r || r.active === false) continue;
    const id = clean(r.id);
    const poet = clean(r.poet);
    const lines = (Array.isArray(r.lines) ? r.lines : []).map(clean).filter(Boolean);
    if (!id || !poet || lines.length < 2 || ids.has(id)) continue;
    const words = tokenize(hiddenLines(lines));
    const text = tokenize(lines).map(wordKey).join(' ');
    if (words.length < 3 || words.some((w) => !wordKey(w)) || texts.has(text)) continue;
    ids.add(id);
    texts.add(text);
    const s: Sher = { id, lines, poet, level: LEVELS.includes(r.level) ? r.level : 'medium' };
    for (const k of ['poetEn', 'language', 'meaning'] as const) {
      const v = clean(r[k]);
      if (v) s[k] = v;
    }
    out.push(s);
  }
  return out;
}

export function canPlay(shers: readonly Sher[]): boolean {
  return shers.length >= MIN_SHERS;
}

/** Shuffles the tiles; re-shuffles (a bounded number of times) so the result is not already the original order. */
export function makePuzzle(sher: Sher, rng: Rng = Math.random): Puzzle {
  const original: Tile[] = tokenize(hiddenLines(sher.lines)).map((text, i) => ({ id: `${sher.id}:${i}`, text }));
  const key = (ts: readonly Tile[]) => ts.map((t) => wordKey(t.text)).join('\u0001');
  const target = key(original);
  let shuffled = shuffle(original, rng);
  for (let i = 0; i < 25 && key(shuffled) === target; i++) shuffled = shuffle(original, rng);
  return { sher, given: givenLine(sher.lines), original, shuffled };
}

export type Status = 'playing' | 'correct' | 'revealed';

export interface CheckResult {
  correct: boolean;
  /** how many tiles sit at the right position */
  rightPlace: number;
  total: number;
  points: number;
  attempts: number;
  /** false when the check was ignored (board incomplete or question already finished) */
  counted: boolean;
}

export interface QuestionRecord {
  id: string;
  attempts: number;
  points: number;
  status: Status;
}

export class ArrangeGame {
  readonly puzzles: Puzzle[];
  readonly total: number;
  index = 0;
  score = 0;
  /** ids of the tiles currently in the answer area, in order */
  placed: string[] = [];
  attempts = 0;
  status: Status = 'playing';
  readonly records: QuestionRecord[] = [];

  constructor(shers: readonly Sher[], rng: Rng = Math.random, perGame: number = SHERS_PER_GAME) {
    // Sampled without replacement: a sher never repeats inside one game.
    this.puzzles = shuffle(shers, rng).slice(0, perGame).map((s) => makePuzzle(s, rng));
    this.total = this.puzzles.length;
  }

  get current(): Puzzle | null {
    return this.puzzles[this.index] ?? null;
  }
  get over(): boolean {
    return this.index >= this.total;
  }
  get locked(): boolean {
    return this.status !== 'playing';
  }
  get correctCount(): number {
    return this.records.filter((r) => r.status === 'correct').length;
  }
  get totalAttempts(): number {
    return this.records.reduce((n, r) => n + r.attempts, 0);
  }
  get complete(): boolean {
    return !!this.current && this.placed.length === this.current.original.length;
  }
  /** Tiles still in the shuffled area, in their shuffled order. */
  get pool(): Tile[] {
    const c = this.current;
    return c ? c.shuffled.filter((t) => !this.placed.includes(t.id)) : [];
  }
  /** Tiles in the answer area, in order. */
  get answer(): Tile[] {
    const c = this.current;
    if (!c) return [];
    const byId = new Map(c.shuffled.map((t) => [t.id, t]));
    return this.placed.map((id) => byId.get(id)!).filter(Boolean);
  }

  private known(id: string): boolean {
    return !!this.current?.shuffled.some((t) => t.id === id);
  }

  /** Puts a tile into the answer area at `index` (default: the end). A tile that is already placed is moved there instead. */
  place(id: string, index?: number): boolean {
    if (this.locked || !this.known(id)) return false;
    const rest = this.placed.filter((p) => p !== id);
    const at = index === undefined ? rest.length : Math.max(0, Math.min(index, rest.length));
    rest.splice(at, 0, id);
    this.placed = rest;
    return true;
  }

  /** Sends a placed tile back to the shuffled area. */
  remove(id: string): boolean {
    if (this.locked || !this.placed.includes(id)) return false;
    this.placed = this.placed.filter((p) => p !== id);
    return true;
  }

  /** Moves a placed tile one step (-1 = earlier, +1 = later). */
  nudge(id: string, delta: -1 | 1): boolean {
    const i = this.placed.indexOf(id);
    if (this.locked || i < 0) return false;
    const j = i + delta;
    if (j < 0 || j >= this.placed.length) return false;
    return this.place(id, j);
  }

  /** Returns every tile to the shuffled area. Attempts and score are not affected. */
  reset(): void {
    if (!this.locked) this.placed = [];
  }

  /** "Check answer". Ignored until every tile is placed; ignored once the question is finished (no double points). */
  check(): CheckResult {
    const c = this.current;
    if (!c || this.locked || !this.complete) {
      return { correct: false, rightPlace: 0, total: c?.original.length ?? 0, points: 0, attempts: this.attempts, counted: false };
    }
    this.attempts += 1;
    const answer = this.answer;
    const rightPlace = answer.filter((t, i) => wordKey(t.text) === wordKey(c.original[i].text)).length;
    const correct = rightPlace === c.original.length;
    let points = 0;
    if (correct) {
      points = this.attempts === 1 ? POINTS.first : this.attempts === 2 ? POINTS.second : POINTS.later;
      this.score += points;
      this.status = 'correct';
      this.records.push({ id: c.sher.id, attempts: this.attempts, points, status: 'correct' });
    }
    return { correct, rightPlace, total: c.original.length, points, attempts: this.attempts, counted: true };
  }

  get canReveal(): boolean {
    return this.status === 'playing' && this.attempts >= REVEAL_AFTER;
  }

  /** Shows the right order without points. Only offered after REVEAL_AFTER wrong checks. */
  reveal(): boolean {
    const c = this.current;
    if (!c || !this.canReveal) return false;
    this.placed = c.original.map((t) => t.id);
    this.status = 'revealed';
    this.records.push({ id: c.sher.id, attempts: this.attempts, points: 0, status: 'revealed' });
    return true;
  }

  /** Next sher after the current one is finished; returns false when the game is over. */
  next(): boolean {
    if (!this.locked) return !this.over;
    this.index += 1;
    this.placed = [];
    this.attempts = 0;
    this.status = 'playing';
    return !this.over;
  }
}

export function maxScore(total: number): number {
  return total * POINTS.first;
}

/** Short Hindi verdict for the final screen. */
export function performance(correct: number, total: number): string {
  const r = total > 0 ? correct / total : 0;
  if (r >= 0.99) return 'कमाल! आपने हर शेर सजा दिया।';
  if (r >= 0.6) return 'बहुत अच्छे! अल्फ़ाज़ आपके हाथों में सँवर जाते हैं।';
  if (r >= 0.4) return 'अच्छी कोशिश! थोड़ा और अभ्यास कीजिए।';
  return 'कोई बात नहीं, फिर खेलिए और शेर याद कीजिए।';
}

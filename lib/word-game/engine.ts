/**
 * Pure game rules for "लफ़्ज़ का मतलब" (Word Master). No React, no DOM, so they can be unit-tested with plain `node --test`.
 * The words live in words.json; nothing here is hardcoded vocabulary.
 */

export type Rng = () => number;
export type Level = 'easy' | 'medium' | 'hard';

export interface Word {
  id: string;
  /** Devanagari */
  word: string;
  /** Urdu script, where available */
  urdu?: string;
  roman?: string;
  /** correct meaning in Hindi */
  meaning: string;
  meaningEn?: string;
  /** three plausible wrong meanings */
  wrong: string[];
  explanation?: string;
  example?: string;
  level: Level;
  category?: string;
}

export interface Question {
  word: Word;
  options: string[];
  correctIndex: number;
}

export const WORDS_PER_GAME = 10;
export const MIN_WORDS = 5;

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
 * inactive, missing word/meaning, not exactly three distinct wrong options, a wrong option equal to the meaning,
 * duplicate id or duplicate word.
 */
export function sanitizeWords(input: unknown): Word[] {
  const src = (input && typeof input === 'object' ? (input as { words?: unknown }).words : input) as unknown;
  const out: Word[] = [];
  const ids = new Set<string>();
  const seenWords = new Set<string>();
  for (const r of Array.isArray(src) ? src : []) {
    if (!r || r.active === false) continue;
    const id = clean(r.id);
    const word = clean(r.word);
    const meaning = clean(r.meaning);
    const wrong = (Array.isArray(r.wrong) ? r.wrong : []).map(clean).filter(Boolean);
    if (!id || !word || !meaning || ids.has(id) || seenWords.has(word)) continue;
    const options = [meaning, ...wrong];
    if (wrong.length !== 3 || new Set(options).size !== 4) continue;
    ids.add(id);
    seenWords.add(word);
    const level: Level = LEVELS.includes(r.level) ? r.level : 'medium';
    const w: Word = { id, word, meaning, wrong, level };
    for (const k of ['urdu', 'roman', 'meaningEn', 'explanation', 'example', 'category'] as const) {
      const v = clean(r[k]);
      if (v) w[k] = v;
    }
    out.push(w);
  }
  return out;
}

export function canPlay(words: readonly Word[]): boolean {
  return words.length >= MIN_WORDS;
}

export function makeQuestion(word: Word, rng: Rng = Math.random): Question {
  const options = shuffle([word.meaning, ...word.wrong], rng);
  return { word, options, correctIndex: options.indexOf(word.meaning) };
}

export class WordGame {
  readonly questions: Question[];
  readonly total: number;
  index = 0;
  score = 0;
  /** questions answered so far */
  attempted = 0;
  private answered = false;

  constructor(words: readonly Word[], rng: Rng = Math.random, perGame: number = WORDS_PER_GAME) {
    // Sampled without replacement: a word never repeats inside one game.
    this.questions = shuffle(words, rng).slice(0, perGame).map((w) => makeQuestion(w, rng));
    this.total = this.questions.length;
  }

  get current(): Question | null {
    return this.questions[this.index] ?? null;
  }

  get over(): boolean {
    return this.index >= this.total;
  }

  /** One answer per question; later calls (double taps) change nothing. */
  answer(optionIndex: number): { correct: boolean; alreadyAnswered: boolean } {
    const q = this.current;
    if (!q || this.answered) return { correct: false, alreadyAnswered: true };
    this.answered = true;
    this.attempted += 1;
    const correct = optionIndex === q.correctIndex;
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
  if (r >= 0.9) return 'कमाल! आप सच्चे लफ़्ज़-शनास हैं।';
  if (r >= 0.7) return 'बहुत अच्छे! अल्फ़ाज़ पर आपकी पकड़ मज़बूत है।';
  if (r >= 0.4) return 'अच्छी कोशिश! थोड़े और अल्फ़ाज़ सीखिए।';
  return 'कोई बात नहीं, फिर खेलिए और नए अल्फ़ाज़ सीखिए।';
}

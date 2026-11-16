/**
 * Pure game rules for "रचना पहचानिए" (Identify the Form). No React, no DOM: unit-testable with plain `node --test`.
 * The compositions live in questions.json; nothing here is hardcoded literary content except the short form definitions
 * shown on the result screen.
 */

export type Rng = () => number;
export type Level = 'easy' | 'medium' | 'hard';
export type Form = 'ghazal' | 'nazm' | 'rubai' | 'qita' | 'doha';

export const FORMS: Form[] = ['ghazal', 'nazm', 'rubai', 'qita', 'doha'];
export const FORM_LABEL: Record<Form, { hi: string; en: string }> = {
  ghazal: { hi: 'ग़ज़ल', en: 'Ghazal' },
  nazm: { hi: 'नज़्म', en: 'Nazm' },
  rubai: { hi: 'रुबाई', en: 'Rubai' },
  qita: { hi: 'क़िता', en: 'Qita' },
  doha: { hi: 'दोहा', en: 'Doha' },
};
/** Short, deliberately cautious definitions for the result-screen cheat sheet. */
export const FORM_DEF: Record<Form, string> = {
  ghazal: 'स्वतंत्र शेरों की माला; एक बहर, पहले शेर (मतला) की दोनों पंक्तियों में तुक, बाद के शेरों की दूसरी पंक्ति में वही रदीफ़-क़ाफ़िया। मक़ता अक्सर होता है, हमेशा नहीं।',
  nazm: 'विषय या भाव की निरंतरता वाली रचना, अक्सर शीर्षक के साथ। इसके रूप कई हैं — तुकांत, बंध-वाली या आज़ाद।',
  rubai: 'चार पंक्तियाँ, एक विशेष बहर; तुक अक्सर a a b a (कभी a a a a), चौथी पंक्ति में बात का निचोड़।',
  qita: 'दो या अधिक शेर जो एक ही ख़याल से जुड़े हों; मतला नहीं, तुक सिर्फ़ सम (दूसरी, चौथी…) पंक्तियों में।',
  doha: 'दो पंक्तियों का मात्रिक छंद; हर पंक्ति में 13 + 11 मात्राएँ, अंत में तुक और गुरु-लघु।',
};

export interface Question {
  id: string;
  form: Form;
  kind: 'attributed' | 'example';
  level: Level;
  title?: string;
  poet?: string;
  work?: string;
  /** "" marks a stanza break */
  lines: string[];
  markers: string[];
  closest?: Form;
  exclude: Form[];
  explanation: string;
  source: string;
}

export interface Round {
  q: Question;
  options: Form[];
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
const isForm = (f: unknown): f is Form => FORMS.includes(f as Form);

/**
 * Validates untrusted data. Bad rows are dropped, never thrown on: inactive, unknown form, fewer than two text lines,
 * missing explanation/source/markers, an attributed excerpt without poet+work, a `closest` equal to the answer or
 * excluded, more than one excluded form (four options would no longer be possible), duplicate id or duplicate text.
 */
export function sanitizeQuestions(input: unknown): Question[] {
  const src = (input && typeof input === 'object' ? (input as { questions?: unknown }).questions : input) as unknown;
  const out: Question[] = [];
  const ids = new Set<string>();
  const texts = new Set<string>();
  for (const r of Array.isArray(src) ? src : []) {
    if (!r || r.active === false) continue;
    const id = clean(r.id);
    const explanation = clean(r.explanation);
    const source = clean(r.source);
    if (!id || !explanation || !source || ids.has(id) || !isForm(r.form)) continue;
    if (r.kind !== 'attributed' && r.kind !== 'example') continue;
    const lines = (Array.isArray(r.lines) ? r.lines : []).map((l: unknown) => (typeof l === 'string' ? l.trim() : ''));
    while (lines.length && lines[0] === '') lines.shift();
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    const textLines = lines.filter(Boolean);
    if (textLines.length < 2) continue;
    const key = textLines.join('|');
    if (texts.has(key)) continue;
    const markers = (Array.isArray(r.markers) ? r.markers : []).map(clean).filter(Boolean);
    if (!markers.length) continue;
    const poet = clean(r.poet);
    const work = clean(r.work);
    if (r.kind === 'attributed' && (!poet || !work)) continue;
    const exclude: Form[] = (Array.isArray(r.exclude) ? r.exclude : []).filter(isForm);
    if (exclude.length > 1 || exclude.includes(r.form)) continue;
    if (r.closest !== undefined && (!isForm(r.closest) || r.closest === r.form || exclude.includes(r.closest))) continue;
    ids.add(id);
    texts.add(key);
    const q: Question = {
      id, form: r.form, kind: r.kind, level: LEVELS.includes(r.level) ? r.level : 'medium',
      lines, markers, exclude, explanation, source,
    };
    if (clean(r.title)) q.title = clean(r.title);
    if (poet) q.poet = poet;
    if (work) q.work = work;
    if (r.closest) q.closest = r.closest;
    out.push(q);
  }
  return out;
}

export function canPlay(qs: readonly Question[]): boolean {
  return qs.length >= MIN_QUESTIONS;
}

/** Exactly four distinct forms: the answer, the stored closest look-alike (if any), then random others; never an excluded form. */
export function makeRound(q: Question, rng: Rng = Math.random): Round {
  const pool = FORMS.filter((f) => f !== q.form && !q.exclude.includes(f));
  const picked: Form[] = [];
  if (q.closest && pool.includes(q.closest)) picked.push(q.closest);
  for (const f of shuffle(pool.filter((p) => !picked.includes(p)), rng)) {
    if (picked.length < 3) picked.push(f);
  }
  const options = shuffle([q.form, ...picked], rng);
  return { q, options, correctIndex: options.indexOf(q.form) };
}

/** Deals questions round-robin over the five forms (random order inside each form) so a game covers every form. */
export function pickMixed(qs: readonly Question[], count: number, rng: Rng = Math.random): Question[] {
  const buckets = shuffle(FORMS, rng)
    .map((f) => shuffle(qs.filter((q) => q.form === f), rng))
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

export interface FormStat {
  attempted: number;
  correct: number;
}

export class FormGame {
  readonly rounds: Round[];
  readonly total: number;
  index = 0;
  score = 0;
  attempted = 0;
  readonly byForm: Partial<Record<Form, FormStat>> = {};
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
    if (!r || this.answered || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= r.options.length) {
      return { correct: false, alreadyAnswered: true };
    }
    this.answered = true;
    this.attempted += 1;
    const correct = optionIndex === r.correctIndex;
    if (correct) this.score += 1;
    const s = (this.byForm[r.q.form] ??= { attempted: 0, correct: 0 });
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

export function performance(score: number, total: number): string {
  const r = total > 0 ? score / total : 0;
  if (r >= 0.9) return 'कमाल! आप तो काव्य-रूपों के पक्के जानकार हैं।';
  if (r >= 0.7) return 'बहुत अच्छे! रचना का ढाँचा पहचानना आपको आता है।';
  if (r >= 0.4) return 'अच्छी कोशिश! नीचे दिए रूपों की पहचान एक बार देख लीजिए और फिर खेलिए।';
  return 'कोई बात नहीं, नीचे दी पहचान पढ़िए और दोबारा खेलिए।';
}

// Run: node --test "lib/poet-quiz/__tests__/*.test.mjs"   (Node >= 22.18; no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});

const { PoetQuiz, sanitizeQuestions, makeRound, pickMixed, canPlay, performance, CATEGORIES, QUESTIONS_PER_GAME } = await import('../engine.ts');
const raw = JSON.parse(readFileSync(new URL('../questions.json', import.meta.url), 'utf8'));
const seeded = (seed = 7) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const qs = sanitizeQuestions(raw);

test('bank: nothing dropped by validation; unique ids and question texts; all five types present', () => {
  assert.equal(qs.length, raw.questions.length);
  assert.ok(qs.length >= 40 && canPlay(qs));
  assert.equal(new Set(qs.map((q) => q.id)).size, qs.length);
  assert.equal(new Set(qs.map((q) => q.question)).size, qs.length);
  for (const c of CATEGORIES) assert.ok(qs.filter((q) => q.category === c).length >= 5, c);
});

test('bank: every question has an explanation and a source, and four distinct options', () => {
  for (const q of raw.questions) {
    assert.ok(q.explanation && q.source, `explanation/source missing: ${q.id}`);
    assert.equal(new Set([q.answer, ...q.wrong]).size, 4, q.id);
    assert.ok(!q.disputed, q.id);
  }
});

test('every round: four distinct options, exactly one correct, at the right index', () => {
  for (let s = 1; s <= 20; s++) for (const q of qs) {
    const r = makeRound(q, seeded(s));
    assert.equal(r.options.length, 4);
    assert.equal(new Set(r.options).size, 4);
    assert.equal(r.options.filter((o) => o === q.answer).length, 1);
    assert.equal(r.options[r.correctIndex], q.answer);
  }
});

test('a game: right size, no repeated question, spreads over all five types, different seeds differ', () => {
  for (let s = 1; s <= 30; s++) {
    const g = new PoetQuiz(qs, seeded(s));
    assert.equal(g.total, QUESTIONS_PER_GAME);
    assert.equal(new Set(g.rounds.map((r) => r.q.id)).size, g.total);
    assert.equal(new Set(g.rounds.map((r) => r.q.category)).size, 5);
  }
  assert.notEqual(new PoetQuiz(qs, seeded(1)).rounds.map((r) => r.q.id).join(), new PoetQuiz(qs, seeded(2)).rounds.map((r) => r.q.id).join());
});

test('scoring and category stats; a second tap on the same question is ignored', () => {
  const g = new PoetQuiz(qs, seeded(3));
  let expected = 0;
  for (let i = 0; i < g.total; i++) {
    const r = g.current;
    const right = i % 2 === 0;
    assert.equal(g.answer(right ? r.correctIndex : (r.correctIndex + 1) % 4).correct, right);
    if (right) expected++;
    assert.equal(g.answer(r.correctIndex).alreadyAnswered, true);
    assert.equal(g.score, expected);
    assert.equal(g.attempted, i + 1);
    assert.equal(g.next(), i < g.total - 1);
  }
  assert.ok(g.over);
  const sum = Object.values(g.byCategory).reduce((a, s) => ({ attempted: a.attempted + s.attempted, correct: a.correct + s.correct }), { attempted: 0, correct: 0 });
  assert.deepEqual(sum, { attempted: 10, correct: 5 });
});

test('next() before answering does not skip a question', () => {
  const g = new PoetQuiz(qs, seeded(4));
  g.next();
  assert.equal(g.index, 0);
});

test('sanitize drops bad, inactive, disputed and incomplete rows', () => {
  assert.deepEqual(sanitizeQuestions(null), []);
  const ok = { id: 'a', category: 'work', question: 'प्र', answer: 'उ', wrong: ['1', '2', '3'], explanation: 'व्या' };
  const out = sanitizeQuestions({ questions: [
    ok,
    { ...ok, id: 'b' },                                   // duplicate question text
    { ...ok, id: 'c', question: 'क', wrong: ['1', '2'] },   // two wrong
    { ...ok, id: 'd', question: 'ख', wrong: ['उ', '2', '3'] }, // wrong equals answer
    { ...ok, id: 'e', question: 'ग', explanation: '' },     // no explanation
    { ...ok, id: 'f', question: 'घ', disputed: true },      // disputed fact
    { ...ok, id: 'g', question: 'च', active: false },
    { ...ok, id: 'h', question: 'छ', category: 'zzz' },
    { ...ok, id: 'a', question: 'ज' },                      // duplicate id
  ] });
  assert.equal(out.length, 1);
  assert.equal(out[0].level, 'medium');
  assert.equal(canPlay(out), false);
});

test('small bank still plays what it has; empty bank has no game; verdicts exist', () => {
  assert.equal(new PoetQuiz(qs.slice(0, 6), seeded(1)).total, 6);
  assert.equal(new PoetQuiz([], seeded(1)).total, 0);
  assert.equal(pickMixed(qs, 10, seeded(2)).length, 10);
  for (const [s, t] of [[10, 10], [8, 10], [5, 10], [1, 10], [0, 0]]) assert.ok(performance(s, t).length > 5);
});

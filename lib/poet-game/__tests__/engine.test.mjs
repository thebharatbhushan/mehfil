// Run: node --test "lib/poet-game/__tests__/*.test.mjs"   (Node >= 22.18; no extra packages)
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

const { PoetGame, sanitizeBank, canPlay, makeQuestion, QUESTIONS_PER_GAME } = await import('../engine.ts');
const raw = JSON.parse(readFileSync(new URL('../questions.json', import.meta.url), 'utf8'));
const seeded = (seed = 7) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

test('bank: nothing is dropped by validation (every row is well-formed)', () => {
  const bank = sanitizeBank(raw);
  assert.equal(bank.questions.length, raw.questions.length);
  assert.equal(bank.poets.length, raw.poets.length);
  assert.ok(bank.questions.length >= QUESTIONS_PER_GAME);
  assert.ok(canPlay(bank));
});

test('bank: every question points to a known poet, has two lines, ids unique', () => {
  const ids = new Set(raw.poets.map((p) => p.id));
  const seen = new Set();
  for (const q of raw.questions) {
    assert.ok(ids.has(q.poet), `unknown poet on ${q.id}`);
    assert.equal(q.lines.length, 2);
    assert.ok(!seen.has(q.id));
    seen.add(q.id);
  }
});

test('every question: four distinct poets, exactly one correct', () => {
  const bank = sanitizeBank(raw);
  for (let s = 1; s <= 20; s++) {
    for (const rq of bank.questions) {
      const q = makeQuestion(rq, bank.poets, seeded(s));
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options.map((p) => p.id)).size, 4);
      assert.equal(q.options.filter((p) => p.id === rq.poet).length, 1);
      assert.equal(q.options[q.correctIndex].id, rq.poet);
    }
  }
});

test('a game has no repeated sher and the right size', () => {
  const bank = sanitizeBank(raw);
  for (let s = 1; s <= 30; s++) {
    const g = new PoetGame(bank, seeded(s));
    assert.equal(g.total, QUESTIONS_PER_GAME);
    assert.equal(new Set(g.questions.map((q) => q.id)).size, g.total);
  }
});

test('different seeds give different question order and option order', () => {
  const bank = sanitizeBank(raw);
  const a = new PoetGame(bank, seeded(1)).questions.map((q) => q.id).join();
  const b = new PoetGame(bank, seeded(2)).questions.map((q) => q.id).join();
  assert.notEqual(a, b);
});

test('scoring: correct +1, wrong +0, double tap ignored, ends after the last question', () => {
  const bank = sanitizeBank(raw);
  const g = new PoetGame(bank, seeded(3));
  let expected = 0;
  for (let i = 0; i < g.total; i++) {
    const q = g.current;
    const wrongIdx = (q.correctIndex + 1) % 4;
    const useCorrect = i % 2 === 0;
    const r = g.answer(useCorrect ? q.correctIndex : wrongIdx);
    assert.equal(r.correct, useCorrect);
    if (useCorrect) expected++;
    assert.equal(g.answer(q.correctIndex).alreadyAnswered, true); // second tap ignored
    assert.equal(g.score, expected);
    const more = g.next();
    assert.equal(more, i < g.total - 1);
  }
  assert.ok(g.over);
  assert.equal(g.score, 5);
});

test('next() before answering does not skip the question', () => {
  const g = new PoetGame(sanitizeBank(raw), seeded(4));
  g.next();
  assert.equal(g.index, 0);
});

test('sanitizeBank drops bad rows and tolerates garbage', () => {
  assert.deepEqual(sanitizeBank(null), { poets: [], questions: [] });
  assert.deepEqual(sanitizeBank('x'), { poets: [], questions: [] });
  const b = sanitizeBank({
    poets: [{ id: 'a', name: 'A' }, { id: 'a', name: 'dup' }, { id: '', name: 'x' }],
    questions: [
      { id: '1', poet: 'a', lines: ['l1', 'l2'] },
      { id: '1', poet: 'a', lines: ['m1', 'm2'] }, // dup id
      { id: '2', poet: 'zzz', lines: ['l1', 'l2'] }, // unknown poet
      { id: '3', poet: 'a', lines: ['only one'] }, // too short
      { id: '4', poet: 'a', lines: ['l1', 'l2'] }, // dup text
    ],
  });
  assert.equal(b.poets.length, 1);
  assert.equal(b.questions.length, 1);
  assert.ok(!canPlay(b)); // fewer than 4 poets
});

test('too few poets: no game', () => {
  const b = sanitizeBank({ poets: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], questions: [{ id: '1', poet: 'a', lines: ['x', 'y'] }] });
  assert.equal(canPlay(b), false);
  assert.equal(new PoetGame(b).total, 0);
});

test('the example from the brief is in the bank with Ghalib as the answer', () => {
  const q = raw.questions.find((x) => x.lines[0].startsWith('हज़ारों ख़्वाहिशें'));
  assert.equal(q.poet, 'ghalib');
});

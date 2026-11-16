// Run: node --test "lib/sher-meaning/__tests__/*.test.mjs"   (Node >= 22.18; no extra packages)
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

const { DecodeGame, sanitizeQuestions, makeRound, canPlay, performance, QUESTIONS_PER_GAME } = await import('../engine.ts');
const raw = JSON.parse(readFileSync(new URL('../questions.json', import.meta.url), 'utf8'));
const poetBank = JSON.parse(readFileSync(new URL('../../poet-game/questions.json', import.meta.url), 'utf8'));
const seeded = (seed = 7) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const qs = sanitizeQuestions(raw);

test('bank: nothing dropped by validation; unique ids; enough questions', () => {
  assert.equal(qs.length, raw.questions.length);
  assert.ok(qs.length >= 25 && canPlay(qs));
  assert.equal(new Set(qs.map((q) => q.id)).size, qs.length);
});

test('bank: every sher is exactly an entry of the verified sher bank, with the same poet', () => {
  const verified = new Map(poetBank.questions.map((p) => [p.lines.join('\n'), p.poet]));
  const poets = new Map(poetBank.poets.map((p) => [p.id, p.name]));
  for (const q of qs) {
    const pid = verified.get(q.lines.join('\n'));
    assert.ok(pid, `sher not in verified bank: ${q.id}`);
    assert.equal(poets.get(pid), q.poet, `poet mismatch: ${q.id}`);
  }
});

test('bank: four distinct readings, explanation and source present, none contested', () => {
  for (const q of raw.questions) {
    assert.equal(new Set([q.answer, ...q.wrong]).size, 4, q.id);
    assert.ok(q.explanation && q.source, q.id);
    assert.ok(!q.contested, q.id);
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

test('a game: right size, no repeated sher, different seeds differ, correct answer position varies', () => {
  for (let s = 1; s <= 30; s++) {
    const g = new DecodeGame(qs, seeded(s));
    assert.equal(g.total, QUESTIONS_PER_GAME);
    assert.equal(new Set(g.rounds.map((r) => r.q.id)).size, g.total);
  }
  assert.notEqual(new DecodeGame(qs, seeded(1)).rounds.map((r) => r.q.id).join(), new DecodeGame(qs, seeded(2)).rounds.map((r) => r.q.id).join());
  const pos = new Set(); for (let s = 1; s <= 400; s++) pos.add(makeRound(qs[0], seeded(s * 7919)).correctIndex);
  assert.equal(pos.size, 4);
});

test('scoring: +1 per correct; second tap ignored; full run adds up; next() before answering does not skip', () => {
  const g = new DecodeGame(qs, seeded(3));
  g.next(); assert.equal(g.index, 0);
  let expected = 0;
  for (let i = 0; i < g.total; i++) {
    const r = g.current; const right = i % 2 === 0;
    assert.equal(g.answer(right ? r.correctIndex : (r.correctIndex + 1) % 4).correct, right);
    if (right) expected++;
    assert.equal(g.answer(r.correctIndex).alreadyAnswered, true);
    assert.equal(g.score, expected); assert.equal(g.attempted, i + 1);
    assert.equal(g.next(), i < g.total - 1);
  }
  assert.ok(g.over); assert.equal(g.score, 5);
});

test('sanitize drops contested, inactive, malformed and duplicate rows', () => {
  assert.deepEqual(sanitizeQuestions(null), []);
  const ok = { id: 'a', poet: 'P', lines: ['क ख', 'ग घ'], answer: 'उ', wrong: ['1', '2', '3'], explanation: 'व्या' };
  const out = sanitizeQuestions({ questions: [
    ok,
    { ...ok, id: 'b' },                                          // duplicate sher
    { ...ok, id: 'c', lines: ['च छ', 'ज झ'], contested: true },     // genuinely ambiguous: excluded from scored play
    { ...ok, id: 'd', lines: ['ट ठ', 'ड ढ'], active: false },
    { ...ok, id: 'e', lines: ['त थ', 'द ध'], wrong: ['उ', '2', '3'] }, // wrong equals answer
    { ...ok, id: 'f', lines: ['न प', 'फ ब'], wrong: ['1', '2'] },
    { ...ok, id: 'g', lines: ['भ म', 'य र'], explanation: '' },
    { ...ok, id: 'h', lines: ['ल व'] },                              // one line only
  ] });
  assert.equal(out.length, 1); assert.equal(out[0].level, 'medium'); assert.deepEqual(out[0].vocab, []);
  assert.equal(canPlay(out), false);
  assert.equal(new DecodeGame([], seeded(1)).total, 0);
  assert.ok(performance(10, 10).length > 5 && performance(0, 0).length > 5);
});

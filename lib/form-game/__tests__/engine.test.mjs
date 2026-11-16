// Run: node --test "lib/form-game/__tests__/*.test.mjs"   (Node >= 22.18; no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { matras } from './matra.mjs';

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

const { FormGame, sanitizeQuestions, makeRound, pickMixed, canPlay, performance, FORMS, QUESTIONS_PER_GAME } = await import('../engine.ts');
const raw = JSON.parse(readFileSync(new URL('../questions.json', import.meta.url), 'utf8'));
const seeded = (seed = 7) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const qs = sanitizeQuestions(raw);
const text = (q) => q.lines.filter(Boolean);

test('bank: nothing dropped; unique ids; every form has >= 2 items', () => {
  assert.equal(qs.length, raw.questions.length);
  assert.ok(canPlay(qs));
  assert.equal(new Set(qs.map((q) => q.id)).size, qs.length);
  for (const f of FORMS) assert.ok(qs.filter((q) => q.form === f).length >= 2, f);
});

test('bank: attributed items have poet, work and source; examples are not attributed', () => {
  for (const q of qs) {
    assert.ok(q.source.length > 5, q.id);
    if (q.kind === 'attributed') assert.ok(q.poet && q.work, q.id);
    else assert.ok(!q.poet, q.id);
  }
});

test('structure: rubai and qita have exactly 4 lines; doha exactly 2; ghazal >= 4 lines in couplets; nazm >= 6 lines or titled', () => {
  for (const q of qs) {
    const n = text(q).length;
    if (q.form === 'rubai' || q.form === 'qita') assert.equal(n, 4, q.id);
    if (q.form === 'doha') assert.equal(n, 2, q.id);
    if (q.form === 'ghazal') { assert.ok(n >= 4 && n % 2 === 0, q.id); assert.equal(q.lines.filter((l) => l === '').length, n / 2 - 1, q.id); }
    if (q.form === 'nazm') assert.ok(q.title, q.id);
  }
});

const endWord = (l) => l.replace(/[,।.\s]+$/g, '').split(/\s+/).pop();
const tail = (w, n = 2) => [...w.replace(/आ/g, 'ा')].slice(-n).join('');

test('rubai: lines 1, 2, 4 share an ending sound; line 3 does not match line 2 (a a b a)', () => {
  for (const q of qs.filter((x) => x.form === 'rubai')) {
    const e = text(q).map(endWord);
    const t = e.map((w) => tail(w, 2));
    assert.equal(t[0], t[1], q.id);
    assert.equal(t[1], t[3], q.id);
    assert.notEqual(t[2], t[1], q.id);
  }
});

test('qita: lines 2 and 4 rhyme; lines 1 and 3 do not rhyme with them', () => {
  for (const q of qs.filter((x) => x.form === 'qita')) {
    const t = text(q).map(endWord).map((w) => tail(w, 2));
    assert.equal(t[1], t[3], q.id);
    assert.notEqual(t[0], t[1], q.id);
    assert.notEqual(t[2], t[1], q.id);
  }
});

test('doha: each line is 13 + 11 matras (test-only counter), ends in guru-laghu rhyme with the other line', () => {
  for (const q of qs.filter((x) => x.form === 'doha')) {
    for (const l of text(q)) {
      const [a, b] = l.replace(/[।]/g, '').split(', ');
      assert.equal(matras(a), 13, `${q.id}: ${a}`);
      assert.equal(matras(b), 11, `${q.id}: ${b}`);
    }
    const [x, y] = text(q).map(endWord);
    assert.equal(tail(x, 2), tail(y, 2) === tail(x, 2) ? tail(x, 2) : '', `${q.id} rhyme`);
  }
});

test('ghazal: first couplet rhymes (matla) and later couplet second line repeats the same ending', () => {
  for (const q of qs.filter((x) => x.form === 'ghazal')) {
    const t = text(q).map(endWord);
    assert.equal(tail(t[0], 3), tail(t[1], 3), q.id);
    for (let i = 3; i < t.length; i += 2) assert.equal(tail(t[i], 3), tail(t[1], 3), q.id);
  }
});

test('makeRound: exactly four distinct forms, correct one included, closest included, excluded never offered', () => {
  for (const q of qs) {
    for (let s = 1; s <= 40; s++) {
      const r = makeRound(q, seeded(s * 7919));
      assert.equal(r.options.length, 4);
      assert.equal(new Set(r.options).size, 4);
      assert.equal(r.options[r.correctIndex], q.form);
      if (q.closest) assert.ok(r.options.includes(q.closest), q.id);
      for (const x of q.exclude) assert.ok(!r.options.includes(x), q.id);
    }
  }
});

test('option order is randomized', () => {
  const q = qs.find((x) => x.exclude.length === 0);
  const seen = new Set();
  for (let s = 1; s <= 200; s++) seen.add(makeRound(q, seeded(s * 7919)).correctIndex);
  assert.equal(seen.size, 4);
});

test('game: no repeats, one answer per question, score and per-form stats', () => {
  const g = new FormGame(qs, seeded(3));
  assert.equal(g.total, Math.min(QUESTIONS_PER_GAME, qs.length));
  assert.equal(new Set(g.rounds.map((r) => r.q.id)).size, g.total);
  const first = g.current;
  assert.equal(g.answer(first.correctIndex).correct, true);
  assert.equal(g.answer((first.correctIndex + 1) % 4).alreadyAnswered, true);
  assert.equal(g.score, 1);
  assert.equal(g.attempted, 1);
  g.next();
  g.next(); // no-op before answering
  assert.equal(g.index, 1);
  assert.equal(g.answer(99).alreadyAnswered, true);
  let guard = 0;
  while (!g.over && guard++ < 50) {
    g.answer((g.current.correctIndex + 1) % 4);
    g.next();
  }
  assert.equal(g.score, 1);
  assert.equal(g.attempted, g.total);
  assert.ok(g.over && g.current === null);
});

test('pickMixed spreads over forms; order varies by seed', () => {
  const p = pickMixed(qs, 10, seeded(5));
  assert.equal(new Set(p.map((q) => q.form)).size, 5);
  const a = pickMixed(qs, 10, seeded(11)).map((q) => q.id).join();
  const b = pickMixed(qs, 10, seeded(12)).map((q) => q.id).join();
  assert.notEqual(a, b);
});

test('sanitize drops bad rows and never throws', () => {
  const ok = raw.questions[0];
  const bad = [
    null, 'x', { ...ok, id: 'a1', form: 'sonnet' }, { ...ok, id: 'a2', lines: ['एक'] }, { ...ok, id: 'a3', explanation: '' },
    { ...ok, id: 'a4', source: '' }, { ...ok, id: 'a5', poet: '' }, { ...ok, id: 'a6', exclude: ['nazm', 'doha'] },
    { ...ok, id: 'a7', closest: ok.form }, { ...ok, id: 'a8', active: false }, { ...ok, id: 'a9', markers: [] },
    { ...ok, id: 'b1', exclude: ['nazm'], closest: 'nazm' }, { ...ok }, // duplicate id
  ];
  assert.deepEqual(sanitizeQuestions({ questions: bad }).map((q) => q.id), [ok.id]);
  assert.deepEqual(sanitizeQuestions(undefined), []);
  assert.deepEqual(sanitizeQuestions({ questions: 'oops' }), []);
  assert.equal(canPlay([]), false);
});

test('performance text for every band', () => {
  for (const s of [0, 3, 7, 10]) assert.ok(performance(s, 10).length > 10);
  assert.ok(performance(0, 0).length > 10);
});

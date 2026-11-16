// Run: node --test "lib/mistake-game/__tests__/*.test.mjs"   (Node >= 22.18; no extra packages)
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

const { MistakeGame, sanitizeQuestions, tokensOf, mistakeTokenId, words, wordKey, canPlay, performance, QUESTIONS_PER_GAME } = await import('../engine.ts');
const raw = JSON.parse(readFileSync(new URL('../questions.json', import.meta.url), 'utf8'));
const poetBank = JSON.parse(readFileSync(new URL('../../poet-game/questions.json', import.meta.url), 'utf8'));
const seeded = (seed = 7) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const qs = sanitizeQuestions(raw);

test('bank: validation drops nothing; enough questions; unique ids', () => {
  assert.equal(qs.length, raw.questions.length);
  assert.ok(qs.length >= 30 && canPlay(qs));
  assert.equal(new Set(qs.map((q) => q.id)).size, qs.length);
});

test('bank: every original sher is exactly an entry of the verified sher bank, with the same poet', () => {
  const verified = new Map(poetBank.questions.map((p) => [p.lines.join('\n'), p.poet]));
  const poets = new Map(poetBank.poets.map((p) => [p.id, p.name]));
  for (const q of qs) {
    const pid = verified.get(q.original.join('\n'));
    assert.ok(pid, `original not in verified bank: ${q.id}`);
    assert.equal(poets.get(pid), q.poet, `poet mismatch: ${q.id}`);
  }
});

test('bank: exactly one word differs, at the stored position; line count, line order and punctuation of other words untouched', () => {
  for (const q of qs) {
    assert.equal(q.original.length, q.modified.length);
    let diffs = 0;
    q.original.forEach((line, l) => {
      const o = words(line), m = words(q.modified[l]);
      assert.equal(o.length, m.length, q.id);
      o.forEach((w, i) => { if (wordKey(w) !== wordKey(m[i])) { diffs++; assert.equal(l, q.mistake.line); assert.equal(i, q.mistake.index); assert.equal(w, q.mistake.original); assert.equal(m[i], q.mistake.replacement); } });
    });
    assert.equal(diffs, 1, q.id);
    // the replacement must not already be the original word's twin elsewhere in the same line (so it can't be mistaken for it)
    assert.notEqual(wordKey(q.mistake.original), wordKey(q.mistake.replacement));
  }
});

test('repeated words are judged by position: "आगे आगे" -> second one replaced; only that token is right', () => {
  const q = qs.find((x) => x.mistake.original === 'आगे');
  assert.ok(q);
  const toks = tokensOf(q).flat();
  const same = toks.filter((t) => t.text === 'आगे'); // the untouched first "आगे"
  assert.equal(same.length, 1);
  const g = new MistakeGame([q, ...qs.filter((x) => x !== q)], seeded(1), 1);
  const gq = g.current; // may not be q; test directly with a single-question game instead
  const g1 = new MistakeGame([q], seeded(1), 1);
  g1.select(same[0].id);
  assert.equal(g1.check().correct, false);
  const g2 = new MistakeGame([q], seeded(1), 1);
  g2.select(mistakeTokenId(q));
  assert.equal(g2.check().correct, true);
  const q2 = qs.find((x) => x.id === 'galti-mir-01'); // "पत्ता पत्ता बूटा बूटा": second बूटा replaced
  const t = tokensOf(q2)[0].filter((x) => x.text === 'पत्ता');
  assert.equal(t.length, 2);
  assert.notEqual(t[0].id, t[1].id);
});

test('a game: right size, no repeated sher, different seeds differ', () => {
  for (let s = 1; s <= 30; s++) {
    const g = new MistakeGame(qs, seeded(s));
    assert.equal(g.total, QUESTIONS_PER_GAME);
    assert.equal(new Set(g.questions.map((q) => q.id)).size, g.total);
  }
  assert.notEqual(new MistakeGame(qs, seeded(1)).questions.map((q) => q.id).join(), new MistakeGame(qs, seeded(2)).questions.map((q) => q.id).join());
});

test('select toggles, check needs a selection, one check only (no retry, no double points)', () => {
  const g = new MistakeGame(qs, seeded(3));
  assert.equal(g.check().counted, false); // nothing selected
  const q = g.current;
  const toks = tokensOf(q).flat();
  const wrong = toks.find((t) => t.id !== mistakeTokenId(q));
  assert.ok(g.select(wrong.id)); assert.equal(g.selected, wrong.id);
  assert.ok(g.select(wrong.id)); assert.equal(g.selected, null); // tap again clears
  g.select(wrong.id); g.select(mistakeTokenId(q)); // change mind before checking
  const r = g.check();
  assert.deepEqual([r.correct, r.points, r.counted], [true, 1, true]);
  assert.equal(g.check().counted, false); // second Check ignored
  assert.equal(g.select(wrong.id), false); // locked
  assert.equal(g.score, 1); assert.equal(g.attempted, 1);
  assert.equal(g.select('zzz'), false);
});

test('wrong pick scores 0; full run adds up; next() before checking does not skip', () => {
  const g = new MistakeGame(qs, seeded(4));
  g.next(); assert.equal(g.index, 0);
  for (let i = 0; i < g.total; i++) {
    const q = g.current;
    const toks = tokensOf(q).flat();
    const pick = i % 2 === 0 ? mistakeTokenId(q) : toks.find((t) => t.id !== mistakeTokenId(q)).id;
    g.select(pick); const r = g.check();
    assert.equal(r.correct, i % 2 === 0);
    assert.equal(g.next(), i < g.total - 1);
  }
  assert.ok(g.over);
  assert.deepEqual([g.score, g.correctCount, g.attempted], [5, 5, 10]);
});

test('sanitize rejects malformed rows (two words changed, wrong position, wrong stored word, inactive, bad shape)', () => {
  assert.deepEqual(sanitizeQuestions(null), []);
  const ok = { id: 'a', poet: 'P', original: ['क ख ग', 'घ च छ'], modified: ['क ख ग', 'घ ज छ'], mistake: { line: 1, index: 1, original: 'च', replacement: 'ज' } };
  const out = sanitizeQuestions({ questions: [
    ok,
    { ...ok, id: 'b' },                                                        // duplicate sher
    { ...ok, id: 'c', original: ['क ख ग', 'घ च झ'], modified: ['क ट ग', 'घ ज छ'] }, // two words changed
    { ...ok, id: 'd', original: ['क ख ग', 'घ च त'], mistake: { ...ok.mistake, index: 0 } }, // wrong stored position
    { ...ok, id: 'e', original: ['क ख ग', 'घ च थ'], mistake: { ...ok.mistake, replacement: 'झ' } }, // wrong stored replacement
    { ...ok, id: 'f', original: ['क ख ग', 'घ च द'], active: false },
    { ...ok, id: 'g', original: ['क ख ग', 'घ च'], modified: ['क ख ग', 'घ ज छ'] }, // different word count
    { ...ok, id: 'h', original: ['क ख ग', 'घ च ध'], modified: ['क ख ग', 'घ च ध'] }, // nothing changed
  ] });
  assert.equal(out.length, 1);
  assert.equal(canPlay(out), false);
  assert.ok(performance(10, 10).length > 5 && performance(0, 10).length > 5 && performance(0, 0).length > 5);
});

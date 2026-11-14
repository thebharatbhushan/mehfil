// Run: node --test "lib/word-game/__tests__/*.test.mjs"   (Node >= 22.18; no extra packages)
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

const { WordGame, sanitizeWords, canPlay, makeQuestion, performance, WORDS_PER_GAME } = await import('../engine.ts');
const raw = JSON.parse(readFileSync(new URL('../words.json', import.meta.url), 'utf8'));
const seeded = (seed = 7) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const words = sanitizeWords(raw);

test('bank: validation drops nothing; enough words; unique ids and words', () => {
  assert.equal(words.length, raw.words.length);
  assert.ok(words.length >= 40);
  assert.equal(new Set(words.map((w) => w.id)).size, words.length);
  assert.equal(new Set(words.map((w) => w.word)).size, words.length);
  assert.ok(canPlay(words));
});

test('bank: every word has Hindi meaning, 3 distinct wrong options, valid level; Urdu script present for Urdu words', () => {
  for (const w of raw.words) {
    assert.ok(['easy', 'medium', 'hard'].includes(w.level), w.id);
    assert.equal(new Set([w.meaning, ...w.wrong]).size, 4, w.id);
    assert.ok(w.explanation, `no explanation: ${w.id}`);
    if (w.category === 'उर्दू' || w.category === 'अदबी') assert.ok(/[؀-ۿ]/.test(w.urdu || ''), `urdu script: ${w.id}`);
  }
});

test('the example from the brief: तिश्नगी -> प्यास', () => {
  const w = raw.words.find((x) => x.word === 'तिश्नगी');
  assert.equal(w.meaning, 'प्यास');
  assert.deepEqual([...w.wrong].sort(), ['ख़ुशी', 'तन्हाई', 'मोहब्बत'].sort());
});

test('every question: four distinct options, exactly one correct, at the right index', () => {
  for (let s = 1; s <= 20; s++) {
    for (const w of words) {
      const q = makeQuestion(w, seeded(s));
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4);
      assert.equal(q.options.filter((o) => o === w.meaning).length, 1);
      assert.equal(q.options[q.correctIndex], w.meaning);
    }
  }
});

test('a game never repeats a word; different seeds differ', () => {
  for (let s = 1; s <= 30; s++) {
    const g = new WordGame(words, seeded(s));
    assert.equal(g.total, WORDS_PER_GAME);
    assert.equal(new Set(g.questions.map((q) => q.word.id)).size, g.total);
  }
  assert.notEqual(new WordGame(words, seeded(1)).questions.map((q) => q.word.id).join(), new WordGame(words, seeded(2)).questions.map((q) => q.word.id).join());
});

test('scoring: +1 per correct, repeated taps ignored, attempted counted once, game ends', () => {
  const g = new WordGame(words, seeded(3));
  let expected = 0;
  for (let i = 0; i < g.total; i++) {
    const q = g.current;
    const right = i % 2 === 0;
    const r = g.answer(right ? q.correctIndex : (q.correctIndex + 1) % 4);
    assert.equal(r.correct, right);
    if (right) expected++;
    assert.equal(g.answer(q.correctIndex).alreadyAnswered, true);
    assert.equal(g.score, expected);
    assert.equal(g.attempted, i + 1);
    assert.equal(g.next(), i < g.total - 1);
  }
  assert.ok(g.over);
  assert.equal(g.score, 5);
});

test('next() before answering does not skip a word', () => {
  const g = new WordGame(words, seeded(4));
  g.next();
  assert.equal(g.index, 0);
});

test('sanitizeWords drops bad rows, inactive rows and garbage', () => {
  assert.deepEqual(sanitizeWords(null), []);
  assert.deepEqual(sanitizeWords({ words: 'x' }), []);
  const ok = { id: 'a', word: 'अ', meaning: 'म', wrong: ['1', '2', '3'] };
  const out = sanitizeWords({
    words: [
      ok,
      { ...ok, id: 'b' }, // duplicate word
      { ...ok, id: 'c', word: 'ब', wrong: ['1', '2'] }, // two wrong
      { ...ok, id: 'd', word: 'स', wrong: ['म', '2', '3'] }, // wrong equals meaning
      { ...ok, id: 'e', word: 'द', wrong: ['1', '1', '3'] }, // duplicate wrong
      { ...ok, id: 'f', word: 'फ', active: false }, // inactive
      { ...ok, id: 'a', word: 'ग' }, // duplicate id
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].level, 'medium');
});

test('insufficient words: no game; small bank still plays what it has', () => {
  assert.equal(canPlay(words.slice(0, 4)), false);
  assert.equal(new WordGame(words.slice(0, 6), seeded(1)).total, 6);
  assert.equal(new WordGame([], seeded(1)).total, 0);
});

test('performance verdict covers every range', () => {
  for (const [s, t] of [[10, 10], [8, 10], [5, 10], [1, 10], [0, 0]]) assert.ok(performance(s, t).length > 5);
});

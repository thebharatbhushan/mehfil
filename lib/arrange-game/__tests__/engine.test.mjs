// Run: node --test "lib/arrange-game/__tests__/*.test.mjs"   (Node >= 22.18; no extra packages)
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

const { ArrangeGame, sanitizeShers, makePuzzle, tokenize, wordKey, canPlay, performance, SHERS_PER_GAME } = await import('../engine.ts');
const raw = JSON.parse(readFileSync(new URL('../shers.json', import.meta.url), 'utf8'));
const seeded = (seed = 7) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const shers = sanitizeShers(raw);

// helpers: arrange the current puzzle correctly / wrongly
const solve = (g) => { g.reset(); g.current.original.forEach((t) => g.place(t.id)); };
const swapWrong = (g) => { g.reset(); const o = g.current.original.map((t) => t.id); [o[0], o[o.length - 1]] = [o[o.length - 1], o[0]]; o.forEach((id) => g.place(id)); };

test('bank: validation drops nothing; enough shers; ids unique', () => {
  assert.equal(shers.length, raw.shers.length);
  assert.ok(shers.length >= 30 && canPlay(shers));
  assert.equal(new Set(shers.map((s) => s.id)).size, shers.length);
});

test('only the second line is shuffled; the first line is given as the clue', () => {
  const s = shers.find((x) => x.lines[0].startsWith('हज़ारों ख़्वाहिशें'));
  assert.equal(s.poet, 'मिर्ज़ा ग़ालिब');
  const p = makePuzzle(s, seeded(1));
  assert.equal(p.given, 'हज़ारों ख़्वाहिशें ऐसी कि हर ख़्वाहिश पे दम निकले');
  assert.deepEqual(p.original.map((t) => t.text), ['बहुत', 'निकले', 'मिरे', 'अरमान', 'लेकिन', 'फिर', 'भी', 'कम', 'निकले']);
  assert.deepEqual(p.shuffled.map((t) => t.text).sort(), p.original.map((t) => t.text).sort());
  assert.ok(p.shuffled.every((t) => !p.given.split(' ').includes('हज़ारों') || t.text !== 'हज़ारों')); // first-line words never become tiles
  assert.deepEqual(tokenize(['हम   को  ', ' मालूम ']), ['हम', 'को', 'मालूम']);
});

test('every puzzle: unique tile ids, same words as the sher, never already in the original order', () => {
  for (let seed = 1; seed <= 15; seed++) {
    for (const s of shers) {
      const p = makePuzzle(s, seeded(seed));
      assert.equal(new Set(p.shuffled.map((t) => t.id)).size, p.original.length);
      assert.deepEqual(p.shuffled.map((t) => t.id).sort(), p.original.map((t) => t.id).sort());
      const same = p.shuffled.every((t, i) => wordKey(t.text) === wordKey(p.original[i].text));
      const allEqualWords = new Set(p.original.map((t) => wordKey(t.text))).size === 1;
      assert.ok(!same || allEqualWords, `shuffle left ${s.id} in original order`);
    }
  }
});

test('repeated words: duplicates are independent tiles; either order of identical words is accepted, wrong order is not', () => {
  const s = { id: 'dup', poet: 'x', level: 'easy', lines: ['इब्तिदा-ए-इश्क़ है रोता है क्या', 'आगे आगे देखिए होता है क्या'] };
  const g = new ArrangeGame([s], seeded(2), 1);
  const [a1, a2, ...rest] = g.current.original;
  assert.notEqual(a1.id, a2.id);
  g.place(a2.id); g.place(a1.id); rest.forEach((t) => g.place(t.id)); // identical words swapped
  assert.equal(g.check().correct, true);
  const g2 = new ArrangeGame([s], seeded(2), 1);
  const o = g2.current.original;
  [o[1], o[2], o[0], o[3], o[4], o[5]].forEach((t) => g2.place(t.id)); // आगे देखिए आगे ...
  assert.equal(g2.check().correct, false);
});

test('only an exactly right sequence is accepted', () => {
  const g = new ArrangeGame(shers, seeded(3));
  solve(g);
  assert.equal(g.check().correct, true);
  const g2 = new ArrangeGame(shers, seeded(3));
  swapWrong(g2);
  const r = g2.check();
  assert.equal(r.correct, false);
  assert.ok(r.rightPlace < r.total);
});

test('check is ignored until every tile is placed; punctuation and spaces do not matter', () => {
  const g = new ArrangeGame(shers, seeded(4));
  g.place(g.current.original[0].id);
  assert.equal(g.check().counted, false);
  assert.equal(g.attempts, 0);
  assert.equal(wordKey("'ग़ालिब',"), wordKey('ग़ालिब'));
});

test('scoring: 10 first try, 5 second, 2 later; wrong tries add nothing; no double points', () => {
  for (const [wrongs, pts] of [[0, 10], [1, 5], [2, 2], [3, 2]]) {
    const g = new ArrangeGame(shers, seeded(5));
    for (let i = 0; i < wrongs; i++) { swapWrong(g); assert.equal(g.check().correct, false); assert.equal(g.score, 0); }
    solve(g);
    const r = g.check();
    assert.equal(r.points, pts);
    assert.equal(g.score, pts);
    assert.equal(g.check().counted, false); // second click on Check after completion
    assert.equal(g.score, pts);
    assert.equal(g.records[0].attempts, wrongs + 1);
  }
});

test('place / move / remove / nudge / reset behave', () => {
  const g = new ArrangeGame(shers, seeded(6));
  const ids = g.current.original.map((t) => t.id);
  g.place(ids[0]); g.place(ids[1]); g.place(ids[2]);
  g.place(ids[2], 0);
  assert.deepEqual(g.placed, [ids[2], ids[0], ids[1]]);
  assert.ok(g.nudge(ids[2], 1));
  assert.deepEqual(g.placed, [ids[0], ids[2], ids[1]]);
  assert.equal(g.nudge(ids[0], -1), false);
  assert.ok(g.remove(ids[2]));
  assert.deepEqual(g.placed, [ids[0], ids[1]]);
  assert.ok(g.pool.some((t) => t.id === ids[2]));
  assert.equal(g.place('nope'), false);
  g.reset();
  assert.equal(g.placed.length, 0);
  assert.equal(g.pool.length, ids.length);
});

test('reveal: offered only after wrong tries, gives no points, counts as completed', () => {
  const g = new ArrangeGame(shers, seeded(7));
  assert.equal(g.reveal(), false);
  swapWrong(g); g.check(); swapWrong(g); g.check();
  assert.ok(g.canReveal);
  assert.ok(g.reveal());
  assert.equal(g.score, 0);
  assert.equal(g.status, 'revealed');
  assert.equal(g.place(g.current.original[0].id), false); // locked
  assert.equal(g.records[0].status, 'revealed');
});

test('a game: right size, no repeated sher; next() before finishing does not skip', () => {
  const g = new ArrangeGame(shers, seeded(8));
  assert.equal(g.total, SHERS_PER_GAME);
  assert.equal(new Set(g.puzzles.map((p) => p.sher.id)).size, g.total);
  g.next();
  assert.equal(g.index, 0);
});
test('a full run adds up', () => {
  const g = new ArrangeGame(shers, seeded(9));
  for (let i = 0; i < g.total; i++) {
    assert.equal(g.index, i);
    if (i % 2 === 0) { solve(g); g.check(); } else { swapWrong(g); g.check(); swapWrong(g); g.check(); g.reveal(); }
    const more = g.next();
    assert.equal(more, i < g.total - 1);
  }
  assert.ok(g.over);
  assert.equal(g.correctCount, 3);
  assert.equal(g.score, 30);
  assert.equal(g.records.length, 5);
  assert.equal(g.totalAttempts, 3 + 2 * 2);
});

test('sanitizeShers drops bad rows', () => {
  assert.deepEqual(sanitizeShers(null), []);
  const ok = { id: 'a', poet: 'P', lines: ['क ख ग', 'घ च छ'] };
  const out = sanitizeShers({ shers: [ok, { ...ok, id: 'b' }, { ...ok, id: 'c', lines: ['एक'] }, { ...ok, id: 'd', poet: '' }, { ...ok, id: 'e', lines: ['क ख ग', 'घ च'] }, { ...ok, id: 'f', lines: ['त थ द', 'ध न प'], active: false }, { ...ok, id: 'a', lines: ['त थ द', 'ध न प'] }] });
  assert.equal(out.length, 1);
  assert.equal(out[0].level, 'medium');
  assert.equal(canPlay(out), false);
  assert.ok(performance(5, 5).length > 5 && performance(0, 5).length > 5 && performance(0, 0).length > 5);
});

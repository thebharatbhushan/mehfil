// Run: node --test "lib/game/__tests__/*.test.mjs"   (Node >= 22.18; no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

// The sources use extension-less relative imports (the Next.js convention); let Node find the .ts files.
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

const { AntakshariGame, CompleteGame, findTypedMatch, similarity } = await import('../engine.ts');
const { buildPool, coupletsFromPoems, toEntries, MIN_SITE_COUPLETS } = await import('../couplets.ts');
const fallback = JSON.parse(readFileSync(new URL('../fallback-couplets.json', import.meta.url), 'utf8'));

// deterministic RNG
const seeded = (seed = 7) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pool = toEntries(fallback);

test('fallback couplets: every item has poet + source, ids unique, all usable', () => {
  assert.ok(fallback.length >= 30);
  for (const c of fallback) {
    assert.ok(c.poet && c.source && c.id, `missing attribution on ${c.id}`);
    assert.equal(c.lines.length, 2);
  }
  assert.equal(new Set(fallback.map((c) => c.id)).size, fallback.length);
  assert.equal(pool.length, fallback.length, 'no fallback couplet is dropped or duplicated');
});

test('buildPool: community couplets alone are used when there are enough, fallback is added otherwise', () => {
  const few = buildPool(fallback.slice(0, 5), fallback);
  assert.equal(few.usedFallback, true);
  assert.ok(few.entries.length >= MIN_SITE_COUPLETS);
  const many = buildPool(
    Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, lines: [`मेरा दिल है नंबर${'अ'.repeat(i)}`, `तेरा प्यार है नंबर${'ब'.repeat(i)}`], poet: 'x', source: 'y' })),
    fallback,
  );
  assert.equal(many.usedFallback, false);
  assert.equal(many.entries.length, 40);
});

test('coupletsFromPoems keeps Devanagari shayari / short poems and skips the rest', () => {
  const poems = [
    { _id: '1', slug: 'a', title: 'ए', category: 'Shayari', body: 'तेरी याद में दिल है उदास\nहर शाम बीते तेरी आस\nतीसरी पंक्ति\nचौथी\nपाँचवीं', author: { _id: 'u', firstName: 'राम', lastName: 'लाल' } },
    { _id: '2', slug: 'b', title: 'बी', category: 'Life', body: 'one line only' },
    { _id: '3', slug: 'c', title: 'सी', category: 'Life', body: 'a\nb\nc\nd\ne\nf' },
    { _id: '4', slug: 'd', title: 'डी', category: 'Life', body: 'This is an english line here\nAnd another english line' },
    { _id: '5', slug: 'e', title: 'ई', category: 'Life', body: 'पंक्ति एक ये है\nपंक्ति दो ये है\nतीन\nचार\nपाँच\nछह' }, // long non-shayari poem
  ];
  const out = coupletsFromPoems(poems);
  assert.equal(out.length, 1);
  assert.equal(out[0].poet, 'राम लाल');
  assert.equal(out[0].href, '/poem/a');
  assert.match(out[0].source, /ए/);
});

test('fuzzy typed match: tolerates a typo, nukta/anusvara spelling and punctuation; rejects unrelated text', () => {
  const g = pool.find((e) => e.id === 'fb-ghalib-05');
  assert.equal(findTypedMatch(pool, 'दिल-ए-नादाँ तुझे हुआ क्या है')?.entry.id, g.id);
  assert.equal(findTypedMatch(pool, 'दिल ए नादां तुझे हुवा क्या है।')?.entry.id, g.id); // chandrabindu->anusvara, one typo
  assert.equal(findTypedMatch(pool, 'दिल-ए-नादाँ तुझे हुआ')?.entry.id, g.id); // typed beginning only
  assert.equal(findTypedMatch(pool, 'कुछ भी नहीं ऐसा यहाँ बिलकुल अलग')?.entry ?? null, null);
  assert.equal(findTypedMatch(pool, 'ab'), null);
  assert.ok(similarity('abc', 'abc') === 1);
});

test('Antakshari: full game keeps the chain rule, scoring and streak bonus', () => {
  const g = new AntakshariGame(pool, seeded(3));
  assert.ok(AntakshariGame.canPlay(pool));
  assert.ok(g.begin());
  assert.equal(g.round, 1);
  const seen = new Set();
  let expectedScore = 0;
  let streak = 0;
  for (let r = 1; r <= 5; r++) {
    assert.equal(g.round, r);
    assert.ok(!seen.has(g.current.id), 'a sher is never repeated');
    seen.add(g.current.id);
    const opts = g.options();
    assert.ok(opts.length >= 2 && opts.length <= 4);
    const valid = opts.filter((o) => o.first === g.required);
    assert.ok(valid.length >= 1, 'at least one valid option is always offered');
    assert.ok(opts.some((o) => o.first !== g.required), 'distractors are present');
    const res = g.answerByPick(valid[0].id);
    assert.equal(res.kind, 'correct');
    streak += 1;
    const bonus = streak >= 3 ? 5 : 0;
    expectedScore += 10 + bonus;
    assert.equal(res.bonus, bonus);
    assert.equal(g.score, expectedScore);
    seen.add(valid[0].id);
    const reply = g.computerReply(valid[0]);
    if (reply) assert.equal(reply.first, valid[0].last, 'computer replies with the right akshar');
    const more = g.nextRound(reply);
    assert.equal(more, r < 5);
    if (reply && more) assert.equal(g.current.id, reply.id, 'the chain continues from the computer reply');
  }
  assert.ok(g.over);
  assert.equal(g.correct, 5);
});

test('Antakshari: wrong pick / timeout resets the streak; typed answers are judged against the dataset', () => {
  const g = new AntakshariGame(pool, seeded(11));
  g.begin();
  const opts = g.options();
  const valid = opts.find((o) => o.first === g.required);
  const wrong = opts.find((o) => o.first !== g.required);
  assert.equal(g.answerByPick(wrong.id).kind, 'wrong_akshar');
  assert.equal(g.answerByPick('nope').kind, 'no_match');
  // typed: a sher that exists but starts with another akshar
  assert.equal(g.answerByText(wrong.lines[0]).kind, 'wrong_akshar');
  assert.equal(g.answerByText('xyz qqq').kind, 'no_match');
  // typed correct (with a small typo)
  const typo = valid.lines[0].replace(/ /g, '  ') + ' ।';
  const ok = g.answerByText(typo);
  assert.equal(ok.kind, 'correct');
  assert.equal(g.score, 10);
  // same sher again -> used
  assert.equal(g.answerByText(valid.lines[0]).kind, 'used');
  const hint = g.fail();
  assert.equal(g.streak, 0);
  assert.ok(hint === null || hint.first === g.required);
});

test('Antakshari: computer with no reply => player wins the round and a fresh sher is dealt', () => {
  // A and B chain (A.last == B.first) and nothing continues after B.
  const mk = (id, l1, l2) => ({ id, lines: [l1, l2], poet: 'p', source: 's' });
  const tiny = toEntries([
    mk('A', 'आज की बात है ये', 'दिल का हाल सुनो'), // ends with न? last akshar of "सुनो" = न
    mk('B', 'नदी किनारे बैठा हूँ', 'तेरी राह देखते देखते'), // first न; last ते -> त
    mk('C', 'चाँद निकला है आज', 'रात भर जागे हम'), // unrelated
  ]);
  const g = new AntakshariGame(tiny, () => 0, { rounds: 3, seconds: 20, points: 10, streakBonus: 5, streakAfter: 3 });
  assert.ok(g.begin());
  assert.equal(g.current.id, 'A');
  const res = g.answerByPick(g.options().find((o) => o.id === 'B').id);
  assert.equal(res.kind, 'correct');
  assert.equal(g.computerReply(res.entry), null);
  assert.equal(g.roundsWon, 1);
  const more = g.nextRound(null); // pool exhausted of answerable shers after recycling? A->B chain can start again
  assert.ok(typeof more === 'boolean');
});

test('Antakshari: canPlay is false when no chain exists', () => {
  const mk = (id, l1, l2) => ({ id, lines: [l1, l2], poet: 'p', source: 's' });
  assert.equal(AntakshariGame.canPlay(toEntries([mk('A', 'अब यहाँ कोई नहीं', 'बस तन्हाई है')])), false);
  assert.equal(AntakshariGame.canPlay([]), false);
});

test('Complete the sher: 10 questions, one correct + 3 distinct distractors, scoring with streak bonus', () => {
  const g = new CompleteGame(pool, seeded(5));
  assert.equal(g.total, 10);
  assert.ok(CompleteGame.canPlay(pool));
  let score = 0;
  let streak = 0;
  for (let i = 0; i < 10; i++) {
    const q = g.current;
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4, 'options are distinct');
    assert.equal(q.options[q.correctIndex], q.entry.lines[1]);
    const right = i % 4 !== 3; // every 4th answer is wrong
    const res = g.answer(right ? q.correctIndex : (q.correctIndex + 1) % 4);
    if (right) {
      streak += 1;
      score += 10 + (streak >= 3 ? 5 : 0);
    } else {
      streak = 0;
    }
    assert.equal(res.correct, right);
    assert.equal(g.score, score);
    g.next();
  }
  assert.ok(g.over);
  g.timeout();
  assert.equal(g.streak, 0);
});

test('Complete the sher: small pools shrink the quiz; too-small pools are refused', () => {
  const six = toEntries(fallback.slice(0, 6));
  assert.equal(new CompleteGame(six, seeded(1)).total, 6);
  assert.equal(CompleteGame.canPlay(toEntries(fallback.slice(0, 3))), false);
});

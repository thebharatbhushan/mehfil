'use client';

import { useEffect, useState } from 'react';

/**
 * Decorative hero for the games hub: a classic sher that types itself line by line, holds, fades and
 * moves to the next one. Purely visual (aria-hidden), so the page's real content/SEO is untouched.
 * Text is split by grapheme cluster so Devanagari conjuncts and matras never render half-formed.
 */
type Couplet = { a: string; b: string; by: string };

const COUPLETS: Couplet[] = [
  { a: 'हज़ारों ख़्वाहिशें ऐसी कि हर ख़्वाहिश पे दम निकले', b: 'बहुत निकले मिरे अरमान लेकिन फिर भी कम निकले', by: 'मिर्ज़ा ग़ालिब' },
  { a: 'सितारों से आगे जहाँ और भी हैं', b: 'अभी इश्क़ के इम्तिहाँ और भी हैं', by: 'अल्लामा इक़बाल' },
  { a: 'पत्ता पत्ता बूटा बूटा हाल हमारा जाने है', b: 'जाने न जाने गुल ही न जाने बाग़ तो सारा जाने है', by: 'मीर तक़ी मीर' },
  { a: 'हम को मालूम है जन्नत की हक़ीक़त लेकिन', b: 'दिल के ख़ुश रखने को ग़ालिब ये ख़याल अच्छा है', by: 'मिर्ज़ा ग़ालिब' },
];

function graphemes(s: string): string[] {
  try {
    const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment: (t: string) => Iterable<{ segment: string }> } }).Segmenter;
    if (Seg) return Array.from(new Seg('hi', { granularity: 'grapheme' }).segment(s), (x) => x.segment);
  } catch {
    /* fall through */
  }
  return Array.from(s);
}

const SEGS = COUPLETS.map((c) => ({ a: graphemes(c.a), b: graphemes(c.b) }));

export default function SherTypewriter() {
  const [i, setI] = useState(0);
  const [n1, setN1] = useState(0);
  const [n2, setN2] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN1(SEGS[0].a.length);
      setN2(SEGS[0].b.length);
      return;
    }
    let dead = false;
    let timer: ReturnType<typeof setTimeout>;
    const wait = (ms: number) => new Promise<void>((r) => { timer = setTimeout(r, ms); });
    const tick = () => 42 + Math.random() * 34;

    (async () => {
      await wait(500);
      let k = 0;
      while (!dead) {
        setI(k);
        setOut(false);
        for (let n = 1; n <= SEGS[k].a.length; n++) { if (dead) return; setN1(n); await wait(tick()); }
        await wait(380);
        for (let n = 1; n <= SEGS[k].b.length; n++) { if (dead) return; setN2(n); await wait(tick()); }
        await wait(3200);
        if (dead) return;
        setOut(true);
        await wait(650);
        setN1(0);
        setN2(0);
        k = (k + 1) % SEGS.length;
        await wait(250);
      }
    })();

    return () => { dead = true; clearTimeout(timer); };
  }, []);

  const c = COUPLETS[i];
  const s = SEGS[i];
  const done = n2 >= s.b.length && n2 > 0;

  return (
    <figure className={`gh-sher${out ? ' is-out' : ''}`} aria-hidden="true">
      <div className="gh-sher-line">
        <span className="gh-sizer">{c.a}</span>
        <span className="gh-typed">
          {s.a.slice(0, n1).join('')}
          {n2 === 0 && <i className="gh-caret" />}
        </span>
      </div>
      <div className="gh-sher-line">
        <span className="gh-sizer">{c.b}</span>
        <span className="gh-typed">
          {s.b.slice(0, n2).join('')}
          {n2 > 0 && !done && <i className="gh-caret" />}
        </span>
      </div>
      <figcaption className={`gh-by${done ? ' is-on' : ''}`}>— {c.by}</figcaption>
    </figure>
  );
}

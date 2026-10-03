'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, type Poem } from '@/lib/mehfil';
import { pickSherOfTheDay, type Sher } from '@/lib/daily';

interface Props {
  poems: Poem[];
  /** Wait for the poems request so the card doesn't swap content after first paint. */
  ready: boolean;
}

export function SherOfTheDay({ poems, ready }: Props) {
  const [sher, setSher] = useState<Sher | null>(null);

  // Chosen after mount: "today" depends on the reader's local date, which the server can't know.
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    const loadConfiguredSher = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/daily/sher`, { cache: 'no-store' });
        const data = await response.json();

        if (!cancelled && data.success && data.configured && data.sher?.lines?.length >= 2) {
          setSher({
            lines: [data.sher.lines[0], data.sher.lines[1]],
            poet: data.sher.writerName || 'अज्ञात शायर',
            tag: data.sher.tag || undefined,
            href: data.sher.href,
          });
          return;
        }
      } catch {
        // Fall back to the existing deterministic local selection.
      }

      if (!cancelled) setSher(pickSherOfTheDay(poems));
    };

    loadConfiguredSher();
    return () => { cancelled = true; };
  }, [poems, ready]);

  const body = sher && (
    <>
      <blockquote className="sher-text">
        <p>{sher.lines[0]}</p>
        <p>{sher.lines[1]}</p>
      </blockquote>
      <div className="sher-ornament" aria-hidden="true"><span /><i>❦</i><span /></div>
      <div className="sher-meta">
        <cite className="sher-poet">&mdash; {sher.poet}</cite>
        {sher.tag && <span className="sher-tag">{sher.tag}</span>}
      </div>
    </>
  );

  return (
    <section className="daily-card sher-card" aria-labelledby="sher-heading">
      <span className="sher-mark" aria-hidden="true">&ldquo;</span>
      <header className="daily-head">
        <span className="daily-kicker">शेर-ए-रोज़</span>
        <h2 id="sher-heading" className="daily-title">आज का शेर</h2>
      </header>
      {sher ? (
        sher.href ? (
          <Link href={sher.href} className="sher-link" aria-label={`${sher.poet} की पूरी रचना पढ़ें`}>
            {body}
          </Link>
        ) : (
          <div className="sher-link sher-static">{body}</div>
        )
      ) : (
        <div className="sher-skeleton" aria-hidden="true"><span /><span /></div>
      )}
    </section>
  );
}

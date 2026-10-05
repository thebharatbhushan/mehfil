'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, type Poem } from '@/lib/mehfil';
import { localDayNumber, pickSherOfTheDay, type Sher } from '@/lib/daily';

interface Props {
  poems: Poem[];
  ready: boolean;
}

function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextLocalMidnightDelay(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 250);
  return Math.max(1000, next.getTime() - now.getTime());
}

export function SherOfTheDay({ poems, ready }: Props) {
  const [sher, setSher] = useState<Sher | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    const loadConfiguredSher = async () => {
      const dateKey = localDateKey();

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/daily/sher?date=${encodeURIComponent(dateKey)}`,
          { cache: 'no-store' },
        );
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

      if (!cancelled) setSher(pickSherOfTheDay(poems, localDayNumber()));
    };

    const refresh = async () => {
      if (cancelled) return;
      await loadConfiguredSher();
      if (!cancelled) timerRef.current = setTimeout(refresh, nextLocalMidnightDelay());
    };

    refresh();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadConfiguredSher();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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
        <span className="daily-kicker">काव्य-ए-रोज़</span>
        <h2 id="sher-heading" className="daily-title">आज का काव्य</h2>
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

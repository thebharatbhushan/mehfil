'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/mehfil';
import { localDayNumber, pickLafzOfTheDay, type Lafz } from '@/lib/daily';

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

export function LafzOfTheDay() {
  const [lafz, setLafz] = useState<Lafz | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLafz = useCallback(async () => {
    const dateKey = localDateKey();

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/daily/lafz?date=${encodeURIComponent(dateKey)}`,
        { cache: 'no-store' },
      );
      const data = await response.json();

      if (data.success && data.configured && data.lafz) {
        setLafz(data.lafz as Lafz);
        return;
      }
    } catch (error) {
      console.error('Failed to load Word of the Day:', error);
    }

    // Keep the existing automatic daily word as a safe fallback.
    setLafz(pickLafzOfTheDay(localDayNumber()));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;
      await loadLafz();

      if (cancelled) return;
      timerRef.current = setTimeout(refresh, nextLocalMidnightDelay());
    };

    refresh();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadLafz();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadLafz]);

  return (
    <section className="daily-card lafz-card" aria-labelledby="lafz-heading">
      <header className="daily-head">
        <span className="daily-kicker">Word of the Day</span>
        <h2 id="lafz-heading" className="daily-title">आज का लफ़्ज़</h2>
      </header>

      {lafz ? (
        <div className="lafz-body">
          <div className="lafz-word-col">
            <div className="lafz-word">{lafz.word}</div>
            {lafz.urdu ? (
              <div className="lafz-urdu" lang="ur" dir="rtl">{lafz.urdu}</div>
            ) : null}
            {lafz.roman ? <div className="lafz-roman">/{lafz.roman}/</div> : null}
          </div>
          <div className="lafz-detail-col">
            <dl className="lafz-meaning">
              <dt>अर्थ</dt>
              <dd>
                {lafz.meaning}
                {lafz.english ? (
                  <>
                    {' '}<span className="lafz-sep">/</span>{' '}
                    <span className="lafz-english">{lafz.english}</span>
                  </>
                ) : null}
              </dd>
            </dl>
            <p className="lafz-explain">{lafz.explanation}</p>
            <p className="lafz-example">&ldquo;{lafz.example}&rdquo;</p>
          </div>
        </div>
      ) : (
        <div className="sher-skeleton" aria-hidden="true"><span /><span /></div>
      )}
    </section>
  );
}

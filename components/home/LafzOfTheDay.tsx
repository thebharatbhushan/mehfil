'use client';

import { useEffect, useState } from 'react';
import { pickLafzOfTheDay, type Lafz } from '@/lib/daily';

export function LafzOfTheDay() {
  const [lafz, setLafz] = useState<Lafz | null>(null);

  useEffect(() => {
    setLafz(pickLafzOfTheDay());
  }, []);

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
            <div className="lafz-urdu" lang="ur" dir="rtl">{lafz.urdu}</div>
            <div className="lafz-roman">/{lafz.roman}/</div>
          </div>
          <div className="lafz-detail-col">
            <dl className="lafz-meaning">
              <dt>अर्थ</dt>
              <dd>
                {lafz.meaning} <span className="lafz-sep">/</span>{' '}
                <span className="lafz-english">{lafz.english}</span>
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

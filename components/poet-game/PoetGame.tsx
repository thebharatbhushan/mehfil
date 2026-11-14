'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PoetGame as Game, canPlay, type Question, type QuestionBank } from '@/lib/poet-game/engine';
import { loadQuestionBank } from '@/lib/poet-game/loadQuestions';
import { getBest, saveBest } from '@/lib/poet-game/storage';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'empty' } | { state: 'ready'; bank: QuestionBank };

export function PoetGame() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ state: 'loading' });
    loadQuestionBank()
      .then((bank) => alive && setLoad(canPlay(bank) ? { state: 'ready', bank } : { state: 'empty' }))
      .catch((err) => {
        console.error('[Guess the Poet] could not load questions', err);
        if (alive) setLoad({ state: 'error' });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (load.state === 'loading') {
    return (
      <div className="pg-wrap" lang="hi">
        <div className="pg-status" role="status">
          <span className="pg-spin" aria-hidden="true" />
          खेल तैयार हो रहा है…
        </div>
      </div>
    );
  }
  if (load.state === 'error') {
    return (
      <div className="pg-wrap" lang="hi">
        <div className="pg-status" role="alert">
          सवाल लोड नहीं हो सके। कृपया दोबारा कोशिश कीजिए।
          <button type="button" className="pg-btn" onClick={() => setAttempt((n) => n + 1)}>
            दोबारा कोशिश करें
          </button>
        </div>
      </div>
    );
  }
  if (load.state === 'empty') {
    return (
      <div className="pg-wrap" lang="hi">
        <div className="pg-status" role="status">
          अभी इस खेल के लिए पर्याप्त सवाल उपलब्ध नहीं हैं। कुछ देर बाद फिर आइए।
        </div>
      </div>
    );
  }
  return <Round bank={load.bank} />;
}

function Round({ bank }: { bank: QuestionBank }) {
  // The Game object is mutable engine state; `tick` re-renders after each change.
  const gameRef = useRef<Game | null>(null);
  const [, setTick] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  const start = useCallback(() => {
    gameRef.current = new Game(bank);
    setPicked(null);
    setFinished(false);
    setBest(null);
    setTick((n) => n + 1);
  }, [bank]);

  useEffect(() => {
    start();
  }, [start]);

  const game = gameRef.current;
  const q: Question | null = game?.current ?? null;

  useEffect(() => {
    if (picked !== null) nextRef.current?.focus({ preventScroll: true });
  }, [picked]);
  useEffect(() => {
    if (finished) againRef.current?.focus({ preventScroll: true });
  }, [finished]);

  if (!game) return null;

  const choose = (i: number) => {
    if (picked !== null) return;
    const res = game.answer(i);
    if (res.alreadyAnswered) return;
    setPicked(i);
  };

  const advance = () => {
    if (game.next()) {
      setPicked(null);
    } else {
      setBest(saveBest(game.score));
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="pg-wrap" lang="hi">
        <div className="pg-body pg-result">
          <p className="pg-eyebrow">शेर पहचानिए</p>
          <h2 className="pg-title">खेल ख़त्म</h2>
          <p className="pg-score-big" aria-label={`${game.total} में से ${game.score} सही`}>
            {game.score}/{game.total}
          </p>
          <p className="pg-lead">{game.total} में से {game.score} सही</p>
          {best && (
            <p className={best.isNew ? 'pg-best is-new' : 'pg-best'}>
              {best.isNew ? `नया सर्वश्रेष्ठ स्कोर: ${best.best}` : `सर्वश्रेष्ठ स्कोर: ${best.best}`}
            </p>
          )}
          <div className="pg-actions">
            <button ref={againRef} type="button" className="pg-btn" onClick={start}>
              फिर खेलें
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="pg-wrap" lang="hi">
        <div className="pg-status" role="status">
          अभी इस खेल के लिए पर्याप्त सवाल उपलब्ध नहीं हैं।
        </div>
      </div>
    );
  }

  const answered = picked !== null;
  const wasCorrect = answered && picked === q.correctIndex;
  const correctPoet = q.options[q.correctIndex];
  const isLast = game.index + 1 >= game.total;

  return (
    <div className="pg-wrap" lang="hi">
      <div className="pg-body">
        <div className="pg-hud">
          <span>सवाल {game.index + 1}/{game.total}</span>
          <span>अंक {game.score}</span>
        </div>
        <div className="pg-progress" aria-hidden="true">
          <span style={{ width: `${(game.index / game.total) * 100}%` }} />
        </div>

        <p className="pg-label">यह शेर किस शायर का है?</p>
        <blockquote className="pg-sher">
          <p className="pg-sher-line">{q.lines[0]}</p>
          <p className="pg-sher-line">{q.lines[1]}</p>
        </blockquote>

        <div className="pg-options" role="group" aria-label="शायर के विकल्प">
          {q.options.map((p, i) => {
            const cls = ['pg-option'];
            if (answered && i === q.correctIndex) cls.push('is-correct');
            else if (answered && i === picked) cls.push('is-wrong');
            return (
              <button key={p.id} type="button" className={cls.join(' ')} disabled={answered} onClick={() => choose(i)}>
                <span className="pg-opt-name">{p.name}</span>
                {p.en && <span className="pg-opt-en" lang="en">{p.en}</span>}
              </button>
            );
          })}
        </div>

        <p className={`pg-msg${answered ? (wasCorrect ? ' is-good' : ' is-bad') : ''}`} role="status" aria-live="polite">
          {answered && (wasCorrect ? `वाह! सही जवाब — ${correctPoet.name}` : `ग़लत जवाब। सही शायर: ${correctPoet.name}`)}
        </p>

        {answered && (
          <button ref={nextRef} type="button" className="pg-btn" onClick={advance}>
            {isLast ? 'नतीजा देखिए' : 'अगला सवाल'}
          </button>
        )}
      </div>
    </div>
  );
}

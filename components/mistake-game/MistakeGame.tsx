'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MistakeGame as Game, canPlay, mistakeTokenId, performance, tokensOf, words, type Question } from '@/lib/mistake-game/engine';
import { loadQuestions } from '@/lib/mistake-game/loadQuestions';
import { saveBest } from '@/lib/mistake-game/storage';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'empty' } | { state: 'ready'; questions: Question[] };

export function MistakeGame() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ state: 'loading' });
    loadQuestions()
      .then((questions) => alive && setLoad(canPlay(questions) ? { state: 'ready', questions } : { state: 'empty' }))
      .catch((err) => {
        console.error('[Spot the Mistake] could not load questions', err);
        if (alive) setLoad({ state: 'error' });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (load.state === 'loading') {
    return (
      <div className="ms-wrap" lang="hi">
        <div className="ms-status" role="status">
          <span className="ms-spin" aria-hidden="true" />
          खेल तैयार हो रहा है…
        </div>
      </div>
    );
  }
  if (load.state === 'error') {
    return (
      <div className="ms-wrap" lang="hi">
        <div className="ms-status" role="alert">
          शेर लोड नहीं हो सके। कृपया दोबारा कोशिश कीजिए।
          <button type="button" className="ms-btn" onClick={() => setAttempt((n) => n + 1)}>
            दोबारा कोशिश करें
          </button>
        </div>
      </div>
    );
  }
  if (load.state === 'empty') {
    return (
      <div className="ms-wrap" lang="hi">
        <div className="ms-status" role="status">
          अभी इस खेल के लिए पर्याप्त शेर उपलब्ध नहीं हैं। कुछ देर बाद फिर आइए।
        </div>
      </div>
    );
  }
  return <Round questions={load.questions} />;
}

function Round({ questions }: { questions: Question[] }) {
  const gameRef = useRef<Game | null>(null);
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  const start = useCallback(() => {
    gameRef.current = new Game(questions);
    setFinished(false);
    setBest(null);
    setTick((n) => n + 1);
  }, [questions]);

  useEffect(() => {
    start();
  }, [start]);

  const game = gameRef.current;
  const checked = game?.checked ?? false;
  useEffect(() => {
    if (checked) nextRef.current?.focus({ preventScroll: true });
  }, [checked]);
  useEffect(() => {
    if (finished) againRef.current?.focus({ preventScroll: true });
  }, [finished]);

  if (!game) return null;
  const q = game.current;

  if (finished) {
    return (
      <div className="ms-wrap" lang="hi">
        <div className="ms-body ms-result">
          <p className="ms-eyebrow">ग़लती पकड़िए</p>
          <h2 className="ms-title">खेल ख़त्म</h2>
          <p className="ms-score-big" aria-label={`${game.attempted} में से ${game.score} सही`}>
            {game.score}/{game.total}
          </p>
          <ul className="ms-stats">
            <li>कुल शेर: <strong>{game.total}</strong></li>
            <li>पूरे किए: <strong>{game.attempted}</strong></li>
            <li>ग़लती पकड़ी: <strong>{game.correctCount}</strong></li>
          </ul>
          <p className="ms-verdict">{performance(game.score, game.total)}</p>
          {best && (
            <p className={best.isNew ? 'ms-best is-new' : 'ms-best'}>
              {best.isNew ? `नया सर्वश्रेष्ठ स्कोर: ${best.best}` : `सर्वश्रेष्ठ स्कोर: ${best.best}`}
            </p>
          )}
          <div className="ms-actions">
            <button ref={againRef} type="button" className="ms-btn" onClick={start}>
              दोबारा खेलें
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="ms-wrap" lang="hi">
        <div className="ms-status" role="status">अभी इस खेल के लिए पर्याप्त शेर उपलब्ध नहीं हैं।</div>
      </div>
    );
  }

  const lines = tokensOf(q);
  const wrongId = mistakeTokenId(q);
  const selected = game.selected;
  const isLast = game.index + 1 >= game.total;

  const pick = (id: string) => {
    if (game.select(id)) rerender();
  };
  const check = () => {
    if (game.check().counted) rerender();
  };
  const next = () => {
    if (game.next()) {
      rerender();
    } else {
      setBest(saveBest(game.score));
      setFinished(true);
    }
  };

  return (
    <div className="ms-wrap" lang="hi">
      <div className="ms-body">
        <div className="ms-hud">
          <span>शेर {game.index + 1}/{game.total}</span>
          <span>अंक {game.score}</span>
        </div>
        <div className="ms-progress" aria-hidden="true">
          <span style={{ width: `${(game.index / game.total) * 100}%` }} />
        </div>

        <p className="ms-label">इस शेर में एक शब्द बदल दिया गया है। उस ग़लत शब्द को छूकर चुनिए, फिर "जाँचिए" दबाइए।</p>

        <div className="ms-sher" role="group" aria-label="शेर, कोई एक शब्द चुनिए">
          {lines.map((line, l) => (
            <p key={l} className="ms-line">
              {line.map((t) => {
                const isWrong = t.id === wrongId;
                const isPick = t.id === selected;
                const cls = ['ms-word'];
                if (!checked && isPick) cls.push('is-selected');
                if (checked && isWrong) cls.push('is-mistake');
                if (checked && isPick && !isWrong) cls.push('is-missed');
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={cls.join(' ')}
                    disabled={checked}
                    aria-pressed={!checked ? isPick : undefined}
                    aria-label={checked ? `${t.text}${isWrong ? ', यही बदला हुआ ग़लत शब्द है' : ''}${isPick ? ', आपका चुनाव' : ''}` : undefined}
                    onClick={() => pick(t.id)}
                  >
                    {checked && isWrong && <span className="ms-mark" aria-hidden="true">✗&nbsp;</span>}
                    {checked && isPick && !isWrong && <span className="ms-mark" aria-hidden="true">आपका चुनाव · </span>}
                    {t.text}
                  </button>
                );
              })}
            </p>
          ))}
        </div>

        <p className={`ms-msg${checked ? (game.lastCorrect ? ' is-good' : ' is-bad') : ''}`} role="status" aria-live="polite">
          {checked
            ? game.lastCorrect
              ? '✓ वाह! आपने ग़लत शब्द पकड़ लिया।'
              : `✗ ग़लत चुनाव। बदला हुआ शब्द था: "${q.mistake.replacement}"`
            : selected
              ? 'शब्द चुन लिया। अब "जाँचिए" दबाइए, या दूसरा शब्द चुनिए।'
              : ''}
        </p>

        {!checked && (
          <button type="button" className="ms-btn" onClick={check} disabled={!selected}>
            जाँचिए
          </button>
        )}

        {checked && (
          <>
            <button ref={nextRef} type="button" className="ms-btn" onClick={next}>
              {isLast ? 'नतीजा देखिए' : 'अगला शेर'}
            </button>
            <blockquote className="ms-original">
              <p className="ms-original-head">मूल शेर</p>
              {q.original.map((line, l) => (
                <p key={l} className="ms-original-line">
                  {words(line).map((w, i) => (
                    <span key={i}>
                      {l === q.mistake.line && i === q.mistake.index ? <mark className="ms-fix">{w}</mark> : w}
                      {' '}
                    </span>
                  ))}
                </p>
              ))}
              <cite className="ms-cite">— {q.poet}</cite>
              {q.note && <p className="ms-note">{q.note}</p>}
            </blockquote>
          </>
        )}
      </div>
    </div>
  );
}

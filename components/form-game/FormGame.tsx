'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FORMS, FORM_DEF, FORM_LABEL, FormGame as Game, canPlay, performance, type Level, type Question } from '@/lib/form-game/engine';
import { loadQuestions } from '@/lib/form-game/loadQuestions';
import { saveBest } from '@/lib/form-game/storage';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'empty' } | { state: 'ready'; questions: Question[] };

const LEVEL_LABEL: Record<Level, string> = { easy: 'आसान', medium: 'मध्यम', hard: 'कठिन' };
const LETTERS = ['A', 'B', 'C', 'D'];
const VERDICT = (ok: boolean) => (ok ? '✓ सही' : '✗ ग़लत');

export function FormGame() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ state: 'loading' });
    loadQuestions()
      .then((questions) => alive && setLoad(canPlay(questions) ? { state: 'ready', questions } : { state: 'empty' }))
      .catch((err) => {
        console.error('[Form Game] could not load questions', err);
        if (alive) setLoad({ state: 'error' });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (load.state === 'loading') {
    return (
      <div className="fg-wrap" lang="hi">
        <div className="fg-status" role="status">
          <span className="fg-spin" aria-hidden="true" />
          खेल तैयार हो रहा है…
        </div>
      </div>
    );
  }
  if (load.state === 'error') {
    return (
      <div className="fg-wrap" lang="hi">
        <div className="fg-status" role="alert">
          रचनाएँ लोड नहीं हो सकीं। कृपया दोबारा कोशिश कीजिए।
          <button type="button" className="fg-btn" onClick={() => setAttempt((n) => n + 1)}>
            दोबारा कोशिश करें
          </button>
        </div>
      </div>
    );
  }
  if (load.state === 'empty') {
    return (
      <div className="fg-wrap" lang="hi">
        <div className="fg-status" role="status">
          अभी इस खेल के लिए पर्याप्त रचनाएँ उपलब्ध नहीं हैं। कुछ देर बाद फिर आइए।
        </div>
      </div>
    );
  }
  return <Round questions={load.questions} />;
}

function Round({ questions }: { questions: Question[] }) {
  const gameRef = useRef<Game | null>(null);
  const [, setTick] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  const start = useCallback(() => {
    gameRef.current = new Game(questions);
    setPicked(null);
    setFinished(false);
    setBest(null);
    setTick((n) => n + 1);
  }, [questions]);

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (picked !== null) nextRef.current?.focus({ preventScroll: true });
  }, [picked]);
  useEffect(() => {
    if (finished) againRef.current?.focus({ preventScroll: true });
  }, [finished]);

  const game = gameRef.current;
  if (!game) return null;
  const round = game.current;

  const choose = (i: number) => {
    if (picked !== null) return;
    if (game.answer(i).alreadyAnswered) return;
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
      <div className="fg-wrap" lang="hi">
        <div className="fg-body fg-result">
          <p className="fg-eyebrow">रचना पहचानिए</p>
          <h2 className="fg-title">खेल ख़त्म</h2>
          <p className="fg-score-big" aria-label={`${game.attempted} में से ${game.score} सही`}>
            {game.score}/{game.total}
          </p>
          <p className="fg-lead">{game.attempted} सवालों में से {game.score} सही</p>
          <p className="fg-verdict">{performance(game.score, game.total)}</p>
          <ul className="fg-cats" aria-label="रूप के अनुसार नतीजा">
            {FORMS.filter((f) => game.byForm[f]).map((f) => (
              <li key={f}>
                <span>{FORM_LABEL[f].hi}</span>
                <strong>{game.byForm[f]!.correct}/{game.byForm[f]!.attempted}</strong>
              </li>
            ))}
          </ul>
          <ul className="fg-sheet" aria-label="पाँच रूपों की पहचान">
            {FORMS.map((f) => (
              <li key={f}>
                <strong>{FORM_LABEL[f].hi} · {FORM_LABEL[f].en}</strong>
                {FORM_DEF[f]}
              </li>
            ))}
          </ul>
          {best && (
            <p className={best.isNew ? 'fg-best is-new' : 'fg-best'}>
              {best.isNew ? `नया सर्वश्रेष्ठ स्कोर: ${best.best}` : `सर्वश्रेष्ठ स्कोर: ${best.best}`}
            </p>
          )}
          <div className="fg-actions">
            <button ref={againRef} type="button" className="fg-btn" onClick={start}>
              दोबारा खेलें
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="fg-wrap" lang="hi">
        <div className="fg-status" role="status">अभी इस खेल के लिए पर्याप्त रचनाएँ उपलब्ध नहीं हैं।</div>
      </div>
    );
  }

  const q = round.q;
  const answered = picked !== null;
  const wasCorrect = answered && picked === round.correctIndex;
  const isLast = game.index + 1 >= game.total;

  return (
    <div className="fg-wrap" lang="hi">
      <div className="fg-body">
        <div className="fg-hud">
          <span>सवाल {game.index + 1}/{game.total}</span>
          <span>अंक {game.score}</span>
        </div>
        <div className="fg-progress" aria-hidden="true">
          <span style={{ width: `${(game.index / game.total) * 100}%` }} />
        </div>

        <p className="fg-tags">
          <span className={q.kind === 'example' ? 'fg-tag-ex' : undefined}>{q.kind === 'example' ? 'शैक्षिक उदाहरण' : 'प्रकाशित रचना'}</span>
          <span>{LEVEL_LABEL[q.level]}</span>
        </p>
        <p className="fg-label">यह रचना किस रूप की है?</p>
        <blockquote className="fg-poem" lang="hi">
          {q.title && <p className="fg-poem-title">{q.title}</p>}
          {q.lines.map((l, i) => (l ? <p key={i} className="fg-line">{l}</p> : <div key={i} className="fg-gap" aria-hidden="true" />))}
          {answered && q.kind === 'attributed' && <p className="fg-poem-by">— {q.poet}, {q.work}</p>}
        </blockquote>

        <div className="fg-options" role="group" aria-label="रूप के विकल्प">
          {round.options.map((f, i) => {
            const cls = ['fg-option'];
            if (answered && i === round.correctIndex) cls.push('is-correct');
            else if (answered && i === picked) cls.push('is-wrong');
            return (
              <button key={f} type="button" className={cls.join(' ')} disabled={answered} onClick={() => choose(i)}>
                <span className="fg-letter" aria-hidden="true">{LETTERS[i]}</span>
                <span className="fg-opt-text">
                  {FORM_LABEL[f].hi}
                  <span className="fg-opt-en">{FORM_LABEL[f].en}</span>
                </span>
                {answered && (i === round.correctIndex || i === picked) && (
                  <span className="fg-mark">{VERDICT(i === round.correctIndex)}</span>
                )}
              </button>
            );
          })}
        </div>

        <p className={`fg-msg${answered ? (wasCorrect ? ' is-good' : ' is-bad') : ''}`} role="status" aria-live="polite">
          {answered && (wasCorrect ? 'वाह! सही जवाब।' : `ग़लत जवाब। सही रूप: ${FORM_LABEL[q.form].hi}`)}
        </p>

        {answered && (
          <>
            <button ref={nextRef} type="button" className="fg-btn" onClick={advance}>
              {isLast ? 'नतीजा देखिए' : 'अगला सवाल'}
            </button>
            <div className="fg-explain">
              <p>{q.explanation}</p>
              <ul className="fg-markers" aria-label="पहचान के लक्षण">
                {q.markers.map((m) => <li key={m}>{m}</li>)}
              </ul>
              <p className="fg-source">स्रोत: {q.source}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

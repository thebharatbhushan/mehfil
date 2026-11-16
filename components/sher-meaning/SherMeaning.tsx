'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DecodeGame as Game, canPlay, performance, type Level, type Question } from '@/lib/sher-meaning/engine';
import { loadQuestions } from '@/lib/sher-meaning/loadQuestions';
import { saveBest } from '@/lib/sher-meaning/storage';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'empty' } | { state: 'ready'; questions: Question[] };

const LEVEL_LABEL: Record<Level, string> = { easy: 'आसान', medium: 'मध्यम', hard: 'कठिन' };
const LETTERS = ['A', 'B', 'C', 'D'];

export function SherMeaning() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ state: 'loading' });
    loadQuestions()
      .then((questions) => alive && setLoad(canPlay(questions) ? { state: 'ready', questions } : { state: 'empty' }))
      .catch((err) => {
        console.error('[Decode the Sher] could not load questions', err);
        if (alive) setLoad({ state: 'error' });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (load.state === 'loading') {
    return (
      <div className="sm-wrap" lang="hi">
        <div className="sm-status" role="status">
          <span className="sm-spin" aria-hidden="true" />
          खेल तैयार हो रहा है…
        </div>
      </div>
    );
  }
  if (load.state === 'error') {
    return (
      <div className="sm-wrap" lang="hi">
        <div className="sm-status" role="alert">
          शेर लोड नहीं हो सके। कृपया दोबारा कोशिश कीजिए।
          <button type="button" className="sm-btn" onClick={() => setAttempt((n) => n + 1)}>
            दोबारा कोशिश करें
          </button>
        </div>
      </div>
    );
  }
  if (load.state === 'empty') {
    return (
      <div className="sm-wrap" lang="hi">
        <div className="sm-status" role="status">
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
      <div className="sm-wrap" lang="hi">
        <div className="sm-body sm-result">
          <p className="sm-eyebrow">शायरी का मतलब</p>
          <h2 className="sm-title">खेल ख़त्म</h2>
          <p className="sm-score-big" aria-label={`${game.attempted} में से ${game.score} सही`}>
            {game.score}/{game.total}
          </p>
          <p className="sm-lead">{game.attempted} शेरों में से {game.score} का सबसे उपयुक्त अर्थ चुना</p>
          <p className="sm-verdict">{performance(game.score, game.total)}</p>
          {best && (
            <p className={best.isNew ? 'sm-best is-new' : 'sm-best'}>
              {best.isNew ? `नया सर्वश्रेष्ठ स्कोर: ${best.best}` : `सर्वश्रेष्ठ स्कोर: ${best.best}`}
            </p>
          )}
          <div className="sm-actions">
            <button ref={againRef} type="button" className="sm-btn" onClick={start}>
              दोबारा खेलें
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="sm-wrap" lang="hi">
        <div className="sm-status" role="status">अभी इस खेल के लिए पर्याप्त शेर उपलब्ध नहीं हैं।</div>
      </div>
    );
  }

  const q = round.q;
  const answered = picked !== null;
  const wasCorrect = answered && picked === round.correctIndex;
  const isLast = game.index + 1 >= game.total;

  return (
    <div className="sm-wrap" lang="hi">
      <div className="sm-body">
        <div className="sm-hud">
          <span>शेर {game.index + 1}/{game.total}</span>
          <span>अंक {game.score}</span>
        </div>
        <div className="sm-progress" aria-hidden="true">
          <span style={{ width: `${(game.index / game.total) * 100}%` }} />
        </div>

        <blockquote className="sm-sher">
          {q.lines.map((l, i) => (
            <p key={i} className="sm-sher-line">{l}</p>
          ))}
          <cite className="sm-cite">— {q.poet}</cite>
        </blockquote>

        <p className="sm-label">
          इस शेर का <strong>सबसे उपयुक्त अर्थ</strong> कौन-सा है? <span className="sm-level">{LEVEL_LABEL[q.level]}</span>
        </p>

        <div className="sm-options" role="group" aria-label="अर्थ के विकल्प">
          {round.options.map((text, i) => {
            const cls = ['sm-option'];
            if (answered && i === round.correctIndex) cls.push('is-correct');
            else if (answered && i === picked) cls.push('is-wrong');
            return (
              <button key={text} type="button" className={cls.join(' ')} disabled={answered} onClick={() => choose(i)}>
                <span className="sm-letter" aria-hidden="true">{LETTERS[i]}</span>
                <span className="sm-opt-text">
                  {text}
                  {answered && i === round.correctIndex && <span className="sm-tag"> ✓ सबसे उपयुक्त</span>}
                  {answered && i === picked && i !== round.correctIndex && <span className="sm-tag"> ✗ आपका चुनाव</span>}
                </span>
              </button>
            );
          })}
        </div>

        <p className={`sm-msg${answered ? (wasCorrect ? ' is-good' : ' is-bad') : ''}`} role="status" aria-live="polite">
          {answered && (wasCorrect ? '✓ वाह! यही सबसे उपयुक्त अर्थ है।' : '✗ यह सबसे उपयुक्त अर्थ नहीं है। सबसे उपयुक्त विकल्प ✓ के निशान के साथ दिखाया गया है।')}
        </p>

        {answered && (
          <>
            <button ref={nextRef} type="button" className="sm-btn" onClick={advance}>
              {isLast ? 'नतीजा देखिए' : 'अगला शेर'}
            </button>
            <div className="sm-explain">
              <p className="sm-explain-head">सबसे उपयुक्त अर्थ</p>
              <p>{q.answer}</p>
              <p>{q.explanation}</p>
              {q.vocab.length > 0 && (
                <dl className="sm-vocab">
                  {q.vocab.map((v) => (
                    <div key={v.word}>
                      <dt>{v.word}</dt>
                      <dd>{v.meaning}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="sm-source">
                शायरी में एक से अधिक पाठ संभव होते हैं; यहाँ वही अर्थ दिया गया है जिसका पक्ष सबसे मज़बूत है।
                {q.source ? ` स्रोत: ${q.source}` : ''}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

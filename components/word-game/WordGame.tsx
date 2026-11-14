'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WordGame as Game, canPlay, performance, type Level, type Word } from '@/lib/word-game/engine';
import { loadWords } from '@/lib/word-game/loadWords';
import { saveBest } from '@/lib/word-game/storage';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'empty' } | { state: 'ready'; words: Word[] };

const LEVEL_LABEL: Record<Level, string> = { easy: 'आसान', medium: 'मध्यम', hard: 'कठिन' };
const LETTERS = ['A', 'B', 'C', 'D'];

export function WordGame() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ state: 'loading' });
    loadWords()
      .then((words) => alive && setLoad(canPlay(words) ? { state: 'ready', words } : { state: 'empty' }))
      .catch((err) => {
        console.error('[Word Master] could not load words', err);
        if (alive) setLoad({ state: 'error' });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (load.state === 'loading') {
    return (
      <div className="wg-wrap" lang="hi">
        <div className="wg-status" role="status">
          <span className="wg-spin" aria-hidden="true" />
          खेल तैयार हो रहा है…
        </div>
      </div>
    );
  }
  if (load.state === 'error') {
    return (
      <div className="wg-wrap" lang="hi">
        <div className="wg-status" role="alert">
          लफ़्ज़ लोड नहीं हो सके। कृपया दोबारा कोशिश कीजिए।
          <button type="button" className="wg-btn" onClick={() => setAttempt((n) => n + 1)}>
            दोबारा कोशिश करें
          </button>
        </div>
      </div>
    );
  }
  if (load.state === 'empty') {
    return (
      <div className="wg-wrap" lang="hi">
        <div className="wg-status" role="status">
          अभी इस खेल के लिए पर्याप्त लफ़्ज़ उपलब्ध नहीं हैं। कुछ देर बाद फिर आइए।
        </div>
      </div>
    );
  }
  return <Round words={load.words} />;
}

function Round({ words }: { words: Word[] }) {
  const gameRef = useRef<Game | null>(null);
  const [, setTick] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  const start = useCallback(() => {
    gameRef.current = new Game(words);
    setPicked(null);
    setFinished(false);
    setBest(null);
    setTick((n) => n + 1);
  }, [words]);

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
  const q = game.current;

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
      <div className="wg-wrap" lang="hi">
        <div className="wg-body wg-result">
          <p className="wg-eyebrow">लफ़्ज़ का मतलब</p>
          <h2 className="wg-title">खेल ख़त्म</h2>
          <p className="wg-score-big" aria-label={`${game.attempted} में से ${game.score} सही`}>
            {game.score}/{game.total}
          </p>
          <p className="wg-lead">{game.attempted} लफ़्ज़ में से {game.score} सही</p>
          <p className="wg-verdict">{performance(game.score, game.total)}</p>
          {best && (
            <p className={best.isNew ? 'wg-best is-new' : 'wg-best'}>
              {best.isNew ? `नया सर्वश्रेष्ठ स्कोर: ${best.best}` : `सर्वश्रेष्ठ स्कोर: ${best.best}`}
            </p>
          )}
          <div className="wg-actions">
            <button ref={againRef} type="button" className="wg-btn" onClick={start}>
              दोबारा खेलें
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="wg-wrap" lang="hi">
        <div className="wg-status" role="status">
          अभी इस खेल के लिए पर्याप्त लफ़्ज़ उपलब्ध नहीं हैं।
        </div>
      </div>
    );
  }

  const answered = picked !== null;
  const wasCorrect = answered && picked === q.correctIndex;
  const w = q.word;
  const isLast = game.index + 1 >= game.total;

  return (
    <div className="wg-wrap" lang="hi">
      <div className="wg-body">
        <div className="wg-hud">
          <span>लफ़्ज़ {game.index + 1}/{game.total}</span>
          <span>अंक {game.score}</span>
        </div>
        <div className="wg-progress" aria-hidden="true">
          <span style={{ width: `${(game.index / game.total) * 100}%` }} />
        </div>

        <p className="wg-label">सही मतलब चुनिए</p>
        <div className="wg-wordcard">
          <p className="wg-word">{w.word}</p>
          {w.urdu && <p className="wg-urdu" lang="ur" dir="rtl">{w.urdu}</p>}
          <p className="wg-tags">
            {w.roman && <span lang="en">{w.roman}</span>}
            <span>{LEVEL_LABEL[w.level]}</span>
            {w.category && <span>{w.category}</span>}
          </p>
        </div>

        <div className="wg-options" role="group" aria-label="मतलब के विकल्प">
          {q.options.map((text, i) => {
            const cls = ['wg-option'];
            if (answered && i === q.correctIndex) cls.push('is-correct');
            else if (answered && i === picked) cls.push('is-wrong');
            return (
              <button key={text} type="button" className={cls.join(' ')} disabled={answered} onClick={() => choose(i)}>
                <span className="wg-letter" aria-hidden="true">{LETTERS[i]}</span>
                <span className="wg-opt-text">{text}</span>
              </button>
            );
          })}
        </div>

        <p className={`wg-msg${answered ? (wasCorrect ? ' is-good' : ' is-bad') : ''}`} role="status" aria-live="polite">
          {answered && (wasCorrect ? 'वाह! सही जवाब।' : `ग़लत जवाब। सही मतलब: ${w.meaning}`)}
        </p>

        {answered && (
          <>
            <button ref={nextRef} type="button" className="wg-btn" onClick={advance}>
              {isLast ? 'नतीजा देखिए' : 'अगला लफ़्ज़'}
            </button>
            <div className="wg-explain">
              <p><strong>{w.word}</strong> — {w.meaning}{w.meaningEn && <span lang="en"> ({w.meaningEn})</span>}</p>
              {w.explanation && <p>{w.explanation}</p>}
              {w.example && <p className="wg-example">उदाहरण: {w.example}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

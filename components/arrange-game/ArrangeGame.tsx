'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { ArrangeGame as Game, POINTS, canPlay, maxScore, performance, type Level, type Sher } from '@/lib/arrange-game/engine';
import { loadShers } from '@/lib/arrange-game/loadShers';
import { saveBest } from '@/lib/arrange-game/storage';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'empty' } | { state: 'ready'; shers: Sher[] };
type Feedback = { kind: 'good' | 'bad' | 'info'; text: string } | null;

const LEVEL_LABEL: Record<Level, string> = { easy: 'आसान', medium: 'मध्यम', hard: 'कठिन' };

export function ArrangeGame() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoad({ state: 'loading' });
    loadShers()
      .then((shers) => alive && setLoad(canPlay(shers) ? { state: 'ready', shers } : { state: 'empty' }))
      .catch((err) => {
        console.error('[Arrange the Words] could not load shers', err);
        if (alive) setLoad({ state: 'error' });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (load.state === 'loading') {
    return (
      <div className="ag-wrap" lang="hi">
        <div className="ag-status" role="status">
          <span className="ag-spin" aria-hidden="true" />
          खेल तैयार हो रहा है…
        </div>
      </div>
    );
  }
  if (load.state === 'error') {
    return (
      <div className="ag-wrap" lang="hi">
        <div className="ag-status" role="alert">
          शेर लोड नहीं हो सके। कृपया दोबारा कोशिश कीजिए।
          <button type="button" className="ag-btn" onClick={() => setAttempt((n) => n + 1)}>
            दोबारा कोशिश करें
          </button>
        </div>
      </div>
    );
  }
  if (load.state === 'empty') {
    return (
      <div className="ag-wrap" lang="hi">
        <div className="ag-status" role="status">
          अभी इस खेल के लिए पर्याप्त शेर उपलब्ध नहीं हैं। कुछ देर बाद फिर आइए।
        </div>
      </div>
    );
  }
  return <Round shers={load.shers} />;
}

function Round({ shers }: { shers: Sher[] }) {
  const gameRef = useRef<Game | null>(null);
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);
  const [selected, setSelected] = useState<string | null>(null); // a placed tile chosen for move / remove
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<{ best: number; isNew: boolean } | null>(null);
  const dragId = useRef<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  const start = useCallback(() => {
    gameRef.current = new Game(shers);
    setSelected(null);
    setFeedback(null);
    setWrongFlash(false);
    setFinished(false);
    setBest(null);
    setTick((n) => n + 1);
  }, [shers]);

  useEffect(() => {
    start();
  }, [start]);

  const game = gameRef.current;
  const status = game?.status;
  useEffect(() => {
    if (status && status !== 'playing') nextRef.current?.focus({ preventScroll: true });
  }, [status]);
  useEffect(() => {
    if (finished) againRef.current?.focus({ preventScroll: true });
  }, [finished]);

  if (!game) return null;
  const puzzle = game.current;

  if (finished) {
    const total = game.total;
    return (
      <div className="ag-wrap" lang="hi">
        <div className="ag-body ag-result">
          <p className="ag-eyebrow">अल्फ़ाज़ सजाइए</p>
          <h2 className="ag-title">खेल ख़त्म</h2>
          <p className="ag-score-big" aria-label={`कुल अंक ${game.score}`}>{game.score}</p>
          <p className="ag-lead">{maxScore(total)} में से {game.score} अंक</p>
          <ul className="ag-stats">
            <li>कुल शेर: <strong>{total}</strong></li>
            <li>सही सजाए: <strong>{game.correctCount}</strong></li>
            <li>कुल कोशिशें: <strong>{game.totalAttempts}</strong></li>
          </ul>
          <p className="ag-verdict">{performance(game.correctCount, total)}</p>
          {best && (
            <p className={best.isNew ? 'ag-best is-new' : 'ag-best'}>
              {best.isNew ? `नया सर्वश्रेष्ठ स्कोर: ${best.best}` : `सर्वश्रेष्ठ स्कोर: ${best.best}`}
            </p>
          )}
          <div className="ag-actions">
            <button ref={againRef} type="button" className="ag-btn" onClick={start}>
              दोबारा खेलें
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="ag-wrap" lang="hi">
        <div className="ag-status" role="status">अभी इस खेल के लिए पर्याप्त शेर उपलब्ध नहीं हैं।</div>
      </div>
    );
  }

  const locked = game.locked;
  const pool = game.pool;
  const answer = game.answer;
  const sher = puzzle.sher;

  /* ---------- actions (tap / keyboard) ---------- */
  const clearWrong = () => {
    if (wrongFlash) setWrongFlash(false);
    if (feedback?.kind === 'bad') setFeedback(null);
  };
  const addTile = (id: string) => {
    if (game.place(id)) {
      clearWrong();
      setSelected(null);
      rerender();
    }
  };
  const removeTile = (id: string) => {
    if (game.remove(id)) {
      clearWrong();
      setSelected((s) => (s === id ? null : s));
      rerender();
    }
  };
  const nudge = (id: string, d: -1 | 1) => {
    if (game.nudge(id, d)) {
      clearWrong();
      rerender();
    }
  };
  const reset = () => {
    game.reset();
    setSelected(null);
    setFeedback(null);
    setWrongFlash(false);
    rerender();
  };
  const check = () => {
    const r = game.check();
    if (!r.counted) return;
    setSelected(null);
    if (r.correct) {
      setFeedback({ kind: 'good', text: `वाह! सही क्रम। +${r.points} अंक` });
    } else {
      setWrongFlash(true);
      setFeedback({ kind: 'bad', text: `क्रम सही नहीं है — ${r.total} में से ${r.rightPlace} शब्द सही जगह पर हैं। फिर कोशिश कीजिए।` });
    }
    rerender();
  };
  const reveal = () => {
    if (game.reveal()) {
      setSelected(null);
      setWrongFlash(false);
      setFeedback({ kind: 'info', text: 'सही क्रम ऊपर दिखाया गया है। इस सवाल के अंक नहीं मिले।' });
      rerender();
    }
  };
  const next = () => {
    if (game.next()) {
      setSelected(null);
      setFeedback(null);
      setWrongFlash(false);
      rerender();
    } else {
      setBest(saveBest(game.score));
      setFinished(true);
    }
  };

  /* ---------- drag and drop (desktop). Tap works everywhere, so touch screens never need dragging. ---------- */
  const onDragStart = (e: DragEvent, id: string) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const allowDrop = (e: DragEvent) => {
    if (!locked) e.preventDefault();
  };
  const dropOnTile = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const id = dragId.current;
    dragId.current = null;
    if (id && game.place(id, index)) {
      clearWrong();
      rerender();
    }
  };
  const dropOnAnswer = (e: DragEvent) => {
    e.preventDefault();
    const id = dragId.current;
    dragId.current = null;
    if (id && game.place(id)) {
      clearWrong();
      rerender();
    }
  };
  const dropOnPool = (e: DragEvent) => {
    e.preventDefault();
    const id = dragId.current;
    dragId.current = null;
    if (id) removeTile(id);
  };

  const onTileKey = (e: React.KeyboardEvent, id: string) => {
    if (locked) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nudge(id, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nudge(id, 1);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeTile(id);
    }
  };

  const selIndex = selected ? game.placed.indexOf(selected) : -1;

  return (
    <div className="ag-wrap" lang="hi">
      <div className="ag-body">
        <div className="ag-hud">
          <span>शेर {game.index + 1}/{game.total}</span>
          <span>अंक {game.score}</span>
        </div>
        <div className="ag-progress" aria-hidden="true">
          <span style={{ width: `${(game.index / game.total) * 100}%` }} />
        </div>

        <p className="ag-label">
          शेर की पहली पंक्ति दी गई है। दूसरी पंक्ति के शब्दों को छूकर सही क्रम में लगाइए (या खींचकर छोड़िए)। <span className="ag-level">{LEVEL_LABEL[sher.level]}</span>
        </p>

        {/* first line = the clue */}
        <p className="ag-given" aria-label="शेर की पहली पंक्ति">{puzzle.given}</p>

        {/* answer area */}
        <div
          className={`ag-answer${game.status === 'correct' ? ' is-correct' : ''}${wrongFlash ? ' is-wrong' : ''}${answer.length === 0 ? ' is-empty' : ''}`}
          role="group"
          aria-label="दूसरी पंक्ति, आपका क्रम"
          onDragOver={allowDrop}
          onDrop={dropOnAnswer}
        >
          {answer.length === 0 && <span className="ag-hint">नीचे से शब्द चुनिए…</span>}
          {answer.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={`ag-tile is-placed${selected === t.id ? ' is-selected' : ''}`}
              draggable={!locked}
              disabled={locked && game.status === 'playing'}
              aria-pressed={selected === t.id}
              aria-label={`${t.text}, स्थान ${i + 1}`}
              onClick={() => !locked && setSelected((s) => (s === t.id ? null : t.id))}
              onKeyDown={(e) => onTileKey(e, t.id)}
              onDragStart={(e) => onDragStart(e, t.id)}
              onDragOver={allowDrop}
              onDrop={(e) => dropOnTile(e, i)}
            >
              {t.text}
            </button>
          ))}
        </div>

        {/* controls for the selected placed tile */}
        {!locked && selected && (
          <div className="ag-tools" role="group" aria-label="चुने हुए शब्द के विकल्प">
            <button type="button" className="ag-mini" onClick={() => nudge(selected, -1)} disabled={selIndex <= 0}>← पहले</button>
            <button type="button" className="ag-mini" onClick={() => nudge(selected, 1)} disabled={selIndex < 0 || selIndex >= answer.length - 1}>बाद में →</button>
            <button type="button" className="ag-mini" onClick={() => removeTile(selected)}>✕ हटाइए</button>
          </div>
        )}

        {/* shuffled words */}
        {!locked && (
          <div className="ag-pool" role="group" aria-label="बिखरे हुए शब्द" onDragOver={allowDrop} onDrop={dropOnPool}>
            {pool.length === 0 && <span className="ag-hint">सारे शब्द लग गए। अब "जाँचिए" दबाइए।</span>}
            {pool.map((t) => (
              <button key={t.id} type="button" className="ag-tile" draggable onClick={() => addTile(t.id)} onDragStart={(e) => onDragStart(e, t.id)}>
                {t.text}
              </button>
            ))}
          </div>
        )}

        <p className={`ag-msg${feedback ? ` is-${feedback.kind}` : ''}`} role="status" aria-live="polite">
          {feedback?.text}
        </p>

        {!locked && (
          <div className="ag-actions-row">
            <button type="button" className="ag-btn" onClick={check} disabled={!game.complete}>जाँचिए</button>
            <button type="button" className="ag-btn is-ghost" onClick={reset} disabled={answer.length === 0}>फिर से लगाइए</button>
            {game.canReveal && (
              <button type="button" className="ag-btn is-ghost" onClick={reveal}>उत्तर देखिए</button>
            )}
          </div>
        )}
        {!locked && (
          <p className="ag-note">
            पहली कोशिश में सही: {POINTS.first} अंक · दूसरी में: {POINTS.second} · उसके बाद: {POINTS.later}
            {game.attempts > 0 && ` · अब तक कोशिशें: ${game.attempts}`}
          </p>
        )}

        {locked && (
          <>
            <button ref={nextRef} type="button" className="ag-btn" onClick={next}>
              {game.index + 1 >= game.total ? 'नतीजा देखिए' : 'अगला शेर'}
            </button>
            <blockquote className="ag-sher">
              {sher.lines.map((l, i) => (
                <p key={i} className="ag-sher-line">{l}</p>
              ))}
              <cite className="ag-cite">— {sher.poet}</cite>
              {sher.meaning && <p className="ag-meaning">{sher.meaning}</p>}
            </blockquote>
          </>
        )}
      </div>
    </div>
  );
}

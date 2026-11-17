'use client';

/**
 * "शेर पूरा कीजिए" rendered with plain React + CSS (no Phaser), so the game page no longer downloads the Phaser engine.
 * Rules, data, scoring, texts and class names are unchanged: lib/game/engine.ts (CompleteGame), lib/game/couplets.ts,
 * storage.ts and game.css are used exactly as before. Only the drawing layer (the old canvas HUD / backdrop / effects)
 * is rebuilt in DOM + CSS (sher-game.css).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import fallbackJson from '@/lib/game/fallback-couplets.json';
import { buildPool, type Couplet, type Entry } from '@/lib/game/couplets';
import { COMPLETE, CompleteGame } from '@/lib/game/engine';
import { getBestScore, saveBestScore } from '@/lib/game/storage';
import { trackGameEvent } from '@/lib/game/analytics';
import { loadSiteCouplets } from './loadCouplets';
import './sher-game.css';

const GAME_W = 480; // logical width the CSS units (--u) are based on, as before
const LOW_TIME = 5;

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; entries: Entry[]; usedFallback: boolean };
interface Result {
  score: number;
  correct: number;
  total: number;
}

/* ------------------------------ frame + effects ------------------------------ */

const FrameCtx = createContext<{ shake: () => void }>({ shake: () => {} });

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Mote {
  left: number;
  top: number;
  size: number;
  dur: number;
  delay: number;
}

function Frame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shaking, setShaking] = useState(false);
  const [motes, setMotes] = useState<Mote[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setUnit = () => el.style.setProperty('--u', `${el.clientWidth / GAME_W}px`);
    setUnit();
    const ro = new ResizeObserver(setUnit);
    ro.observe(el);
    if (!reducedMotion()) {
      setMotes(
        Array.from({ length: 12 }, () => ({
          left: Math.random() * 100,
          top: Math.random() * 100,
          size: 3 + Math.random() * 5,
          dur: 5 + Math.random() * 5,
          delay: Math.random() * 3,
        })),
      );
    }
    return () => ro.disconnect();
  }, []);

  const shake = useCallback(() => {
    if (reducedMotion()) return;
    setShaking(true);
    setTimeout(() => setShaking(false), 240);
  }, []);

  return (
    <FrameCtx.Provider value={{ shake }}>
      <div ref={ref} className={`sg-wrap${shaking ? ' sg-shake' : ''}`} lang="hi">
        <svg className="sg-backdrop" viewBox="0 0 480 800" preserveAspectRatio="none" aria-hidden="true">
          <circle cx="450" cy="760" r="150" />
          <circle cx="450" cy="760" r="190" />
          <circle cx="20" cy="60" r="110" />
          <rect className="sg-frame" x="8" y="8" width="464" height="784" rx="14" />
        </svg>
        {motes.map((m, i) => (
          <span key={i} className="sg-mote" aria-hidden="true" style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.size, height: m.size, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }} />
        ))}
        {children}
      </div>
    </FrameCtx.Provider>
  );
}

interface Fx {
  id: number;
  kind: 'spark' | 'float';
  x: number; // logical units
  y: number;
  text?: string;
  dx?: number;
  dy?: number;
}

function useFx() {
  const [fx, setFx] = useState<Fx[]>([]);
  const nextId = useRef(1);
  const add = useCallback((items: Omit<Fx, 'id'>[], ttl: number) => {
    const withIds = items.map((f) => ({ ...f, id: nextId.current++ }));
    setFx((cur) => [...cur, ...withIds]);
    setTimeout(() => setFx((cur) => cur.filter((f) => !withIds.some((w) => w.id === f.id))), ttl);
  }, []);
  const burst = useCallback(
    (x: number, y: number, count = 14) => {
      if (reducedMotion()) return;
      add(
        Array.from({ length: count }, (_, i) => {
          const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
          const dist = 40 + Math.random() * 70;
          return { kind: 'spark' as const, x, y, dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist };
        }),
        900,
      );
    },
    [add],
  );
  const floatText = useCallback((x: number, y: number, text: string) => add([{ kind: 'float', x, y, text }], 950), [add]);
  const layer = (
    <div className="sg-fx" aria-hidden="true">
      {fx.map((f) =>
        f.kind === 'spark' ? (
          <span key={f.id} className="sg-spark" style={{ left: `calc(var(--u) * ${f.x})`, top: `calc(var(--u) * ${f.y})`, ['--dx' as string]: `calc(var(--u) * ${f.dx})`, ['--dy' as string]: `calc(var(--u) * ${f.dy})` }} />
        ) : (
          <span key={f.id} className="sg-float" style={{ left: `calc(var(--u) * ${f.x})`, top: `calc(var(--u) * ${f.y})` }}>
            {f.text}
          </span>
        ),
      )}
    </div>
  );
  return { layer, burst, floatText };
}

/* --------------------------------- pieces --------------------------------- */

function SherCard({ entry, blankSecond }: { entry: Entry; blankSecond?: boolean }) {
  return (
    <blockquote className="sg-sher">
      <p className="sg-sher-line">{entry.lines[0]}</p>
      {blankSecond ? (
        <p className="sg-sher-line sg-blank" aria-label="दूसरी पंक्ति छिपी है">
          ……………………
        </p>
      ) : (
        <p className="sg-sher-line">{entry.lines[1]}</p>
      )}
      {!blankSecond && <cite className="sg-cite">{`— ${entry.poet} · ${entry.source}`}</cite>}
    </blockquote>
  );
}

/* ---------------------------------- screens --------------------------------- */

function Menu({ entries, usedFallback, onStart }: { entries: Entry[]; usedFallback: boolean; onStart: () => void }) {
  const ok = CompleteGame.canPlay(entries);
  const best = getBestScore('complete');
  return (
    <div className="sg-body is-full sg-menu">
      <p className="sg-eyebrow">मेहफ़िल · खेल</p>
      <h2 className="sg-title">शेर अंताक्षरी</h2>
      <p className="sg-lead">अधूरा शेर पूरा कीजिए।</p>
      <div className="sg-modes">
        <button type="button" className="sg-mode" disabled={!ok} onClick={onStart}>
          <span className="sg-mode-title">शेर पूरा कीजिए</span>
          <span className="sg-mode-rules">
            {ok ? `${COMPLETE.questions} सवाल · हर सवाल ${COMPLETE.seconds} सेकंड · चार में से सही दूसरी पंक्ति चुनिए` : 'अभी इसके लिए पर्याप्त शेर उपलब्ध नहीं हैं।'}
          </span>
          <span className="sg-mode-best">{best > 0 ? `सर्वश्रेष्ठ अंक: ${best}` : 'अभी कोई स्कोर नहीं'}</span>
        </button>
      </div>
      {usedFallback && (
        <p className="sg-note">मेहफ़िल पर अभी शेर कम हैं, इसलिए खेल में सार्वजनिक क्षेत्र (public domain) के क्लासिकल शायरों के शेर भी शामिल हैं।</p>
      )}
    </div>
  );
}

function Play({ entries, onFinish }: { entries: Entry[]; onFinish: (r: Result) => void }) {
  const [game] = useState(() => new CompleteGame(entries));
  const [, setTick] = useState(0);
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering');
  const [picked, setPicked] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(game.seconds);
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'bad' } | null>(null);
  const [popKey, setPopKey] = useState(0);
  const locked = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const { shake } = useContext(FrameCtx);
  const { layer, burst, floatText } = useFx();

  const finish = useCallback(() => onFinish({ score: game.score, correct: game.correct, total: game.total }), [game, onFinish]);

  useEffect(() => {
    trackGameEvent('game_start', { mode: 'complete' });
    if (game.total === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown. Each step is capped, so a hidden / throttled tab does not burn the player's time.
  useEffect(() => {
    if (phase !== 'answering' || game.total === 0) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(now - last, 250) / 1000;
      last = now;
      setRemaining((r) => Math.max(0, r - dt));
    }, 100);
    return () => clearInterval(id);
  }, [phase, game.index, game.total]);

  const answer = (index: number) => {
    if (locked.current || game.over) return;
    locked.current = true;
    const q = game.current!;
    setPhase('feedback');
    setPicked(index);
    if (index === -1) {
      game.timeout();
      shake();
      setMsg({ text: 'समय समाप्त!', kind: 'bad' });
    } else {
      const res = game.answer(index);
      if (res.correct) {
        burst(GAME_W / 2, 300);
        floatText(GAME_W / 2 - 24, 280, `+${res.points + res.bonus}`);
        setPopKey((n) => n + 1);
        setMsg({ text: `वाह! सही जवाब: +${res.points}${res.bonus ? ` + ${res.bonus} लगातार बोनस` : ''}`, kind: 'good' });
      } else {
        shake();
        setMsg({ text: 'ग़लत जवाब। सही पंक्ति ऊपर चिह्नित है।', kind: 'bad' });
      }
    }
    void q;
  };

  useEffect(() => {
    if (phase === 'answering' && remaining <= 0 && game.total > 0) answer(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  useEffect(() => {
    if (phase !== 'feedback') return;
    const b = nextRef.current;
    if (!b) return;
    b.focus({ preventScroll: true });
    b.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [phase]);

  const advance = () => {
    if (phase !== 'feedback') return;
    if (game.next()) {
      locked.current = false;
      setPhase('answering');
      setPicked(null);
      setMsg(null);
      setRemaining(game.seconds);
      setTick((n) => n + 1);
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    } else {
      finish();
    }
  };

  const q = game.current;
  if (!q) return null;
  const low = remaining <= LOW_TIME && phase === 'answering';
  const frac = Math.min(1, Math.max(0, remaining / game.seconds));
  const last = game.index + 1 >= game.total;

  return (
    <>
      <div className="sg-hud">
        <span className="sg-hud-round">{`सवाल ${game.index + 1}/${game.total}`}</span>
        <span className="sg-hud-score" key={popKey}>{`अंक ${game.score}`}</span>
        <span className={`sg-hud-time${low ? ' is-low' : ''}`}>{Math.ceil(remaining)}</span>
        <span className="sg-hud-streak">{game.streak >= 2 ? `लगातार ×${game.streak}` : ''}</span>
        <span className="sg-bar" aria-hidden="true">
          <span className={low ? 'is-low' : undefined} style={{ width: `${Math.max(frac > 0 ? 8 / 4.24 : 0, frac * 100)}%` }} />
        </span>
      </div>
      <div ref={bodyRef} className="sg-body sg-play">
        <p className="sg-label">दूसरी पंक्ति चुनिए</p>
        <SherCard entry={q.entry} blankSecond />
        <div className="sg-options" role="group" aria-label="दूसरी पंक्ति के विकल्प">
          {q.options.map((text, i) => {
            const cls = ['sg-option'];
            if (phase === 'feedback') {
              if (i === q.correctIndex) cls.push('is-correct');
              else if (i === picked) cls.push('is-wrong');
            }
            return (
              <button key={i} type="button" className={cls.join(' ')} disabled={phase !== 'answering'} onClick={() => answer(i)}>
                <span className="sg-opt-line">{text}</span>
              </button>
            );
          })}
        </div>
        <p className={`sg-msg${msg ? ` is-${msg.kind}` : ''}`} role="status" aria-live="polite">
          {msg?.text}
        </p>
        {phase === 'feedback' && (
          <div className="sg-reply">
            <button ref={nextRef} type="button" className="sg-btn" onClick={advance}>
              {last ? 'नतीजा देखिए' : 'अगला सवाल'}
            </button>
            <SherCard entry={q.entry} />
          </div>
        )}
      </div>
      {layer}
    </>
  );
}

async function shareResult(text: string, setStatus: (s: string) => void) {
  const url = `${window.location.origin}/game`;
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'Mehfil · शेर अंताक्षरी', text, url });
      return;
    }
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return; // the visitor closed the share sheet
  }
  try {
    await navigator.clipboard.writeText(url);
    setStatus('लिंक कॉपी हो गया!');
  } catch {
    setStatus(`यह लिंक साझा करें: ${url}`);
  }
}

function ResultScreen({ result, best, isNew, onAgain, onMenu }: { result: Result; best: number; isNew: boolean; onAgain: () => void; onMenu: () => void }) {
  const [status, setStatus] = useState('');
  const againRef = useRef<HTMLButtonElement>(null);
  const { layer, burst } = useFx();

  useEffect(() => {
    againRef.current?.focus({ preventScroll: true });
    if (!isNew || reducedMotion()) return;
    const timers = [0, 1, 2, 3].map((i) => setTimeout(() => burst(GAME_W * (0.2 + Math.random() * 0.6), 180 + Math.random() * 120, 16), i * 220));
    return () => timers.forEach(clearTimeout);
  }, [isNew, burst]);

  return (
    <>
      <div className="sg-body is-full sg-result">
        <p className="sg-eyebrow">शेर पूरा कीजिए</p>
        <h2 className="sg-title">खेल ख़त्म</h2>
        <p className="sg-score-big" aria-label={`आपके अंक ${result.score}`}>{result.score}</p>
        <p className="sg-lead">{`${result.total} में से ${result.correct} सही`}</p>
        <p className={isNew ? 'sg-best is-new' : 'sg-best'}>{isNew ? `नया सर्वश्रेष्ठ स्कोर: ${best}` : `सर्वश्रेष्ठ स्कोर: ${best}`}</p>
        <div className="sg-actions">
          <button ref={againRef} type="button" className="sg-btn" onClick={onAgain}>फिर खेलें</button>
          <button
            type="button"
            className="sg-btn is-ghost"
            onClick={() => void shareResult(`मैंने मेहफ़िल की "शेर पूरा कीजिए" में ${result.score} अंक बनाए! क्या आप मुझे हरा सकते हैं?`, setStatus)}
          >
            शेयर करें
          </button>
          <button type="button" className="sg-btn is-ghost" onClick={onMenu}>मुख्य मेन्यू</button>
        </div>
        <p className="sg-msg" role="status" aria-live="polite">{status}</p>
      </div>
      {layer}
    </>
  );
}

function Ready({ entries, usedFallback }: { entries: Entry[]; usedFallback: boolean }) {
  // Same start rule as before: go straight into the game when it can be played, otherwise show the menu (it explains why not).
  const [screen, setScreen] = useState<'menu' | 'play' | 'result'>(() => (CompleteGame.canPlay(entries) ? 'play' : 'menu'));
  const [runId, setRunId] = useState(0);
  const [out, setOut] = useState<{ result: Result; best: number; isNew: boolean } | null>(null);

  const onFinish = useCallback((result: Result) => {
    const { best, isNew } = saveBestScore('complete', result.score);
    trackGameEvent('game_end', { mode: 'complete', score: result.score });
    setOut({ result, best, isNew });
    setScreen('result');
  }, []);
  const start = () => {
    setRunId((n) => n + 1);
    setScreen('play');
  };

  if (screen === 'play') return <Play key={runId} entries={entries} onFinish={onFinish} />;
  if (screen === 'result' && out) return <ResultScreen result={out.result} best={out.best} isNew={out.isNew} onAgain={start} onMenu={() => setScreen('menu')} />;
  return <Menu entries={entries} usedFallback={usedFallback} onStart={start} />;
}

export function SherGame() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let alive = true;
    const abort = new AbortController();
    // Data: community couplets from the existing API, local public-domain fallback if there are fewer than 30 (unchanged).
    loadSiteCouplets(abort.signal)
      .then((site) => {
        if (!alive) return;
        const { entries, usedFallback } = buildPool(site, fallbackJson as Couplet[]);
        setLoad({ state: 'ready', entries, usedFallback });
      })
      .catch((err) => {
        console.error('[Sher Antakshari] could not start', err);
        if (alive) setLoad({ state: 'error' });
      });
    return () => {
      alive = false;
      abort.abort();
    };
  }, []);

  return (
    <Frame>
      {load.state === 'loading' && (
        <div className="sg-status" role="status">
          <span className="sg-spin" aria-hidden="true" />
          खेल तैयार हो रहा है…
        </div>
      )}
      {load.state === 'error' && (
        <div className="sg-status" role="alert">
          खेल शुरू नहीं हो सका। कृपया पेज दोबारा खोलिए।
        </div>
      )}
      {load.state === 'ready' && <Ready entries={load.entries} usedFallback={load.usedFallback} />}
    </Frame>
  );
}

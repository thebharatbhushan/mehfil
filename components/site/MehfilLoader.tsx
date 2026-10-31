'use client';

import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/site/BrandLogo';

/**
 * Mehfil premium splash loader.
 *
 * - Rendered on the server too and fully opaque from the first paint, so the very first frame is already the loader
 *   (no flash of the page behind it, no fade-in delay).
 * - Pure CSS animation (see the "Mehfil loader" block in globals.css). The only JS is one timer-based dismiss effect.
 * - Shown once per browser session: an inline script marks it skipped before first paint on later hard loads,
 *   so in-app navigation and refreshes in the same session never replay it.
 * - Page content stays in the DOM underneath (SEO / crawlers / screen readers are unaffected).
 *
 * Usage:  <MehfilLoader />   (mounted once in app/layout.tsx)
 *   Optional props: tagline, minDuration (ms the loader stays at least), maxDuration (ms hard cap).
 */

const SEEN_KEY = 'mehfil_splash_seen';
const EXIT_MS = 500;

interface MehfilLoaderProps {
  tagline?: string;
  /** Minimum time on screen so the animation can finish gracefully (ms). */
  minDuration?: number;
  /** Hard cap: the loader always leaves by this time, even if the page never finishes loading (ms). */
  maxDuration?: number;
}

// Runs during HTML parsing, before first paint, to skip the splash for repeat loads in the same session.
// It flags <html> (always present at this point) and a CSS rule hides the loader. The old version tried to flag the
// loader's "next sibling", which was the <noscript> tag, so the skip never worked and the splash replayed
// (then vanished after hydration) on every hard load.
const SKIP_SCRIPT = `try{if(sessionStorage.getItem('${SEEN_KEY}'))document.documentElement.setAttribute('data-mfl-seen','')}catch(_){}`;

export function MehfilLoader({
  tagline = 'शब्दों की एक ख़ूबसूरत महफ़िल',
  minDuration = 1600,
  maxDuration = 4000,
}: MehfilLoaderProps) {
  const [phase, setPhase] = useState<'show' | 'exit' | 'gone'>('show');

  useEffect(() => {
    let skipped = false;
    try {
      skipped = !!sessionStorage.getItem(SEEN_KEY);
    } catch {
      /* storage unavailable: just play the loader */
    }
    if (skipped) {
      setPhase('gone');
      return;
    }

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const min = reduce ? 300 : minDuration;
    const start = performance.now();
    let done = false;
    let exitTimer: number | undefined;
    let removeTimer: number | undefined;

    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, min - (performance.now() - start));
      exitTimer = window.setTimeout(() => {
        setPhase('exit');
        try {
          sessionStorage.setItem(SEEN_KEY, '1');
        } catch {
          /* ignore */
        }
        removeTimer = window.setTimeout(() => setPhase('gone'), reduce ? 150 : EXIT_MS);
      }, wait);
    };

    // Ready = page fully loaded + fonts ready (so the page behind never swaps fonts under the fade).
    const pageLoaded =
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise<void>((res) => window.addEventListener('load', () => res(), { once: true }));
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    Promise.all([pageLoaded, fontsReady]).then(finish, finish);
    const capTimer = window.setTimeout(finish, maxDuration);

    return () => {
      window.clearTimeout(capTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [minDuration, maxDuration]);

  if (phase === 'gone') return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP_SCRIPT }} />
      <noscript>
        <style>{'.mfl{display:none!important}'}</style>
      </noscript>
      <div
        className={`mfl ${phase === 'exit' ? 'mfl-exit' : ''}`}
        role="status"
        aria-live="polite"
        aria-label="मेहफ़िल लोड हो रहा है — Loading Mehfil"
        suppressHydrationWarning
      >
        <span className="mfl-sr">Loading Mehfil…</span>

        <div className="mfl-glow" aria-hidden="true" />
        <div className="mfl-dust" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} className={`mfl-p mfl-p${i + 1}`} />
          ))}
        </div>

        <div className="mfl-stage" aria-hidden="true">
          <div className="mfl-mark">
            <svg className="mfl-ring" viewBox="0 0 200 200" focusable="false">
              <defs>
                <linearGradient id="mflGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f6e3b4" />
                  <stop offset="55%" stopColor="#d9ae62" />
                  <stop offset="100%" stopColor="#a9763a" />
                </linearGradient>
              </defs>
              <circle className="mfl-ring-track" cx="100" cy="100" r="92" />
              <circle className="mfl-ring-draw" cx="100" cy="100" r="92" pathLength="100" />
              <g className="mfl-ring-orbit">
                <circle className="mfl-ring-dot" cx="100" cy="8" r="2.6" />
              </g>
            </svg>
            <BrandLogo tone="light" className="mfl-logo" priority />
          </div>

          <div className="mfl-rule" />
          <div className="mfl-tagline" lang="hi">
            {tagline}
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

/**
 * Mounts the Phaser game. This module is only ever loaded through GameClient (next/dynamic, ssr: false),
 * because Phaser touches `window` when it is imported.
 */
import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import fallbackJson from '@/lib/game/fallback-couplets.json';
import { buildPool, type Couplet } from '@/lib/game/couplets';
import { loadSiteCouplets } from './loadCouplets';
import { waitForGameFonts } from './fonts';
import { readPalette } from './theme';
import { CTX_KEY, GAME_H, GAME_W, THEME_EVENT, type GameContext } from './types';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import { ResultScene } from './scenes/ResultScene';

type Status = 'loading' | 'ready' | 'error';

export default function PhaserGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const wrap = wrapRef.current;
    const host = hostRef.current;
    const overlay = overlayRef.current;
    if (!wrap || !host || !overlay) return;

    let disposed = false;
    let game: Phaser.Game | null = null;
    const abort = new AbortController();

    // The overlay text scales with the canvas: --u is "CSS pixels per logical game unit".
    const setUnit = () => wrap.style.setProperty('--u', `${wrap.clientWidth / GAME_W}px`);
    setUnit();
    const resizeObserver = new ResizeObserver(() => {
      setUnit();
      game?.scale.refresh();
    });
    resizeObserver.observe(wrap);

    // Re-paint the canvas when the visitor flips light/dark (the site sets data-theme on <html>).
    const themeObserver = new MutationObserver(() => game?.events.emit(THEME_EVENT));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    (async () => {
      try {
        // 1) fonts first, so the canvas never draws Devanagari in a fallback font
        // 2) data: community couplets from the existing API, local public-domain fallback if there are fewer than 30
        const [, site] = await Promise.all([waitForGameFonts(), loadSiteCouplets(abort.signal)]);
        if (disposed) return;
        const { entries, usedFallback } = buildPool(site, fallbackJson as Couplet[]);

        const ctx: GameContext = { entries, usedFallback, overlay, palette: readPalette };
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host,
          width: GAME_W,
          height: GAME_H,
          backgroundColor: readPalette().bg.css,
          banner: false,
          // All interaction happens in the DOM overlay, so Phaser must not grab keyboard / pointer events (typing needs them).
          input: { keyboard: false, mouse: false, touch: false, gamepad: false },
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          scene: [MenuScene, PlayScene, ResultScene],
          callbacks: {
            preBoot: (g) => {
              g.registry.set(CTX_KEY, ctx);
            },
          },
        });
        setStatus('ready');
      } catch (err) {
        console.error('[Sher Antakshari] could not start', err);
        if (!disposed) setStatus('error');
      }
    })();

    return () => {
      disposed = true;
      abort.abort();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      // true = also remove the <canvas>, so route changes / dev double-mounts never leave a duplicate behind
      game?.destroy(true);
      game = null;
      overlay.replaceChildren();
      host.replaceChildren();
    };
  }, []);

  return (
    <div ref={wrapRef} className="sg-wrap" lang="hi">
      <div ref={hostRef} className="sg-canvas" aria-hidden="true" />
      <div ref={overlayRef} className="sg-overlay" />
      {status === 'loading' && (
        <div className="sg-status" role="status">
          <span className="sg-spin" aria-hidden="true" />
          खेल तैयार हो रहा है…
        </div>
      )}
      {status === 'error' && (
        <div className="sg-status" role="alert">
          खेल शुरू नहीं हो सका। कृपया पेज दोबारा खोलिए।
        </div>
      )}
    </div>
  );
}

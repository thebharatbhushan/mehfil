'use client';

import { useEffect, useRef, useState } from 'react';
import { prepareFonts, renderCard } from '@/lib/shareCard/PoemImageGenerator';
import type { RenderInfo } from '@/lib/shareCard/PoemImageGenerator';
import type { ShareCardOptions, SharePoemData } from '@/lib/shareCard/types';

interface Props {
  poem: SharePoemData;
  options: ShareCardOptions;
  page: number;
  onInfo?: (info: RenderInfo) => void;
}

/**
 * The card itself: a canvas painted by the same renderer used for export (PoemImageGenerator.renderCard).
 * It repaints whenever an option changes (batched to one paint per frame) and again once the fonts needed
 * for the poem have finished loading, so Hindi/Urdu never stay in a fallback font.
 */
export function PoemShareCard({ poem, options, page, onInfo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cssWidth, setCssWidth] = useState(0);
  const [fontsKey, setFontsKey] = useState(0);
  const [ready, setReady] = useState(false);
  const onInfoRef = useRef(onInfo);
  onInfoRef.current = onInfo;

  // Track the displayed width so the preview canvas is rendered at the pixel size it is shown at (crisp, cheap).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setCssWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load the faces this poem needs for the chosen font style, then repaint.
  useEffect(() => {
    let cancelled = false;
    prepareFonts(poem, options).then(() => {
      if (cancelled) return;
      setReady(true);
      setFontsKey((k) => k + 1);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poem.body, poem.authorName, poem.title, poem.authorImage, options.font]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const scale = cssWidth > 0 ? Math.min(1, Math.max(0.3, (cssWidth * dpr) / 1080)) : 0.4;
    const raf = requestAnimationFrame(() => {
      try {
        const info = renderCard(canvas, poem, options, { page, scale });
        onInfoRef.current?.(info);
      } catch {
        /* canvas unavailable - nothing to paint */
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poem.id, poem.body, poem.authorName, poem.title, poem.authorImage, options, page, cssWidth, fontsKey]);

  return (
    <div className="sc-card-frame" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={`sc-canvas${ready ? ' is-ready' : ''}`}
        role="img"
        aria-label={`${poem.authorName}${poem.title ? ` की रचना “${poem.title}”` : ' की रचना'} का शेयर कार्ड पूर्वावलोकन`}
      />
      {!ready && <div className="sc-card-skeleton" aria-hidden="true" />}
    </div>
  );
}

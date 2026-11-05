'use client';

import { useEffect, useRef } from 'react';

/**
 * Reading-progress bar. Updates a transform straight on the element (batched with requestAnimationFrame)
 * instead of setting React state on every scroll event, so scrolling never triggers re-renders or layout.
 */
export function ScrollIndicator() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = height > 0 ? Math.min(1, Math.max(0, winScroll / height)) : 0;
      el.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="scroll-indicator" />;
}

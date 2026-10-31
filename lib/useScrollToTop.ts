import { useEffect } from 'react';

/**
 * Makes a page always open at the top.
 * - Disables the browser's scroll restoration while the page is mounted (a refresh or a "back"
 *   would otherwise jump back to the previous, lower scroll position).
 * - Scrolls to the top on mount and again once `ready` becomes true, because the page grows
 *   taller after its data loads and a #hash or the previous position could otherwise leave it
 *   scrolled down.
 */
export function useScrollToTop(ready: boolean = true): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    if (ready) window.scrollTo(0, 0);
  }, [ready]);
}

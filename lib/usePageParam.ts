'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Current list page, kept in sync with the `?page=N` URL convention (page 1 = no query string).
 * Page changes update the address bar with history.pushState (so Back/Forward and refresh land on the same page)
 * without a server round-trip; the list is already in memory. The existing history state is passed through so
 * Next.js's own router state is preserved.
 */
export function usePageParam(initialPage: number, basePath: string) {
  const [page, setPageState] = useState(initialPage);

  const hrefFor = useCallback((p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`), [basePath]);

  const setPage = useCallback(
    (p: number, opts: { replace?: boolean } = {}) => {
      const next = Math.max(1, Math.floor(p) || 1);
      setPageState(next);
      if (typeof window === 'undefined') return;
      const url = hrefFor(next);
      if (window.location.pathname + window.location.search === url) return;
      try {
        if (opts.replace) window.history.replaceState(window.history.state, '', url);
        else window.history.pushState(window.history.state, '', url);
      } catch {
        /* history unavailable: the in-memory page still changes */
      }
    },
    [hrefFor],
  );

  // Back / Forward: re-read the page from the URL.
  useEffect(() => {
    const onPop = () => {
      const raw = new URLSearchParams(window.location.search).get('page');
      setPageState(/^\d+$/.test(raw || '') ? Math.max(1, parseInt(raw as string, 10)) : 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return { page, setPage, hrefFor };
}

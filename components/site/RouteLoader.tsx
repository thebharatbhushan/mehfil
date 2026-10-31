'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Instant feedback for internal navigation.
 *
 * Next.js keeps the old page on screen until the next route's data has arrived, which on a slow or sleeping
 * backend looks like the click did nothing. This shows the site's existing dot loader the moment a link is
 * clicked (capture-phase listener) and hides it as soon as the pathname changes.
 *
 * Safe by construction:
 *  - only plain same-origin link clicks that change the pathname are handled (no new tabs, downloads, hash/query-only
 *    changes, modified clicks, or clicks that were already default-prevented before reaching us; the in-place pagination links keep the same pathname);
 *  - it always clears on pathname change, on back/forward, and after a hard safety timeout, so it can never get stuck;
 *  - it never touches page content, so SEO / crawlers / screen readers are unaffected (it is only mounted client-side).
 */
const SAFETY_MS = 10000;

export function RouteLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // Navigation finished (or the user went somewhere else): clear.
  useEffect(() => {
    window.clearTimeout(timer.current);
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || !a.href) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-no-route-loader')) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // hash / query-only change: not a page navigation
      // Shown synchronously on the click itself (not in an effect), so there is no render-delay before it appears.
      setVisible(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setVisible(false), SAFETY_MS);
    };
    const onPop = () => {
      window.clearTimeout(timer.current);
      setVisible(false);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPop);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="route-loader" role="status" aria-live="polite" aria-label="लोड हो रहा है">
      <div className="loader-dots" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>
  );
}

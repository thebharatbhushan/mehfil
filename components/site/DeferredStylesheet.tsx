'use client';

import { useEffect, useRef } from 'react';

/**
 * Loads a stylesheet without blocking first paint: it is fetched with media="print" and switched to "all" once loaded.
 * The <noscript> fallback keeps icons working with JavaScript disabled.
 *
 * Fix: with server-rendered HTML the stylesheet can finish loading BEFORE React hydrates, so the onLoad handler never
 * fires and the sheet stays at media="print" forever (all Font Awesome icons disappear). We now also check on mount
 * whether the sheet is already loaded, listen for load/error, and add a timeout safety net.
 */
export function DeferredStylesheet({ href }: { href: string }) {
  const ref = useRef<HTMLLinkElement>(null);

  useEffect(() => {
    const link = ref.current;
    if (!link) return;
    const activate = () => {
      link.media = 'all';
    };
    if (link.sheet) activate(); // already loaded before hydration
    link.addEventListener('load', activate);
    link.addEventListener('error', activate);
    const t = window.setTimeout(activate, 3000); // safety net
    return () => {
      link.removeEventListener('load', activate);
      link.removeEventListener('error', activate);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <>
      <link
        ref={ref}
        rel="stylesheet"
        href={href}
        media="print"
        onLoad={(e) => {
          e.currentTarget.media = 'all';
        }}
      />
      <noscript>
        <link rel="stylesheet" href={href} />
      </noscript>
    </>
  );
}
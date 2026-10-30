'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { fetchCategoryPoemsClient, getSeoCategory } from '@/lib/categories';
import type { Poem } from '@/lib/mehfil';

/**
 * Safety net for category pages. The pages are rendered on the server; if that render got no poems (for example the
 * backend was asleep when the page was generated) these components load the category's real poems in the browser.
 * When the server already had poems (serverCount > 0) nothing is fetched and the server output is left untouched.
 */

const cache = new Map<string, Promise<Poem[]>>();

function loadCategory(slug: string): Promise<Poem[]> {
  const cat = getSeoCategory(slug);
  if (!cat) return Promise.resolve([]);
  let p = cache.get(slug);
  if (!p) {
    p = fetchCategoryPoemsClient(cat).catch(() => {
      cache.delete(slug); // allow a retry on the next visit
      return [] as Poem[];
    });
    cache.set(slug, p);
  }
  return p;
}

function useLivePoems(slug: string, serverCount: number): Poem[] | null {
  const [poems, setPoems] = useState<Poem[] | null>(null);
  useEffect(() => {
    if (serverCount > 0) return;
    let alive = true;
    loadCategory(slug).then((list) => alive && setPoems(list));
    return () => { alive = false; };
  }, [slug, serverCount]);
  return poems;
}

const clip = (text: string | undefined, max: number) => {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

const nameOf = (a?: Poem['author']) => `${a?.firstName || ''} ${a?.lastName || ''}`.replace(/\s+/g, ' ').trim() || a?.username || '';

/** "N रचनाएँ" count (category page header and /category cards). */
export function CategoryCount({ slug, serverCount, prefix = '' }: { slug: string; serverCount: number; prefix?: string }) {
  const live = useLivePoems(slug, serverCount);
  const count = serverCount > 0 ? serverCount : live?.length ?? serverCount;
  return <>{prefix}{count} रचनाएँ</>;
}

/** Wraps the server-rendered "no poems" message; swaps in the poem cards when the browser finds poems. */
export function CategoryPoemsFallback({ slug, children }: { slug: string; children: ReactNode }) {
  const cat = getSeoCategory(slug);
  const live = useLivePoems(slug, 0);
  if (!cat || !live || live.length === 0) return <>{children}</>;
  return (
    <div className="poems-list-grid">
      {live.map((poem) => (
        <Link href={`/poem/${encodeURIComponent(poem.slug)}`} key={poem._id} className="poem-card">
          <div className="poem-card-header">
            <div className="card-top-icon">{cat.icon}</div>
            <span className="mood">{cat.label}</span>
          </div>
          <h2 style={{ fontSize: '1.3rem' }}>{poem.title}</h2>
          <p>{clip(poem.body, 120)}</p>
          <div className="poem-footer">
            <span>{nameOf(poem.author) || 'अज्ञात'}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

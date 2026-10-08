import { MetadataRoute } from 'next';
import { MIN_POEMS_TO_INDEX, SEO_CATEGORIES, categoryHref, poemsForCategory } from '@/lib/categories';
import { SITE_URL, authorPath, fetchAllPoems, fetchAllWriters } from '@/lib/seo';
import type { Poem } from '@/lib/mehfil';

// Only valuable, canonical, indexable URLs. Rebuilt at most hourly from the existing public API.
// <lastmod> is only emitted when it is real (taken from poem dates); it is never "now".
export const revalidate = 3600;

const dateOf = (p: Poem): number => Date.parse((p as { updatedAt?: string }).updatedAt || p.createdAt || '') || 0;
const latest = (poems: Poem[]): Date | undefined => {
  const t = Math.max(0, ...poems.map(dateOf));
  return t ? new Date(t) : undefined;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const [poems, writers] = await Promise.all([fetchAllPoems(), fetchAllWriters()]);
  const newest = latest(poems);

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: newest, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/poems`, lastModified: newest, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/poets`, lastModified: newest, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/category`, lastModified: newest, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/about-contact`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Category pages: skip thin ones (same threshold that sets them to noindex).
  const categoryPages: MetadataRoute.Sitemap = SEO_CATEGORIES
    .map((c) => ({ c, list: poemsForCategory(c, poems) }))
    .filter(({ list }) => list.length >= MIN_POEMS_TO_INDEX)
    .map(({ c, list }) => ({ url: `${base}${categoryHref(c.slug)}`, lastModified: latest(list), changeFrequency: 'weekly' as const, priority: 0.8 }));

  const seenSlugs = new Set<string>();
  const poemPages: MetadataRoute.Sitemap = poems.filter((p) => !seenSlugs.has(p.slug) && !!seenSlugs.add(p.slug)).map((p) => ({
    url: `${base}/poem/${encodeURIComponent(p.slug)}`,
    lastModified: dateOf(p) ? new Date(dateOf(p)) : undefined,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Author pages: only authors that have at least one poem (profiles without poems are noindex).
  const byAuthor = new Map<string, Poem[]>();
  for (const p of poems) {
    const id = p.author?._id;
    if (id) byAuthor.set(id, [...(byAuthor.get(id) || []), p]);
  }
  const seen = new Set<string>();
  const authorPages: MetadataRoute.Sitemap = [];
  const add = (a: { _id?: string; username?: string } | undefined) => {
    const path = authorPath(a);
    if (!path || !a?._id || !byAuthor.has(a._id) || seen.has(path)) return;
    seen.add(path);
    authorPages.push({ url: `${base}${path}`, lastModified: latest(byAuthor.get(a._id) || []), changeFrequency: 'weekly', priority: 0.6 });
  };
  writers.forEach(add);
  poems.forEach((p) => add(p.author));

  return [...staticPages, ...categoryPages, ...poemPages, ...authorPages];
}

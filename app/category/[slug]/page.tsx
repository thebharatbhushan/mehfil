import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { JsonLd } from '@/components/site/JsonLd';
import { MIN_POEMS_TO_INDEX, POEMS_PER_PAGE, SEO_CATEGORIES, categoryHref, getSeoCategory, poemsForCategory } from '@/lib/categories';
import { DEFAULT_OG_IMAGE, absoluteUrl, authorPath, fetchAllPoems, fetchAllPoemsOrNull, fullNameOf, parsePage, truncate } from '@/lib/seo';

export const revalidate = 3600;
export const dynamicParams = false; // unknown slugs -> real 404

export function generateStaticParams() {
  return SEO_CATEGORIES.map((c) => ({ slug: c.slug }));
}

type Props = { params: { slug: string }; searchParams: { page?: string } };

const pageOf = (sp: Props['searchParams']) => parsePage(sp?.page);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const cat = getSeoCategory(params.slug);
  if (!cat) return { title: 'श्रेणी', robots: { index: false, follow: true } };
  const all = await fetchAllPoemsOrNull();
  const poems = poemsForCategory(cat, all || []);
  const page = pageOf(searchParams);
  const base = categoryHref(cat.slug);
  const canonical = page > 1 ? `${base}?page=${page}` : base;
  const title = page > 1 ? `${cat.title.replace(' | Mehfil', '')} — पृष्ठ ${page} | Mehfil` : cat.title;
  // all === null means the API was unreachable: stay indexable rather than de-index on a transient failure.
  const indexable = all === null || poems.length >= MIN_POEMS_TO_INDEX;
  return {
    title: { absolute: title },
    description: cat.description,
    alternates: { canonical },
    robots: { index: indexable, follow: true },
    openGraph: { title, description: cat.description, url: canonical, type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description: cat.description, images: [DEFAULT_OG_IMAGE.url] },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const cat = getSeoCategory(params.slug);
  if (!cat) notFound();

  const all = await fetchAllPoems();
  const poems = poemsForCategory(cat, all);
  const totalPages = Math.max(1, Math.ceil(poems.length / POEMS_PER_PAGE));
  const page = pageOf(searchParams);
  // Beyond the last page = real 404 (no duplicate/empty pages). Skipped when the category has no poems at all.
  if (poems.length > 0 && page > totalPages) notFound();
  const items = poems.slice((page - 1) * POEMS_PER_PAGE, page * POEMS_PER_PAGE);
  const base = categoryHref(cat.slug);
  const related = cat.related.map(getSeoCategory).filter((c): c is NonNullable<typeof c> => !!c);

  // Authors writing in this category (internal links to their profile pages).
  const authors = new Map<string, { name: string; path: string }>();
  for (const p of poems) {
    const path = authorPath(p.author);
    if (path && !authors.has(path)) authors.set(path, { name: fullNameOf(p.author), path });
  }

  const linkStyle = { color: 'var(--accent)' } as const;

  return (
    <>
      <Breadcrumbs items={[{ name: 'होम', path: '/' }, { name: 'श्रेणियाँ', path: '/category' }, { name: cat.label, path: base }]} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: cat.h1,
          description: cat.description,
          url: absoluteUrl(page > 1 ? `${base}?page=${page}` : base),
          inLanguage: 'hi',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: items.length,
            itemListElement: items.map((p, i) => ({
              '@type': 'ListItem',
              position: (page - 1) * POEMS_PER_PAGE + i + 1,
              url: absoluteUrl(`/poem/${encodeURIComponent(p.slug)}`),
              name: p.title,
            })),
          },
        }}
      />

      <div className="page-header">
        <h1>{cat.h1}</h1>
        <p>{cat.icon} {poems.length} रचनाएँ</p>
      </div>

      <section style={{ paddingTop: 0 }}>
        <div className="mehfil-container">
          {page === 1 && (
            <div className="glass-panel" style={{ marginBottom: '2.5rem', lineHeight: 1.9, color: 'var(--text-muted)' }}>
              {cat.intro.map((t, i) => (
                <p key={i} style={{ marginBottom: i < cat.intro.length - 1 ? '0.8rem' : 0 }}>{t}</p>
              ))}
            </div>
          )}

          {items.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              ✨ इस श्रेणी में अभी कोई रचनाएँ नहीं हैं। <Link href="/poems" style={linkStyle}>सभी हिंदी कविताएँ पढ़ें</Link>।
            </p>
          ) : (
            <div className="poems-list-grid">
              {items.map((poem) => (
                <Link href={`/poem/${encodeURIComponent(poem.slug)}`} key={poem._id} className="poem-card">
                  <div className="poem-card-header">
                    <div className="card-top-icon">{cat.icon}</div>
                    <span className="mood">{cat.label}</span>
                  </div>
                  <h2 style={{ fontSize: '1.3rem' }}>{poem.title}</h2>
                  <p>{truncate(poem.body, 120)}</p>
                  <div className="poem-footer">
                    <span>{fullNameOf(poem.author) || 'अज्ञात'}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="pagination-bar" aria-label="पृष्ठ">
              {Array.from({ length: totalPages }, (_, i) => (
                <Link
                  key={i}
                  href={i === 0 ? base : `${base}?page=${i + 1}`}
                  className={`filter-chip ${page === i + 1 ? 'active' : ''}`}
                  style={{ textDecoration: 'none' }}
                  aria-current={page === i + 1 ? 'page' : undefined}
                >
                  {i + 1}
                </Link>
              ))}
            </nav>
          )}

          {authors.size > 0 && (
            <div style={{ marginTop: '3rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--accent-dark)', marginBottom: '0.8rem' }}>
                इस श्रेणी के रचनाकार
              </h2>
              <p style={{ lineHeight: 2 }}>
                {Array.from(authors.values()).slice(0, 20).map((a, i) => (
                  <span key={a.path}>{i > 0 && ' · '}<Link href={a.path} style={linkStyle}>{a.name} की कविताएँ</Link></span>
                ))}
              </p>
            </div>
          )}

          <div style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--accent-dark)', marginBottom: '0.8rem' }}>
              और श्रेणियाँ
            </h2>
            <p style={{ lineHeight: 2 }}>
              {related.map((c, i) => (
                <span key={c.slug}>{i > 0 && ' · '}<Link href={categoryHref(c.slug)} style={linkStyle}>{c.h1}</Link></span>
              ))}
              {' · '}<Link href="/category" style={linkStyle}>सभी श्रेणियाँ</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

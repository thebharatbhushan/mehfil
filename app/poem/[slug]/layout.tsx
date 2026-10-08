import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/site/JsonLd';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { detectScriptLang } from '@/lib/mehfil';
import { categoryForPoem, categoryHref, poemsForCategory } from '@/lib/categories';
import { DEFAULT_OG_IMAGE, SITE_URL, absoluteUrl, authorPath, fetchAllPoems, fetchPoemBySlug, fullNameOf, oneLine, pickImage, readingMinutes, truncate } from '@/lib/seo';

type Props = { params: { slug: string }; children: React.ReactNode };

function decodeSlug(slug: string): string {
  try { return decodeURIComponent(slug); } catch { return slug; }
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const slug = decodeSlug(params.slug);
  const { poem, missing } = await fetchPoemBySlug(slug);
  const path = `/poem/${encodeURIComponent(slug)}`;
  if (!poem) {
    // noindex only when the API definitively says the poem does not exist; an unreachable API must never de-index a valid poem.
    return { title: 'कविता', alternates: { canonical: path }, ...(missing ? { robots: { index: false, follow: true } } : {}) };
  }
  const poemTitle = oneLine(poem.title);
  const updatedAt = (poem as { updatedAt?: string }).updatedAt;
  const author = fullNameOf(poem.author);
  const lang = detectScriptLang(poem.body);
  const catLabel = categoryForPoem(poem)?.label;
  const title = author ? `${poemTitle} — ${author}` : poemTitle;
  const description = truncate(
    `${poemTitle}${author ? ` — ${author} की` : ''} ${catLabel ? `${catLabel} ` : ''}कविता। ${poem.body}`,
    158,
  );
  const image = pickImage(poem.author?.profilePic);
  const fullTitle = `${title} | Mehfil`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description, url: path, type: 'article', siteName: 'Mehfil', locale: lang === 'ur' ? 'ur_PK' : lang === 'en' ? 'en_IN' : 'hi_IN', images: image ? [{ url: image }] : [DEFAULT_OG_IMAGE], publishedTime: poem.createdAt, ...(updatedAt ? { modifiedTime: updatedAt } : {}), authors: author ? [author] : undefined, tags: poem.tags },
    twitter: { card: image ? 'summary' : 'summary_large_image', title: fullTitle, description, images: [image || DEFAULT_OG_IMAGE.url] },
  };
}

export default async function PoemLayout({ params, children }: Props) {
  const slug = decodeSlug(params.slug);
  const { poem, missing } = await fetchPoemBySlug(slug);
  // Only a definite 404 from the API becomes a real 404 (a slow/unreachable API must not 404 valid poems).
  if (!poem && missing) notFound();
  if (!poem) return <>{children}</>;

  const path = `/poem/${encodeURIComponent(slug)}`;
  const category = categoryForPoem(poem);
  const aPath = authorPath(poem.author);
  const authorName = fullNameOf(poem.author);

  // Related poems: same category, the same author's other poems first.
  const all = await fetchAllPoems();
  const pool = category ? poemsForCategory(category, all) : all;
  const others = pool.filter((p) => p._id !== poem._id);
  const sameAuthor = others.filter((p) => poem.author?._id && p.author?._id === poem.author._id);
  const related = [...sameAuthor, ...others.filter((p) => !sameAuthor.includes(p))].slice(0, 6);

  // Only real dates: dateModified is emitted only when the API provides updatedAt.
  const updated = (poem as { updatedAt?: string }).updatedAt;
  const keywords = [...(poem.tags || []), ...(poem.category ? [poem.category] : [])].map(oneLine).filter(Boolean).join(', ');
  const linkStyle = { color: 'var(--accent)' } as const;

  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'होम', path: '/' },
          { name: 'कविताएँ', path: '/poems' },
          ...(category ? [{ name: category.label, path: categoryHref(category.slug) }] : []),
          { name: oneLine(poem.title), path },
        ]}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: truncate(poem.title, 110),
          description: truncate(poem.body, 160),
          articleBody: poem.body,
          url: absoluteUrl(path),
          mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
          inLanguage: detectScriptLang(poem.body),
          ...(poem.category ? { articleSection: poem.category } : {}),
          ...(keywords ? { keywords } : {}),
          ...(poem.createdAt ? { datePublished: poem.createdAt } : {}),
          ...(updated ? { dateModified: updated } : {}),
          ...(poem.author
            ? { author: { '@type': 'Person', name: authorName, ...(aPath ? { url: absoluteUrl(aPath) } : {}) } }
            : {}),
          publisher: { '@type': 'Organization', name: 'Mehfil', url: SITE_URL },
        }}
      />
      {children}
      <section aria-label="संबंधित कविताएँ और लिंक" style={{ paddingBottom: '3rem' }}>
        <div className="mehfil-container">
          <p style={{ lineHeight: 2, marginBottom: '1.5rem' }}>
            {category && <>श्रेणी: <Link href={categoryHref(category.slug)} style={linkStyle}>{category.h1}</Link></>}
            {aPath && <>{category && ' · '}रचनाकार: <Link href={aPath} style={linkStyle}>{authorName} की सभी कविताएँ</Link></>}
            {poem.tags && poem.tags.length > 0 && <>{(category || aPath) && ' · '}विषय: {poem.tags.join(', ')}</>}
          </p>
          {related.length > 0 && (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--accent-dark)', marginBottom: '1rem' }}>
                संबंधित कविताएँ
              </h2>
              <div className="poems-list-grid">
                {related.map((p) => (
                  <Link href={`/poem/${encodeURIComponent(p.slug)}`} key={p._id} className="poem-card">
                    <div className="poem-card-header">
                      <span className="mood">{p.category || 'अन्य'}</span>
                    </div>
                    <h3>{p.title}</h3>
                    <p>{truncate(p.body, 110)}</p>
                    <div className="poem-footer">
                      <span>{fullNameOf(p.author) || 'अज्ञात'}</span>
                      <span>{readingMinutes(p.body)} min read</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

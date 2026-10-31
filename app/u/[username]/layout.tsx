import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/site/JsonLd';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { categoryForPoem, categoryHref } from '@/lib/categories';
import { DEFAULT_OG_IMAGE, absoluteUrl, fetchAuthor, fullNameOf, pickImage, truncate } from '@/lib/seo';
import { getVisibleSocialLinks } from '@/lib/socialLinks';

type Props = { params: { username: string }; children: React.ReactNode };

// Same normalisation the page applies before calling the API.
function identOf(raw: string): string {
  let name = String(raw || '');
  try { name = decodeURIComponent(name); } catch { /* keep raw */ }
  return name.replace(/^@/, '').toLowerCase();
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const ident = identOf(params.username);
  const { author, missing } = await fetchAuthor(ident);
  const fallbackPath = `/u/${encodeURIComponent(ident)}`;
  if (!author) {
    // noindex only on a definite 404 from the API (an unreachable API must not de-index real profiles).
    return { title: 'रचनाकार', alternates: { canonical: fallbackPath }, ...(missing ? { robots: { index: false, follow: true } } : {}) };
  }
  const { user, poems } = author;
  const name = fullNameOf(user);
  const path = `/u/${encodeURIComponent((user.username || ident).toLowerCase())}`;
  const description = truncate(
    user.bio ||
      `${name} — मेहफ़िल पर हिंदी कवि एवं शायर।${poems.length ? ` ${poems.length} रचनाएँ पढ़ें:` : ''} ${poems.slice(0, 3).map((p) => p.title).join(', ')}`,
    158,
  );
  const image = pickImage(user.profilePic);
  const title = `${name} — कवि एवं शायर`;
  return {
    title,
    description,
    alternates: { canonical: path },
    // Profiles without any poem are thin content: keep them out of the index (links still followed).
    robots: { index: poems.length > 0, follow: true },
    openGraph: { title: `${title} | Mehfil`, description, url: path, type: 'profile', siteName: 'Mehfil', locale: 'hi_IN', images: image ? [{ url: image }] : [DEFAULT_OG_IMAGE] },
    twitter: { card: image ? 'summary' : 'summary_large_image', title: `${title} | Mehfil`, description, images: [image || DEFAULT_OG_IMAGE.url] },
  };
}

export default async function AuthorLayout({ params, children }: Props) {
  const ident = identOf(params.username);
  const { author, missing } = await fetchAuthor(ident);
  if (!author && missing) notFound();
  if (!author) return <>{children}</>;

  const { user, poems } = author;
  const path = `/u/${encodeURIComponent((user.username || ident).toLowerCase())}`;
  const name = fullNameOf(user);
  const sameAs = getVisibleSocialLinks(user.socialLinks).map((l) => l.url);

  const cats = new Map<string, { slug: string; label: string }>();
  for (const p of poems) {
    const c = categoryForPoem(p);
    if (c) cats.set(c.slug, { slug: c.slug, label: c.h1 });
  }
  const linkStyle = { color: 'var(--accent)' } as const;

  return (
    <>
      <Breadcrumbs items={[{ name: 'होम', path: '/' }, { name: 'रचनाकार', path: '/poets' }, { name, path }]} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name,
          url: absoluteUrl(path),
          ...(user.bio ? { description: user.bio } : {}),
          ...(user.profilePic && /^https?:\/\//i.test(user.profilePic) ? { image: user.profilePic } : {}),
          ...(user.city ? { homeLocation: { '@type': 'Place', name: user.city } } : {}),
          ...(sameAs.length ? { sameAs } : {}),
        }}
      />
      {children}
      {cats.size > 0 && (
        <section aria-label={`${name} की श्रेणियाँ`} style={{ paddingBottom: '3rem' }}>
          <div className="mehfil-container" style={{ lineHeight: 2 }}>
            <p>
              श्रेणियाँ:{' '}
              {Array.from(cats.values()).map((c, i) => (
                <span key={c.slug}>{i > 0 && ' · '}<Link href={categoryHref(c.slug)} style={linkStyle}>{c.label}</Link></span>
              ))}
            </p>
          </div>
        </section>
      )}
    </>
  );
}

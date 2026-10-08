import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { PoemsClient } from '@/components/poems/PoemsClient';
import { POEMS_LIST_PER_PAGE, SEO_CATEGORIES, categoryHref } from '@/lib/categories';
import { fetchAllPoems, parsePage } from '@/lib/seo';

export const revalidate = 3600; // ISR: poems are in the initial HTML, refreshed hourly (client also refreshes live).

type Props = { searchParams: { page?: string } };
const pageOf = (sp: Props['searchParams']) => parsePage(sp?.page);

const DESCRIPTION =
  'हिंदी और उर्दू कविताएँ, ग़ज़लें और शायरी पढ़ें — प्रेम, दर्द, प्रेरणा, सूफ़ी और ज़िंदगी पर चुनिंदा रचनाएँ, मेहफ़िल पर।';

export function generateMetadata({ searchParams }: Props): Metadata {
  const page = pageOf(searchParams);
  const title = page > 1 ? `हिंदी कविता और शायरी — पृष्ठ ${page} | Mehfil` : 'हिंदी कविता और शायरी | Mehfil';
  const canonical = page > 1 ? `/poems?page=${page}` : '/poems';
  return {
    title: { absolute: title },
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: { title, description: DESCRIPTION, url: canonical, type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
  };
}

export default async function PoemsPage({ searchParams }: Props) {
  const poems = await fetchAllPoems();
  const page = pageOf(searchParams);
  // A page number beyond the last page is a real 404 (never a thin empty page). Skipped if the API returned nothing.
  if (poems.length > 0 && page > Math.ceil(poems.length / POEMS_LIST_PER_PAGE)) notFound();
  return (
    <>
      <Breadcrumbs items={[{ name: 'होम', path: '/' }, { name: 'कविताएँ', path: '/poems' }]} />
      <PoemsClient initialPoems={poems} initialPage={page} />
      <section style={{ paddingTop: 0 }}>
        <div className="mehfil-container" style={{ paddingBottom: '3rem', lineHeight: 2 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--accent-dark)', marginBottom: '0.8rem' }}>
            श्रेणी के अनुसार कविताएँ
          </h2>
          <p>
            {SEO_CATEGORIES.map((c, i) => (
              <span key={c.slug}>{i > 0 && ' · '}<Link href={categoryHref(c.slug)} style={{ color: 'var(--accent)' }}>{c.h1}</Link></span>
            ))}
          </p>
        </div>
      </section>
    </>
  );
}

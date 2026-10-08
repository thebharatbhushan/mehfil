import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { SEO_CATEGORIES, categoryHref, poemsForCategory } from '@/lib/categories';
import { fetchAllPoems } from '@/lib/seo';

export const revalidate = 3600;

const DESCRIPTION =
  'अपने मिज़ाज के हिसाब से हिंदी कविताएँ खोजिए — प्रेम, दर्द, शायरी, प्रेरणा, सूफ़ी, रोमांटिक, प्रकृति, ज़िंदगी और दोस्ती की श्रेणियाँ।';

export const metadata: Metadata = {
  title: { absolute: 'कविता श्रेणियाँ — प्रेम, दर्द, शायरी, सूफ़ी, प्रेरणा | Mehfil' },
  description: DESCRIPTION,
  alternates: { canonical: '/category' },
  openGraph: { title: 'कविता श्रेणियाँ | Mehfil', description: DESCRIPTION, url: '/category', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: 'कविता श्रेणियाँ | Mehfil', description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default async function CategoryIndexPage() {
  const poems = await fetchAllPoems();
  return (
    <>
      <Breadcrumbs items={[{ name: 'होम', path: '/' }, { name: 'श्रेणियाँ', path: '/category' }]} />
      <div className="page-header">
        <h1>श्रेणियाँ</h1>
        <p>भावना, विषय और कला के अनुसार कविताएँ खोजें</p>
      </div>

      <section style={{ paddingTop: 0 }}>
        <div className="mehfil-container">
          <div className="category-grid">
            {SEO_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={categoryHref(cat.slug)}
                className="category-card"
                style={{ display: 'block', textDecoration: 'none' }}
                aria-label={`${cat.h1} पढ़ें`}
              >
                <div className="category-icon-circle">{cat.icon}</div>
                <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--accent-dark)', marginBottom: '0.5rem' }}>
                  {cat.label}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {poemsForCategory(cat, poems).length} रचनाएँ
                </p>
              </Link>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2.5rem', lineHeight: 1.8 }}>
            मेहफ़िल पर कविताएँ भावना के हिसाब से बाँटी गई हैं। किसी श्रेणी को खोलिए और उसमें लिखी गई असली रचनाएँ पढ़िए, या सभी{' '}
            <Link href="/poems" style={{ color: 'var(--accent)' }}>हिंदी कविताएँ</Link> और{' '}
            <Link href="/poets" style={{ color: 'var(--accent)' }}>कवियों व शायरों</Link> के पन्ने देखिए।
          </p>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { JsonLd } from '@/components/site/JsonLd';
import { DictionarySearch } from '@/components/dictionary/DictionarySearch';
import { DICTIONARY_PATH, fetchFeatured } from '@/lib/dictionary';
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/seo';
import '@/components/dictionary/dictionary.css';

// Static shell + featured words, rebuilt hourly. Searching happens in the browser against the public API.
export const revalidate = 3600;

const TITLE = 'Mehfil Dictionary | महफ़िल शब्दकोश — हिंदी, उर्दू और English';
const DESCRIPTION =
  'मेहफ़िल शब्दकोश: हिंदी, उर्दू (اردو), Roman और English में शब्द खोजें — अर्थ, उच्चारण, पर्यायवाची, उदाहरण और संबंधित शब्दों के साथ।';

// One canonical URL: /dictionary?q=... result URLs canonicalise back here, so searches never create duplicate pages.
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: DICTIONARY_PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: DICTIONARY_PATH, type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default async function DictionaryPage() {
  const featured = await fetchFeatured(24);
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'DefinedTermSet',
          name: 'Mehfil Dictionary — महफ़िल शब्दकोश',
          url: `${SITE_URL}${DICTIONARY_PATH}`,
          description: DESCRIPTION,
          inLanguage: ['hi', 'ur', 'en'],
        }}
      />
      <Breadcrumbs items={[{ name: 'मुखपृष्ठ', path: '/' }, { name: 'शब्दकोश', path: DICTIONARY_PATH }]} />
      <div className="dict-page">
        <div className="dict-wrap">
          <header className="dict-hero">
            <span className="dict-eyebrow"><i className="fas fa-book" aria-hidden="true" /> हिंदी · اردو · Roman · English</span>
            <h1 className="dict-title">
              महफ़िल शब्दकोश
              <small>Mehfil Dictionary</small>
            </h1>
            <div className="dict-orn" aria-hidden="true"><i className="fas fa-feather-alt" /></div>
            <p className="dict-lead">
              शायरी और साहित्य के लफ़्ज़ों का अर्थ, उनकी उर्दू और रोमन वर्तनी, पर्यायवाची और उदाहरण — एक ही जगह।
            </p>
          </header>
          <DictionarySearch featured={featured} />
        </div>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { SherMeaning } from '@/components/sher-meaning/SherMeaning';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import '@/components/sher-meaning/sher-meaning.css';

const TITLE = 'शायरी का मतलब — शेर का सबसे उपयुक्त अर्थ चुनिए | Mehfil';
const DESCRIPTION = 'मेहफ़िल का शेर खेल: मशहूर शेर पढ़िए और चार में से उसका सबसे उपयुक्त अर्थ चुनिए, साथ में व्याख्या और शब्दों के मायने। मोबाइल पर मुफ़्त, बिना लॉगिन के।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/game/matlab' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/game/matlab', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default function SherMeaningPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'मुखपृष्ठ', path: '/' },
          { name: 'खेल', path: '/games' },
          { name: 'शायरी का मतलब', path: '/game/matlab' },
        ]}
      />
      <section className="sm-section">
        <div className="mehfil-container">
          <header className="sm-head">
            <h1>शायरी का मतलब</h1>
            <p>शेर पढ़िए और उसका सबसे उपयुक्त अर्थ चुनिए।</p>
          </header>
          <SherMeaning />
        </div>
      </section>
    </>
  );
}

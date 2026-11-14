import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { PoetGame } from '@/components/poet-game/PoetGame';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import '@/components/poet-game/poet-game.css';

const TITLE = 'शेर पहचानिए — शायर पहचानने का खेल | Mehfil';
const DESCRIPTION = 'मेहफ़िल का शेर खेल: मशहूर शेर पढ़िए और चार में से सही शायर चुनिए। मोबाइल पर मुफ़्त, बिना लॉगिन के।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/game/poet' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/game/poet', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default function PoetGamePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'मुखपृष्ठ', path: '/' },
          { name: 'खेल', path: '/game' },
          { name: 'शेर पहचानिए', path: '/game/poet' },
        ]}
      />
      <section className="pg-section">
        <div className="mehfil-container">
          <header className="pg-head">
            <h1>शेर पहचानिए</h1>
            <p>पहचानिए मशहूर शेरों के शायर।</p>
          </header>
          <PoetGame />
        </div>
      </section>
    </>
  );
}

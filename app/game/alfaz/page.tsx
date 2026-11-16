import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { ArrangeGame } from '@/components/arrange-game/ArrangeGame';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import '@/components/arrange-game/arrange-game.css';

const TITLE = 'अल्फ़ाज़ सजाइए — शेर के शब्द सजाने का खेल | Mehfil';
const DESCRIPTION = 'मेहफ़िल का शब्द खेल: बिखरे हुए शब्दों को सही क्रम में सजाकर मशहूर शेर पूरा कीजिए। मोबाइल पर मुफ़्त, बिना लॉगिन के।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/game/alfaz' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/game/alfaz', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default function ArrangeGamePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'मुखपृष्ठ', path: '/' },
          { name: 'खेल', path: '/games' },
          { name: 'अल्फ़ाज़ सजाइए', path: '/game/alfaz' },
        ]}
      />
      <section className="ag-section">
        <div className="mehfil-container">
          <header className="ag-head">
            <h1>अल्फ़ाज़ सजाइए</h1>
            <p>बिखरे हुए अल्फ़ाज़ को सही क्रम में सजाकर शेर पूरा कीजिए।</p>
          </header>
          <ArrangeGame />
        </div>
      </section>
    </>
  );
}

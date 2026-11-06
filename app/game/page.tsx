import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { GameClient } from '@/components/game/GameClient';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import '@/components/game/game.css';

const TITLE = 'शेर अंताक्षरी — शेर का खेल | Mehfil';
const DESCRIPTION =
  'मेहफ़िल का शेर अंताक्षरी खेल: कंप्यूटर के साथ शेर की आख़िरी अक्षर से अंताक्षरी खेलिए, या अधूरा शेर पूरा कीजिए। मोबाइल पर मुफ़्त, बिना लॉगिन के।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/game' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/game', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default function GamePage() {
  return (
    <>
      <Breadcrumbs items={[{ name: 'मुखपृष्ठ', path: '/' }, { name: 'शेर अंताक्षरी', path: '/game' }]} />
      <section className="sg-section">
        <div className="mehfil-container">
          <header className="sg-head">
            <h1>शेर अंताक्षरी</h1>
            <p>शेर की आख़िरी अक्षर से अगला शेर शुरू कीजिए। लॉगिन की ज़रूरत नहीं।</p>
          </header>
          <GameClient />
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { MistakeGame } from '@/components/mistake-game/MistakeGame';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import '@/components/mistake-game/mistake-game.css';

const TITLE = 'ग़लती पकड़िए — शेर में बदला हुआ शब्द पहचानिए | Mehfil';
const DESCRIPTION = 'मेहफ़िल का शेर खेल: मशहूर शेर में एक शब्द बदल दिया गया है, उस ग़लत शब्द को पकड़िए। मोबाइल पर मुफ़्त, बिना लॉगिन के।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/game/galti' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/game/galti', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default function MistakeGamePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'मुखपृष्ठ', path: '/' },
          { name: 'खेल', path: '/games' },
          { name: 'ग़लती पकड़िए', path: '/game/galti' },
        ]}
      />
      <section className="ms-section">
        <div className="mehfil-container">
          <header className="ms-head">
            <h1>ग़लती पकड़िए</h1>
            <p>शेर में छिपा बदला हुआ शब्द पहचानिए।</p>
          </header>
          <MistakeGame />
        </div>
      </section>
    </>
  );
}

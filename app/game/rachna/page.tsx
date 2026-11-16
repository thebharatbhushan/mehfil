import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { FormGame } from '@/components/form-game/FormGame';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import '@/components/form-game/form-game.css';

const TITLE = 'रचना पहचानिए — ग़ज़ल, नज़्म, रुबाई, क़िता या दोहा | Mehfil';
const DESCRIPTION = 'मेहफ़िल का खेल: रचना पढ़िए और पहचानिए कि वह ग़ज़ल, नज़्म, रुबाई, क़िता या दोहा में से क्या है। मोबाइल पर मुफ़्त, बिना लॉगिन के।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/game/rachna' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/game/rachna', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default function FormGamePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'मुखपृष्ठ', path: '/' },
          { name: 'खेल', path: '/games' },
          { name: 'रचना पहचानिए', path: '/game/rachna' },
        ]}
      />
      <section className="fg-section">
        <div className="mehfil-container">
          <header className="fg-head">
            <h1>रचना पहचानिए</h1>
            <p>पढ़िए रचना और पहचानिए उसका रूप।</p>
          </header>
          <FormGame />
        </div>
      </section>
    </>
  );
}

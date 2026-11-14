import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { WordGame } from '@/components/word-game/WordGame';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import '@/components/word-game/word-game.css';

const TITLE = 'लफ़्ज़ का मतलब — हिंदी-उर्दू शब्दों का खेल | Mehfil';
const DESCRIPTION = 'मेहफ़िल का शब्द खेल: हिंदी-उर्दू का लफ़्ज़ पढ़िए और चार में से सही मतलब चुनिए। मोबाइल पर मुफ़्त, बिना लॉगिन के।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/game/lafz' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/game/lafz', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default function WordGamePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'मुखपृष्ठ', path: '/' },
          { name: 'खेल', path: '/games' },
          { name: 'लफ़्ज़ का मतलब', path: '/game/lafz' },
        ]}
      />
      <section className="wg-section">
        <div className="mehfil-container">
          <header className="wg-head">
            <h1>लफ़्ज़ का मतलब</h1>
            <p>पहचानिए अल्फ़ाज़ के सही मायने।</p>
          </header>
          <WordGame />
        </div>
      </section>
    </>
  );
}

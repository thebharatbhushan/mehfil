import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import './games-hub.css';

const TITLE = 'खेल — शेर के खेल | Mehfil';
const DESCRIPTION = 'मेहफ़िल के शेर खेल: शेर पूरा कीजिए और शेर पहचानिए। मोबाइल पर मुफ़्त, बिना लॉगिन के।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/games' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/games', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

/** Add a game here and it appears on the page. */
const GAMES = [
  { href: '/game', title: 'शेर पूरा कीजिए', desc: 'अधूरा शेर पढ़िए और चार में से सही दूसरी पंक्ति चुनिए।', meta: '10 सवाल · हर सवाल 15 सेकंड' },
  { href: '/game/poet', title: 'शेर पहचानिए', desc: 'पहचानिए मशहूर शेरों के शायर।', meta: '10 सवाल · चार में से सही शायर चुनिए' },
];

export default function GamesPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: 'मुखपृष्ठ', path: '/' }, { name: 'खेल', path: '/games' }]} />
      <section className="gh-section">
        <div className="mehfil-container">
          <header className="gh-head">
            <h1>खेल</h1>
            <p>कोई खेल चुनिए और खेलना शुरू कीजिए। लॉगिन की ज़रूरत नहीं।</p>
          </header>
          <ul className="gh-list">
            {GAMES.map((g) => (
              <li key={g.href}>
                <Link href={g.href} className="gh-card">
                  <span className="gh-title">{g.title}</span>
                  <span className="gh-desc">{g.desc}</span>
                  <span className="gh-meta">{g.meta}</span>
                  <span className="gh-go">खेलिए →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { PoetQuiz } from '@/components/poet-quiz/PoetQuiz';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import '@/components/poet-quiz/poet-quiz.css';

const TITLE = 'शायर की पहचान — हिंदी-उर्दू शायरों और कवियों की क्विज़ | Mehfil';
const DESCRIPTION = 'मेहफ़िल की साहित्य क्विज़: हिंदी-उर्दू के शायरों और कवियों, उनकी रचनाओं, तख़ल्लुस और साहित्य-इतिहास के सवाल। मोबाइल पर मुफ़्त, बिना लॉगिन के।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/game/shayar' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/game/shayar', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default function PoetQuizPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'मुखपृष्ठ', path: '/' },
          { name: 'खेल', path: '/games' },
          { name: 'शायर की पहचान', path: '/game/shayar' },
        ]}
      />
      <section className="pq-section">
        <div className="mehfil-container">
          <header className="pq-head">
            <h1>शायर की पहचान</h1>
            <p>हिंदी-उर्दू के शायरों, कवियों और उनकी रचनाओं की क्विज़।</p>
          </header>
          <PoetQuiz />
        </div>
      </section>
    </>
  );
}

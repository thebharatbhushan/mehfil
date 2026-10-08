import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import { FeedbackForm } from '@/components/forms/FeedbackForm';

export const metadata: Metadata = {
  title: { absolute: 'Feedback | Mehfil' },
  description: 'Share your feedback, suggestions, bug reports and ideas to help improve Mehfil — the Hindi & Urdu poetry community.',
  alternates: { canonical: '/feedback' },
  robots: { index: false, follow: true },
  openGraph: { title: 'Feedback | Mehfil', description: 'Share your feedback and ideas to help improve Mehfil.', url: '/feedback', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: 'Feedback | Mehfil', description: 'Share your feedback and ideas to help improve Mehfil.', images: [DEFAULT_OG_IMAGE.url] },
};

export default function FeedbackPage() {
  return (
    <section className="mf-page">
      <div className="mehfil-container">
        <div className="mf-card glass-panel">
          <div className="mf-head">
            <span className="mf-orn" aria-hidden="true">❦</span>
            <h1>अपनी राय साझा करें</h1>
            <p>मेहफ़िल को बेहतर बनाने में आपकी राय अहम है। अपने सुझाव, किसी समस्या या नए विचार हमें बताइए — हम हर संदेश ध्यान से पढ़ते हैं।</p>
          </div>
          <FeedbackForm />
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
<<<<<<< HEAD
import { FeedbackInvite } from '@/components/site/FeedbackInvite';
=======
>>>>>>> 4a4b2ff98135a8dce1f72f74192df2fc48d01ff1

export const metadata: Metadata = {
  title: { absolute: 'पृष्ठ नहीं मिला | Mehfil' },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="mf-page">
      <div className="mehfil-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-dark)', fontSize: '2.6rem' }}>यह पृष्ठ नहीं मिला</h1>
        <p style={{ color: 'var(--text-muted)', margin: '1rem 0 2rem' }}>
          शायद लिंक बदल गया है या रचना हटा दी गई है। आप यहाँ से आगे बढ़ सकते हैं:
        </p>
        <p style={{ lineHeight: 2.2 }}>
          <Link href="/" className="primary-btn">मेहफ़िल का मुख्य पृष्ठ</Link>{' '}
          <Link href="/poems" className="secondary-btn">हिंदी कविताएँ पढ़ें</Link>{' '}
          <Link href="/category" className="secondary-btn">श्रेणियाँ देखें</Link>
        </p>
<<<<<<< HEAD
        <FeedbackInvite variant="inline" />
=======
>>>>>>> 4a4b2ff98135a8dce1f72f74192df2fc48d01ff1
      </div>
    </section>
  );
}

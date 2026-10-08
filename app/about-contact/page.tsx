import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import Link from 'next/link';
import { ContactForm } from '@/components/forms/ContactForm';

export const metadata: Metadata = {
  title: { absolute: 'About Us & Contact Us | Mehfil' },
  description: 'Learn about Mehfil, a community for Hindi & Urdu poetry, shayari and literature, and get in touch with the team for queries, suggestions or collaboration.',
  alternates: { canonical: '/about-contact' },
  openGraph: { title: 'About Us & Contact Us | Mehfil', description: 'Know Mehfil and contact the team.', url: '/about-contact', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: 'About Us & Contact Us | Mehfil', description: 'Know Mehfil and contact the team.', images: [DEFAULT_OG_IMAGE.url] },
};

export default function AboutContactPage() {
  return (
    <section className="mf-page">
      <div className="mehfil-container">
        <div className="mf-card glass-panel" id="about">
          <div className="mf-head">
            <span className="mf-orn" aria-hidden="true">❦</span>
            <h1>मेहफ़िल के बारे में</h1>
            <p>शब्दों की एक महफ़िल — जहाँ कविता, शायरी और साहित्य को अपना घर मिलता है।</p>
          </div>
          <div className="mf-about-body">
            <p>मेहफ़िल हिंदी और उर्दू साहित्य के लिए बना एक मंच है। यहाँ कविताएँ, ग़ज़लें और शायरी पढ़ी जाती हैं, लिखी जाती हैं और साझा की जाती हैं — रचनाकारों और पाठकों, दोनों के लिए।</p>
            <p>आप अपनी रचनाएँ प्रकाशित कर सकते हैं, दूसरे रचनाकारों से मिल सकते हैं, श्रेणियों और मिज़ाज के हिसाब से कविताएँ खोज सकते हैं, और रोज़ एक नया शेर व लफ़्ज़ पढ़ सकते हैं।</p>
            <p>हमारी कोशिश है कि हर आवाज़ को सुना जाए और अच्छा साहित्य ज़्यादा से ज़्यादा लोगों तक पहुँचे।</p>
            <div className="mf-about-links">
              <Link href="/poems" className="secondary-btn"><i className="fas fa-book-open" /> कविताएँ पढ़ें</Link>
              <Link href="/publish" className="primary-btn"><i className="fas fa-pen-fancy" /> रचना प्रकाशित करें</Link>
            </div>
          </div>
        </div>

        <div className="mf-card glass-panel" id="contact">
          <div className="mf-head">
            <span className="mf-orn" aria-hidden="true">✿</span>
            <h2>संपर्क करें</h2>
            <p>सामान्य प्रश्न, सुझाव, सहयोग, तकनीकी समस्या, सामग्री से जुड़ी चिंता या कोई और बात — हमें लिखिए, हम जल्द उत्तर देंगे।</p>
          </div>
          <ContactForm />
          <p className="mf-note">कृपया रचनाओं पर सामान्य राय के लिए <Link href="/feedback">Feedback पृष्ठ</Link> का उपयोग करें।</p>
        </div>
      </div>
    </section>
  );
}

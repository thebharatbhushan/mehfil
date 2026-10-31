import Link from 'next/link';
import { LegalHero, LegalRelated, legalMetadata } from '@/components/legal/LegalPage';
import { ReportContentForm } from '@/components/forms/ReportContentForm';

export const metadata = legalMetadata('Report Content', 'Report copyright infringement, harassment, spam or other inappropriate content on Mehfil.', '/report-content', true);

export default function ReportContentPage() {
  return (
    <section className="mf-page lg-page">
      <div className="mehfil-container">
        <LegalHero
          icon="fa-flag"
          title="सामग्री की रिपोर्ट करें"
          intro="कोई रचना या प्रोफ़ाइल हमारे नियमों का उल्लंघन करती लगे, तो यहाँ बताएँ। हम हर रिपोर्ट की समीक्षा करते हैं।"
        />
        <div className="lg-steps">
          <div className="lg-step"><b>1</b><span>रचना या प्रोफ़ाइल का लिंक दें</span></div>
          <div className="lg-step"><b>2</b><span>कारण चुनें और विवरण लिखें</span></div>
          <div className="lg-step"><b>3</b><span>हम समीक्षा करके कार्रवाई करेंगे</span></div>
        </div>
        <div className="mf-card glass-panel">
          <ReportContentForm />
          <p className="mf-note">अधिक जानकारी के लिए <Link href="/community-guidelines">समुदाय दिशानिर्देश</Link> और <Link href="/copyright-policy">कॉपीराइट नीति</Link> देखें।</p>
        </div>
        <LegalRelated current="/report-content" />
      </div>
    </section>
  );
}

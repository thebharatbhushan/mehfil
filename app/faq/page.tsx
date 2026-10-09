import { LegalCta, LegalHero, LegalRelated, legalMetadata } from '@/components/legal/LegalPage';
import { FaqClient } from '@/components/legal/FaqClient';
import { JsonLd } from '@/components/site/JsonLd';

export const metadata = legalMetadata('FAQ', 'Frequently asked questions about Mehfil: publishing poems, accounts, copyright, reporting content and deleting your account.', '/faq');

const FAQS = [
  { q: 'मेहफ़िल क्या है?', a: 'मेहफ़िल हिंदी और उर्दू कविता, ग़ज़ल और शायरी के लिए बना एक साहित्यिक मंच है, जहाँ रचनाकार अपनी रचनाएँ प्रकाशित करते हैं और पाठक उन्हें पढ़ते हैं।' },
  { q: 'क्या रचना पढ़ने के लिए खाता चाहिए?', a: 'नहीं। रचनाएँ पढ़ने के लिए खाते की ज़रूरत नहीं है। रचना प्रकाशित करने के लिए खाता बनाना होता है।' },
  { q: 'मैं अपनी रचना कैसे प्रकाशित करूँ?', a: 'लॉगिन करके “लेखन प्रारम्भ करें” पर जाएँ, शीर्षक, श्रेणी और रचना भरें, कॉपीराइट घोषणा चुनें और प्रकाशित करें।' },
  { q: 'क्या मैं दूसरों की रचना डाल सकता/सकती हूँ?', a: 'नहीं। केवल अपनी मौलिक रचना या वह रचना डालें जिसका आपके पास अधिकार हो।' },
  { q: 'अपनी प्रोफ़ाइल या पासवर्ड कैसे बदलूँ?', a: 'प्रोफ़ाइल पृष्ठ पर जाकर संबंधित भाग में बदलाव करें। पासवर्ड बदलने का विकल्प “अकाउंट और सुरक्षा” में है।' },
  { q: 'मैं अपना अकाउंट कैसे हटाऊँ?', a: 'प्रोफ़ाइल पृष्ठ के “अकाउंट और सुरक्षा” भाग में “अकाउंट हटाएँ” चुनें। इससे आपका खाता और आपकी रचनाएँ स्थायी रूप से हट जाती हैं।' },
  { q: 'किसी आपत्तिजनक या चोरी की रचना की शिकायत कैसे करूँ?', a: 'सामग्री की रिपोर्ट करें पृष्ठ पर रचना का लिंक और कारण भेजें। हम उसकी समीक्षा करेंगे।' },
  { q: 'मेरी रचना किसी ने चुरा ली है, मैं क्या करूँ?', a: 'कॉपीराइट नीति में बताई गई जानकारी के साथ हमें रिपोर्ट भेजें। हम जाँच करके उचित कार्रवाई करेंगे।' },
  { q: 'मैं मेहफ़िल से संपर्क कैसे करूँ?', a: 'हमारे संपर्क पृष्ठ का फ़ॉर्म भरें। रचनाओं पर सामान्य राय के लिए फ़ीडबैक पृष्ठ का उपयोग करें।' },
];

export default function FaqPage() {
  return (
    <section className="mf-page lg-page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <div className="mehfil-container">
        <LegalHero
          icon="fa-question-circle"
          title="अक्सर पूछे जाने वाले प्रश्न"
          intro="मेहफ़िल के बारे में आम सवालों के जवाब यहाँ हैं। नीचे खोजें या किसी सवाल को खोलकर पढ़ें।"
          chips={[{ icon: 'fa-comments', text: `${FAQS.length} सवाल-जवाब` }]}
        />
        <FaqClient faqs={FAQS} />
        <LegalCta />
        <LegalRelated current="/faq" />
      </div>
    </section>
  );
}

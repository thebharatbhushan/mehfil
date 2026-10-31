import { LegalPage, legalMetadata } from '@/components/legal/LegalPage';

export const metadata = legalMetadata('Cookie & Storage Policy', 'How Mehfil uses your browser’s local storage to keep you logged in and remember your preferences. No advertising cookies.', '/cookie-policy');

export default function CookiePolicyPage() {
  return (
    <LegalPage
      current="/cookie-policy"
      icon="fa-cookie-bite"
      highlights={[{ icon: 'fa-key', title: 'सिर्फ़ ज़रूरी स्टोरेज', text: 'लॉगिन, ड्राफ़्ट और पसंद याद रखने के लिए।' }, { icon: 'fa-ad', title: 'कोई विज्ञापन ट्रैकिंग नहीं', text: 'हम विज्ञापन कुकीज़ का उपयोग नहीं करते।' }, { icon: 'fa-broom', title: 'कभी भी साफ़ करें', text: 'ब्राउज़र सेटिंग से इसे हटाया जा सकता है।' }]}
      title="कुकी और स्टोरेज नीति"
      intro="मेहफ़िल आपके ब्राउज़र में कुछ जानकारी सहेजता है ताकि साइट ठीक से काम करे। यहाँ उसका ब्योरा है।"
      sections={[
        { heading: 'हम क्या सहेजते हैं', items: [
          'लॉगिन टोकन और आपकी बुनियादी प्रोफ़ाइल जानकारी, ताकि आप हर पन्ने पर दोबारा लॉगिन न करें।',
          '“मुझे याद रखें” का विकल्प।',
          'रचना लिखते समय अधूरा ड्राफ़्ट, ताकि पन्ना बंद होने पर भी आपका लिखा न खोए।',
          'पढ़ने की आपकी पसंद (जैसे थीम या अक्षर आकार), यदि आपने उन्हें बदला हो।',
        ] },
        { heading: 'विज्ञापन और ट्रैकिंग', paras: [
          'हम विज्ञापन या क्रॉस-साइट ट्रैकिंग कुकीज़ का उपयोग नहीं करते।',
        ] },
        { heading: 'इसे कैसे हटाएँ', paras: [
          'आप लॉगआउट करके लॉगिन जानकारी हटा सकते हैं, या अपने ब्राउज़र की सेटिंग से साइट डेटा साफ़ कर सकते हैं। ऐसा करने पर आपको दोबारा लॉगिन करना होगा और सहेजी हुई पसंद हट जाएँगी।',
        ] },
        { heading: 'तृतीय-पक्ष सामग्री', paras: [
          'फ़ॉन्ट और आइकन जैसी कुछ चीज़ें बाहरी सर्वरों से लोड होती हैं। इन्हें लोड करते समय आपका IP पता उन सर्वरों तक पहुँच सकता है। अधिक जानकारी के लिए हमारी गोपनीयता नीति देखें।',
        ] },
      ]}
    />
  );
}

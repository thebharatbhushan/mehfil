import type { Poem } from '@/lib/mehfil';

/** A category page needs at least this many poems to be indexable / listed in the sitemap (thin-content guard). */
export const MIN_POEMS_TO_INDEX = 3;
export const POEMS_PER_PAGE = 24;
/** Page size of the /poems listing (same value the listing component always used). */
export const POEMS_LIST_PER_PAGE = 16;

export interface SeoCategory {
  slug: string;
  label: string;
  icon: string;
  /** Value of `poem.category` in the database (case-insensitive). */
  apiCategory: string;
  /** Optional extra filter: poem must also carry this tag. */
  tag?: string;
  h1: string;
  title: string;
  description: string;
  intro: string[];
  related: string[];
}

export const SEO_CATEGORIES: SeoCategory[] = [
  {
    slug: 'prem', label: 'प्रेम', icon: '❤️', apiCategory: 'love',
    h1: 'प्रेम कविताएँ',
    title: 'प्रेम कविता — हिंदी प्रेम कविताएँ और शायरी | Mehfil',
    description: 'दिल को छू लेने वाली हिंदी प्रेम कविताएँ और शायरी पढ़ें — इंतज़ार, इज़हार और मोहब्बत के एहसास पर मेहफ़िल के रचनाकारों की असली रचनाएँ।',
    intro: [
      'प्रेम हिंदी और उर्दू कविता का सबसे पुराना और सबसे प्यारा विषय है। यहाँ आपको इज़हार की पहली झिझक, इंतज़ार की बेचैनी और साथ निभाने के वादों पर लिखी गई कविताएँ मिलेंगी।',
      'ये सभी रचनाएँ मेहफ़िल के रचनाकारों ने खुद लिखी हैं। किसी भी कविता पर क्लिक करके पूरी रचना पढ़ें, या कवि के पन्ने पर जाकर उनकी बाक़ी रचनाएँ देखें।',
    ],
    related: ['romantic', 'shayari', 'dard', 'sufi'],
  },
  {
    slug: 'dard', label: 'दर्द', icon: '🌧', apiCategory: 'sad',
    h1: 'दर्द भरी कविताएँ',
    title: 'दर्द भरी कविता — उदासी, जुदाई और तन्हाई की शायरी | Mehfil',
    description: 'दर्द भरी हिंदी कविताएँ और शायरी — जुदाई, तन्हाई और टूटे दिल के एहसास को लफ़्ज़ देती मेहफ़िल के रचनाकारों की चुनिंदा रचनाएँ।',
    intro: [
      'कई बार जो बात कहने से नहीं कही जाती, वह कविता में उतर आती है। दर्द की ये रचनाएँ जुदाई, तन्हाई और अधूरी ख़्वाहिशों की आवाज़ हैं।',
      'अगर आप भी किसी उदास शाम से गुज़र रहे हैं, तो शायद इनमें से कोई पंक्ति आपकी अपनी बात कह दे।',
    ],
    related: ['prem', 'shayari', 'zindagi', 'sufi'],
  },
  {
    slug: 'shayari', label: 'शायरी', icon: '🖋', apiCategory: 'shayari',
    h1: 'हिंदी और उर्दू शायरी',
    title: 'हिंदी शायरी और उर्दू शायरी — शेर, ग़ज़ल और नज़्म | Mehfil',
    description: 'हिंदी और उर्दू शायरी पढ़ें — शेर, ग़ज़ल और नज़्म, जिनमें इश्क़, ज़िंदगी और जज़्बात के रंग हैं। मेहफ़िल के शायरों की मौलिक रचनाएँ।',
    intro: [
      'शायरी दो पंक्तियों में पूरी बात कह देने की कला है। यहाँ शेर, ग़ज़ल और नज़्म — तीनों रूपों की रचनाएँ मिलती हैं, हिंदी और उर्दू दोनों ज़बानों में।',
      'हर रचना के साथ शायर का नाम दिया गया है; उस पर क्लिक करके आप उनकी पूरी महफ़िल तक पहुँच सकते हैं।',
    ],
    related: ['prem', 'dard', 'sufi', 'romantic'],
  },
  {
    slug: 'motivational', label: 'प्रेरणा', icon: '✨', apiCategory: 'motivation',
    h1: 'प्रेरणादायक कविताएँ',
    title: 'प्रेरणादायक कविता — हौसला और उम्मीद की हिंदी कविताएँ | Mehfil',
    description: 'हौसला, मेहनत और उम्मीद जगाने वाली प्रेरणादायक हिंदी कविताएँ पढ़ें। गिरकर उठने और आगे बढ़ने की बात करती मेहफ़िल की रचनाएँ।',
    intro: [
      'कुछ कविताएँ हमें थककर बैठने नहीं देतीं। ये रचनाएँ हार के बाद फिर खड़े होने, मेहनत पर भरोसा रखने और उम्मीद बनाए रखने की बात करती हैं।',
      'सुबह की शुरुआत या किसी मुश्किल दिन में इन्हें पढ़ना अच्छा लगता है।',
    ],
    related: ['zindagi', 'prakriti', 'dosti', 'sufi'],
  },
  {
    slug: 'sufi', label: 'सूफ़ी', icon: '☪', apiCategory: 'sufi',
    h1: 'सूफ़ी कविता और शायरी',
    title: 'सूफ़ी कविता और शायरी — रूहानी और इबादत के रंग | Mehfil',
    description: 'सूफ़ी कविता और रूहानी शायरी पढ़ें — इबादत, इश्क़-ए-हक़ीक़ी और आत्मा की तलाश पर मेहफ़िल के रचनाकारों की रचनाएँ।',
    intro: [
      'सूफ़ी काव्य में प्रेम केवल इंसान से नहीं, उस परम सत्य से भी होता है। यहाँ की रचनाएँ इबादत, फ़क़ीरी और आत्मा की तलाश के रंग समेटे हुए हैं।',
      'इन कविताओं को धीरे-धीरे, ठहरकर पढ़ना बेहतर है।',
    ],
    related: ['shayari', 'prem', 'dard', 'zindagi'],
  },
  {
    slug: 'romantic', label: 'रोमांटिक', icon: '🌹', apiCategory: 'love', tag: 'रोमांस',
    h1: 'रोमांटिक कविताएँ',
    title: 'रोमांटिक कविता — रोमांस पर हिंदी कविताएँ और शायरी | Mehfil',
    description: 'रोमांटिक हिंदी कविताएँ — मुलाक़ात, नज़दीकी और रूमानी एहसासों पर लिखी गई चुनिंदा रचनाएँ, जिन्हें रचनाकारों ने रोमांस टैग किया है।',
    intro: [
      'यह पन्ना प्रेम की उन रचनाओं के लिए है जिनमें रूमानियत का रंग सबसे गहरा है — पहली मुलाक़ात, नज़दीकी और साथ बिताए पलों की कविताएँ।',
      'व्यापक प्रेम कविताओं के लिए प्रेम श्रेणी भी देखें।',
    ],
    related: ['prem', 'shayari', 'dard', 'sufi'],
  },
  {
    slug: 'prakriti', label: 'प्रकृति', icon: '🍃', apiCategory: 'nature',
    h1: 'प्रकृति पर कविताएँ',
    title: 'प्रकृति कविता — बारिश, पहाड़ और मौसम पर हिंदी कविताएँ | Mehfil',
    description: 'प्रकृति पर हिंदी कविताएँ — बारिश, पेड़, नदी और बदलते मौसमों को शब्द देती मेहफ़िल के रचनाकारों की रचनाएँ।',
    intro: [
      'बारिश की बूँदें, सुबह की हवा, नदी का किनारा — प्रकृति हमेशा से कवियों की पहली प्रेरणा रही है।',
      'इन रचनाओं में मौसम सिर्फ़ दृश्य नहीं, एहसास की तरह आता है।',
    ],
    related: ['zindagi', 'motivational', 'prem', 'sufi'],
  },
  {
    slug: 'zindagi', label: 'ज़िंदगी', icon: '🌙', apiCategory: 'life',
    h1: 'ज़िंदगी पर कविताएँ',
    title: 'ज़िंदगी पर कविता — जीवन के अनुभव और सीख की रचनाएँ | Mehfil',
    description: 'ज़िंदगी पर हिंदी कविताएँ — रोज़मर्रा के अनुभव, वक़्त, रिश्ते और जीवन की सीख पर मेहफ़िल के रचनाकारों की रचनाएँ।',
    intro: [
      'ज़िंदगी पर लिखी कविताएँ हमारे रोज़ के अनुभवों को एक नज़र देती हैं — वक़्त का गुज़रना, रिश्तों का बदलना और हर मोड़ पर कुछ सीख जाना।',
      'यहाँ हर रचना किसी असली अनुभव से निकली है।',
    ],
    related: ['motivational', 'dard', 'prakriti', 'dosti'],
  },
  {
    slug: 'dosti', label: 'दोस्ती', icon: '🤝', apiCategory: 'friendship',
    h1: 'दोस्ती पर कविताएँ',
    title: 'दोस्ती पर कविता और शायरी — यारी और साथ की रचनाएँ | Mehfil',
    description: 'दोस्ती पर हिंदी कविताएँ और शायरी — यारी, भरोसे और साथ निभाने के एहसास पर मेहफ़िल के रचनाकारों की रचनाएँ।',
    intro: [
      'दोस्ती वह रिश्ता है जो हम खुद चुनते हैं। इन कविताओं में यारों की महफ़िल, बेफ़िक्र हँसी और मुश्किल में थामे गए हाथ की बात है।',
      'अपने किसी पुराने दोस्त को इनमें से कोई रचना भेजकर देखिए।',
    ],
    related: ['zindagi', 'prem', 'motivational', 'shayari'],
  },
];

export const categoryHref = (slug: string) => `/category/${slug}`;
export const getSeoCategory = (slug: string) => SEO_CATEGORIES.find((c) => c.slug === slug);

export function poemsForCategory(cat: SeoCategory, poems: Poem[]): Poem[] {
  return poems.filter(
    (p) =>
      (p.category || '').toLowerCase() === cat.apiCategory &&
      (!cat.tag || (p.tags || []).includes(cat.tag)),
  );
}

/** Canonical category page for a poem (the broad category, never the tag-based subset). */
export function categoryForPoem(poem: { category?: string }): SeoCategory | undefined {
  const c = (poem.category || '').toLowerCase();
  return SEO_CATEGORIES.find((x) => !x.tag && x.apiCategory === c);
}

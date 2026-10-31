import type { Poem } from '@/lib/mehfil';

/** Whole days since epoch in the reader's local calendar - stable for one local day. */
export function localDayNumber(date: Date = new Date()): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/* ------------------------------------------------------------------ */
/* आज का शेर                                                           */
/* ------------------------------------------------------------------ */

export interface Sher {
  lines: [string, string];
  poet: string;
  tag?: string;
  /** Present when the sher comes from a poem published on Mehfil. */
  href?: string;
}

/**
 * Classical couplets (public-domain poets). Used when no suitable sher exists
 * among the community poems, so the card is never empty.
 */
export const CLASSICAL_SHER: Sher[] = [
  {
    lines: ['हज़ारों ख़्वाहिशें ऐसी कि हर ख़्वाहिश पे दम निकले', 'बहुत निकले मिरे अरमान लेकिन फिर भी कम निकले'],
    poet: 'मिर्ज़ा ग़ालिब',
    tag: 'ख़्वाहिश',
  },
  {
    lines: ['सितारों से आगे जहाँ और भी हैं', 'अभी इश्क़ के इम्तिहाँ और भी हैं'],
    poet: 'अल्लामा इक़बाल',
    tag: 'इश्क़',
  },
  {
    lines: ['पत्ता पत्ता बूटा बूटा हाल हमारा जाने है', 'जाने न जाने गुल ही न जाने बाग़ तो सारा जाने है'],
    poet: 'मीर तक़ी मीर',
    tag: 'दर्द',
  },
  {
    lines: ['इश्क़ ने ग़ालिब निकम्मा कर दिया', 'वर्ना हम भी आदमी थे काम के'],
    poet: 'मिर्ज़ा ग़ालिब',
    tag: 'इश्क़',
  },
  {
    lines: ['ख़ुदी को कर बुलंद इतना कि हर तक़दीर से पहले', 'ख़ुदा बंदे से ख़ुद पूछे बता तेरी रज़ा क्या है'],
    poet: 'अल्लामा इक़बाल',
    tag: 'हौसला',
  },
  {
    lines: ['दिल-ए-नादाँ तुझे हुआ क्या है', 'आख़िर इस दर्द की दवा क्या है'],
    poet: 'मिर्ज़ा ग़ालिब',
    tag: 'दर्द',
  },
];

const MAX_LINE_LENGTH = 90;

function toCouplet(poem: Poem): [string, string] | null {
  const lines = (poem.body || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const [a, b] = lines;
  if (a.length > MAX_LINE_LENGTH || b.length > MAX_LINE_LENGTH) return null;
  return [a, b];
}

/**
 * Picks today's sher. Prefers a couplet from a Mehfil poem (shayari-category or very
 * short poems), otherwise falls back to the classical list. Deterministic per local day.
 */
export function pickSherOfTheDay(poems: Poem[], day: number = localDayNumber()): Sher {
  const community: Sher[] = [];
  for (const poem of poems) {
    const isShayari = (poem.category || '').toLowerCase() === 'shayari';
    const shortPoem = (poem.body || '').split('\n').filter((l) => l.trim()).length <= 4;
    if (!isShayari && !shortPoem) continue;
    const couplet = toCouplet(poem);
    if (!couplet) continue;
    const author = poem.author;
    community.push({
      lines: couplet,
      poet: author ? `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'अज्ञात शायर' : 'अज्ञात शायर',
      tag: poem.category || undefined,
      href: poem.slug ? `/poem/${poem.slug}` : undefined,
    });
  }
  const pool = community.length > 0 ? community : CLASSICAL_SHER;
  return pool[day % pool.length];
}

/* ------------------------------------------------------------------ */
/* आज का लफ़्ज़                                                          */
/* ------------------------------------------------------------------ */

export interface Lafz {
  word: string;
  urdu: string;
  roman: string;
  meaning: string;
  english: string;
  explanation: string;
  example: string;
}

export const LAFZ_LIST: Lafz[] = [
  {
    word: 'तन्हाई',
    urdu: 'تنہائی',
    roman: 'tanhai',
    meaning: 'अकेलापन',
    english: 'Solitude',
    explanation: 'वह अवस्था जब इंसान भीड़ में हो या न हो, भीतर से ख़ुद के साथ अकेला होता है। शायरी में यह दर्द भी है और आत्म-संवाद का सुकून भी।',
    example: 'तन्हाई में भी एक पूरी दुनिया बसी होती है।',
  },
  {
    word: 'ख़ामोशी',
    urdu: 'خاموشی',
    roman: 'khamoshi',
    meaning: 'चुप्पी, मौन',
    english: 'Silence',
    explanation: 'शब्दों का न होना, पर अर्थ का होना। उर्दू शायरी में ख़ामोशी अक्सर सबसे ऊँची आवाज़ बन जाती है।',
    example: 'उसकी ख़ामोशी ने वो सब कह दिया जो लफ़्ज़ कभी न कह पाते।',
  },
  {
    word: 'इंतज़ार',
    urdu: 'انتظار',
    roman: 'intezaar',
    meaning: 'प्रतीक्षा',
    english: 'Waiting',
    explanation: 'किसी के आने, किसी बात के होने की उम्मीद में गुज़रता वक़्त। इश्क़ की शायरी का सबसे पुराना साथी।',
    example: 'दरवाज़े पर टिकी आँखें हर शाम नया इंतज़ार बुन लेती हैं।',
  },
  {
    word: 'सुकून',
    urdu: 'سکون',
    roman: 'sukoon',
    meaning: 'चैन, शांति',
    english: 'Peace of mind',
    explanation: 'वह ठहराव जो बाहर की हलचल थमने पर नहीं, भीतर की बेचैनी थमने पर मिलता है।',
    example: 'चाय की भाप और तुम्हारी बातें, बस इतना ही सुकून काफ़ी है।',
  },
  {
    word: 'आरज़ू',
    urdu: 'آرزو',
    roman: 'aarzoo',
    meaning: 'इच्छा, चाहत',
    english: 'Longing',
    explanation: 'दिल की गहराई से उठी वह चाह जो पूरी हो या न हो, इंसान को ज़िंदा रखती है।',
    example: 'हर आरज़ू पूरी नहीं होती, पर हर आरज़ू कुछ सिखा जाती है।',
  },
  {
    word: 'जुदाई',
    urdu: 'جدائی',
    roman: 'judaai',
    meaning: 'बिछड़ना, वियोग',
    english: 'Separation',
    explanation: 'प्रिय से दूरी का एहसास। इसे फ़िराक़ भी कहा जाता है और यह ग़ज़ल का केंद्रीय भाव है।',
    example: 'जुदाई की रात लंबी थी, पर यादों की रौशनी उससे भी लंबी निकली।',
  },
  {
    word: 'मुसाफ़िर',
    urdu: 'مسافر',
    roman: 'musafir',
    meaning: 'राही, यात्री',
    english: 'Traveller',
    explanation: 'वह जो मंज़िल से ज़्यादा सफ़र को जीता है। शायरी में ज़िंदगी को अक्सर एक मुसाफ़िर की तरह देखा गया है।',
    example: 'हम तो मुसाफ़िर हैं, हर मोड़ पर कुछ छोड़ते और कुछ पाते चलते हैं।',
  },
  {
    word: 'इश्क़',
    urdu: 'عشق',
    roman: 'ishq',
    meaning: 'गहरा प्रेम, लगाव',
    english: 'Deep love',
    explanation: 'मुहब्बत की वह शिद्दत जो इंसान को ख़ुद से आगे ले जाती है। सूफ़ी परंपरा में यह ख़ुदा तक पहुँचने का रास्ता भी है।',
    example: 'इश्क़ वो आग है जो जलाती भी है और रास्ता भी दिखाती है।',
  },
  {
    word: 'ख़्वाब',
    urdu: 'خواب',
    roman: 'khwaab',
    meaning: 'सपना',
    english: 'Dream',
    explanation: 'नींद में दिखने वाला दृश्य, और जागती आँखों की उम्मीद भी। ख़्वाब शायर की सबसे क़ीमती पूँजी है।',
    example: 'ख़्वाब टूट जाएँ तो भी उनकी किरचें आँखों में चमकती रहती हैं।',
  },
  {
    word: 'वफ़ा',
    urdu: 'وفا',
    roman: 'wafa',
    meaning: 'निष्ठा, निभाना',
    english: 'Fidelity',
    explanation: 'किए गए वादे और जुड़े हुए रिश्ते को हर हाल में निभाने का नाम। इसका उलट है बेवफ़ाई।',
    example: 'वफ़ा शब्दों में नहीं, मुश्किल वक़्त में साथ खड़े रहने में दिखती है।',
  },
  {
    word: 'दर्द',
    urdu: 'درد',
    roman: 'dard',
    meaning: 'पीड़ा, टीस',
    english: 'Pain',
    explanation: 'तन का भी और मन का भी। शायरी में दर्द अक्सर रचना की जड़ बनकर आता है।',
    example: 'जिसने दर्द को सलीक़े से सहा, उसी की कलम में असर आया।',
  },
  {
    word: 'सफ़र',
    urdu: 'سفر',
    roman: 'safar',
    meaning: 'यात्रा, राह',
    english: 'Journey',
    explanation: 'एक जगह से दूसरी जगह जाना, या ज़िंदगी की पूरी राह। अक्सर मंज़िल से ज़्यादा अहम माना जाता है।',
    example: 'सफ़र लंबा था, पर हर पड़ाव ने कुछ नया सिखा दिया।',
  },
  {
    word: 'नज़र',
    urdu: 'نظر',
    roman: 'nazar',
    meaning: 'दृष्टि, निगाह',
    english: 'Glance, gaze',
    explanation: 'देखने का ढंग और देखे जाने का एहसास। नज़र मिलना, नज़र लगना, नज़र चुराना: हर मुहावरे में एक कहानी है।',
    example: 'एक नज़र में उसने वो कह दिया जो बरसों की बातें न कह सकीं।',
  },
  {
    word: 'शब',
    urdu: 'شب',
    roman: 'shab',
    meaning: 'रात',
    english: 'Night',
    explanation: 'रात के लिए फ़ारसी मूल का लफ़्ज़। शब-ए-फ़िराक़, शब-ए-इंतज़ार जैसे मिले-जुले रूपों में शायरी में बार-बार आता है।',
    example: 'शब ढलती रही और बातें चाँद के साथ चलती रहीं।',
  },
  {
    word: 'चाँदनी',
    urdu: 'چاندنی',
    roman: 'chaandni',
    meaning: 'चंद्रमा की रौशनी',
    english: 'Moonlight',
    explanation: 'रात की वह कोमल उजास जो सुकून भी देती है और याद भी जगाती है।',
    example: 'चाँदनी आँगन में उतरी तो पुरानी बातें फिर से जाग उठीं।',
  },
];

export function pickLafzOfTheDay(day: number = localDayNumber()): Lafz {
  return LAFZ_LIST[day % LAFZ_LIST.length];
}

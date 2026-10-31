const DEVANAGARI_MAP: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'ah',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh',
  'स': 's', 'ह': 'h',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ः': 'h',
  'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy',
};

export function transliterateToRoman(text: string): string {
  let result = '';
  let remaining = text;
  while (remaining.length > 0) {
    let matched = false;
    const two = remaining.substring(0, 2);
    if (DEVANAGARI_MAP[two]) {
      result += DEVANAGARI_MAP[two];
      remaining = remaining.substring(2);
      matched = true;
    }
    if (!matched) {
      const one = remaining[0];
      if (DEVANAGARI_MAP[one]) {
        result += DEVANAGARI_MAP[one];
      } else {
        result += one;
      }
      remaining = remaining.substring(1);
    }
  }
  return result.toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function normalizeForSearch(text: string): string[] {
  const lower = text.toLowerCase().trim();
  const roman = transliterateToRoman(text);
  return [lower, roman].filter(Boolean);
}

export function matchesSearch(query: string, ...fields: string[]): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const qRoman = transliterateToRoman(query);
  return fields.some((field) => {
    const fieldVariants = normalizeForSearch(field);
    return fieldVariants.some((v) => v.includes(q) || v.includes(qRoman));
  });
}

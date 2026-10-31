import { API_BASE_URL } from '@/lib/mehfil';
import { SITE_URL, absoluteUrl, oneLine, truncate } from '@/lib/seo';

// ---------------------------------------------------------------------------------------------------------------
// Types (mirror the public /api/dictionary responses)
// ---------------------------------------------------------------------------------------------------------------

export type MatchType = 'exact' | 'spelling' | 'translation' | 'synonym' | 'prefix' | 'similar-sound' | 'typo';

export interface DictCard {
  slug: string;
  canonicalWord: string;
  language: string;
  urdu: string;
  variants: { hindi: string[]; urdu: string[]; roman: string[] };
  english: string[];
  partOfSpeech: string;
  meaning: string;
  matchedOn?: { type: MatchType; text: string; language: 'hi' | 'ur' | 'en'; note?: string };
  score?: number;
}

export interface DictExample { text: string; translation: string }
export interface DictMeaning { partOfSpeech: string; hindi: string; urdu: string; english: string; examples: DictExample[] }
export interface DictEntry {
  conceptId: string;
  slug: string;
  canonicalWord: string;
  language: string;
  variants: { hindi: string[]; urdu: string[]; roman: string[]; aliases: string[] };
  englishTranslations: Array<{ term: string; note: string }>;
  pronunciation: string;
  partOfSpeech: string[];
  meanings: DictMeaning[];
  synonyms: string[];
  antonyms: string[];
  relatedWords: string[];
  literaryExamples: Array<{ text: string; author: string; source: string }>;
  etymology: string;
  tags: string[];
  categories: string[];
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface DictWord { entry: DictEntry; links: Record<string, { slug: string; canonicalWord: string }>; related: DictCard[] }

export const DICTIONARY_PATH = '/dictionary';
export const wordPath = (slug: string) => `${DICTIONARY_PATH}/${encodeURIComponent(slug)}`;

// ---------------------------------------------------------------------------------------------------------------
// Server-side fetchers (cached like the rest of the site; status 0 = API unreachable, never treated as "missing")
// ---------------------------------------------------------------------------------------------------------------

type ApiResult<T> = { status: number; data: T | null };

async function getApi<T>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { status: res.status, data: null };
    return { status: res.status, data: (await res.json()) as T };
  } catch {
    return { status: 0, data: null };
  }
}

export async function fetchWord(slug: string): Promise<{ word: DictWord | null; missing: boolean }> {
  const { status, data } = await getApi<{ entry?: DictEntry; links?: DictWord['links']; related?: DictCard[] }>(`/api/dictionary/word/${encodeURIComponent(slug)}`);
  if (!data?.entry) return { word: null, missing: status === 404 };
  return { word: { entry: data.entry, links: data.links || {}, related: data.related || [] }, missing: false };
}

export async function fetchFeatured(limit = 24): Promise<DictCard[]> {
  const { data } = await getApi<{ entries?: DictCard[] }>(`/api/dictionary/featured?limit=${limit}`);
  return (data?.entries || []).filter((e) => e && e.slug && e.canonicalWord);
}

/** Every published slug (sitemap). Returns [] when the API is unreachable so the sitemap itself never fails. */
export async function fetchDictionarySlugs(): Promise<Array<{ slug: string; updatedAt?: string }>> {
  const out: Array<{ slug: string; updatedAt?: string }> = [];
  for (let page = 1; page <= 50; page++) {
    const { data } = await getApi<{ entries?: Array<{ slug: string; updatedAt?: string }>; totalPages?: number }>(`/api/dictionary/sitemap?page=${page}&limit=1000`);
    if (!data?.entries) break;
    out.push(...data.entries);
    if (page >= (data.totalPages || 1)) break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// SEO text (always generated from the stored content, with safe length limits and fallbacks)
// ---------------------------------------------------------------------------------------------------------------

export function primaryMeaning(e: DictEntry): string {
  const m = e.meanings.find((x) => x.hindi || x.english || x.urdu);
  return oneLine(m?.hindi || m?.english || m?.urdu || '');
}

export function wordTitle(e: DictEntry): string {
  // The root layout appends " | Mehfil", so a stored title that already carries it is trimmed.
  const custom = oneLine(e.seoTitle).replace(/\s*[|–—-]\s*Mehfil\s*$/i, '');
  if (custom) return truncate(custom, 70);
  const parts = [e.variants.urdu.length ? 'Urdu Meaning' : '', e.englishTranslations.length ? 'English Translation' : ''].filter(Boolean);
  return truncate(`${e.canonicalWord} का अर्थ${parts.length ? `, ${parts.join(' & ')}` : ''}`, 70);
}

export function wordDescription(e: DictEntry): string {
  const custom = oneLine(e.seoDescription);
  if (custom) return truncate(custom, 158);
  const urdu = e.variants.urdu[0];
  const english = e.englishTranslations.map((t) => t.term).slice(0, 3).join(', ');
  const roman = e.variants.roman[0];
  const bits = [
    `${e.canonicalWord}${urdu ? ` (${urdu})` : ''}${roman ? ` — ${roman}` : ''} का अर्थ: ${primaryMeaning(e)}`,
    english ? `English: ${english}.` : '',
  ];
  return truncate(bits.filter(Boolean).join(' '), 158);
}

export function wordJsonLd(e: DictEntry) {
  const url = absoluteUrl(wordPath(e.slug));
  const alt = [...e.variants.urdu, ...e.variants.roman, ...e.variants.hindi.filter((h) => h !== e.canonicalWord)].slice(0, 12);
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': `${url}#term`,
    url,
    name: e.canonicalWord,
    ...(alt.length ? { alternateName: alt } : {}),
    description: primaryMeaning(e) || wordDescription(e),
    inLanguage: e.language === 'ur' ? 'ur' : 'hi',
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Mehfil Dictionary — महफ़िल शब्दकोश', url: `${SITE_URL}${DICTIONARY_PATH}` },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Match labels shown in results
// ---------------------------------------------------------------------------------------------------------------

export const MATCH_LABEL: Record<MatchType, string> = {
  exact: 'सटीक मिलान',
  spelling: 'वैकल्पिक वर्तनी',
  translation: 'अंग्रेज़ी अनुवाद',
  synonym: 'पर्यायवाची',
  prefix: 'शब्द का आरंभ',
  'similar-sound': 'मिलती-जुलती ध्वनि',
  typo: 'क्या आपका मतलब यह था?',
};

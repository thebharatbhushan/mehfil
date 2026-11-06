/**
 * Devanagari "akshar" helpers for Sher Antakshari.
 *
 * Rule used by the game: the "last akshar" of a sher is its last CONSONANT or INDEPENDENT VOWEL.
 * Everything that merely decorates it is ignored: matras (ा ि ी ु ू े ै ो ौ ृ ...), anusvara / chandrabindu /
 * visarga (ं ँ ः), nukta (क़ -> क), a trailing halant (न् -> न), danda, punctuation, digits, quotes, spaces.
 *
 * Conjuncts: the four classical ligature letters क्ष त्र ज्ञ श्र count as ONE akshar. For any other
 * conjunct the last consonant of the cluster is used (क्या -> य, दोस्त -> त, शस्त्र -> त्र, मित्र -> त्र).
 *
 * This file has no imports on purpose, so it can be unit-tested with plain `node --test`.
 */

const HALANT = '्';
const NUKTA = '़';

/** Traditional conjunct letters of the Hindi varnamala, treated as one akshar. */
const LIGATURES = new Set(['क्ष', 'त्र', 'ज्ञ', 'श्र']);

function isConsonant(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return (c >= 0x0915 && c <= 0x0939) || (c >= 0x0958 && c <= 0x095f) || (c >= 0x0978 && c <= 0x097f);
}

function isIndependentVowel(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return (c >= 0x0904 && c <= 0x0914) || c === 0x0960 || c === 0x0961;
}

const isLetter = (ch: string) => isConsonant(ch) || isIndependentVowel(ch);

/**
 * NFC-normalises, then removes the nukta (and zero-width joiners) so क़ ख़ ग़ ज़ ड़ ढ़ फ़ become क ख ग ज ड ढ फ.
 * (NFC already stores क़ as क + ़; the extra NFD pass also covers ऩ ऱ ऴ.)
 */
export function stripNukta(text: string): string {
  return text
    .normalize('NFC')
    .normalize('NFD')
    .split(NUKTA).join('')
    .replace(/[‌‍]/g, '');
}

/** The ligature (e.g. 'क्ष') that ends at index `i` (the index of its second consonant), or null. */
function ligatureEndingAt(s: string, i: number): string | null {
  if (i >= 2 && s[i - 1] === HALANT && isConsonant(s[i - 2])) {
    const pair = s[i - 2] + HALANT + s[i];
    if (LIGATURES.has(pair)) return pair;
  }
  return null;
}

/** The ligature that starts at index `i`, or null. */
function ligatureStartingAt(s: string, i: number): string | null {
  if (s[i + 1] === HALANT && i + 2 < s.length && isConsonant(s[i + 2])) {
    const pair = s[i] + HALANT + s[i + 2];
    if (LIGATURES.has(pair)) return pair;
  }
  return null;
}

/**
 * Last akshar of `text` (see file header for the rules). Returns '' when the text holds no Devanagari letter.
 *   getLastAkshar('दिल की बात है।')  -> 'ह'
 *   getLastAkshar('दोस्त')            -> 'त'
 *   getLastAkshar('मित्र')            -> 'त्र'
 *   getLastAkshar('ज़िंदगी')           -> 'ग'
 */
export function getLastAkshar(text: string): string {
  const s = stripNukta(text || '');
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (isIndependentVowel(ch)) return ch;
    if (isConsonant(ch)) return ligatureEndingAt(s, i) ?? ch;
    // anything else (space, danda, punctuation, digits, quotes, matras, anusvara, halant ...) is skipped
  }
  return '';
}

/**
 * First akshar of `text` - the same notion as getLastAkshar, read from the start, so that
 * "last akshar of sher A" can be compared with "first akshar of sher B" using ===.
 *   getFirstAkshar('"क्या" कहा')  -> 'क'
 *   getFirstAkshar('क्षमा करो')    -> 'क्ष'
 *   getFirstAkshar('आँखें')       -> 'आ'
 */
export function getFirstAkshar(text: string): string {
  const s = stripNukta(text || '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (isIndependentVowel(ch)) return ch;
    if (isConsonant(ch)) return ligatureStartingAt(s, i) ?? ch;
  }
  return '';
}

/** True when a sher beginning with `first` may follow a sher ending with `last`. Empty values never match. */
export function aksharMatches(last: string, first: string): boolean {
  return last !== '' && last === first;
}

/**
 * Loose key used to compare typed text with stored lines: NFC, no nukta, chandrabindu == anusvara,
 * no punctuation / digits / spaces / zero-width characters, lower-cased Latin.
 */
export function normalizeForMatch(text: string): string {
  return stripNukta(text || '')
    .replace(/ँ/g, 'ं') // ँ -> ं
    .replace(/[^ऀ-ॿ\p{L}]/gu, '') // keep letters only (Devanagari block incl. matras, plus other scripts)
    .replace(/[।॥०-९]/g, '') // danda, double danda, Devanagari digits
    .toLowerCase();
}

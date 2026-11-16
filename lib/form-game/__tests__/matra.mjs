// Simple Devanagari matra counter used only to VERIFY the stored dohas (13 + 11 per line). Not used at runtime.
const LONG_MATRA = new Set(['ा', 'ी', 'ू', 'े', 'ै', 'ो', 'ौ', 'ॉ']);
const SHORT_MATRA = new Set(['ि', 'ु', 'ृ']);
const IND_LONG = new Set(['आ', 'ई', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ']);
const IND_SHORT = new Set(['अ', 'इ', 'उ', 'ऋ']);
const isCons = (c) => c >= 'क' && c <= 'ह' || ['क़', 'ख़', 'ग़', 'ज़', 'ड़', 'ढ़', 'फ़', 'य़'].includes(c);
const HAL = '्', NUKTA = '़', ANUS = 'ं', VIS = 'ः', CHAND = 'ँ';

/** returns list of syllable weights (1 = laghu, 2 = guru) */
export function syllables(text) {
  const s = [...text.normalize('NFC').replace(/[।॥,.;:!?'"\-–—\s]/g, (m) => (/\s/.test(m) ? ' ' : ''))];
  const out = []; // {w}
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (IND_LONG.has(c) || IND_SHORT.has(c)) {
      let w = IND_LONG.has(c) ? 2 : 1; i++;
      if (s[i] === CHAND) i++;
      if (s[i] === ANUS || s[i] === VIS) { w = 2; i++; }
      out.push({ w }); continue;
    }
    if (isCons(c)) {
      let w = 1; i++;
      if (s[i] === NUKTA) i++;
      // conjunct: halant then another consonant => previous syllable becomes guru (if short)
      if (s[i] === HAL) { // this consonant belongs to next syllable as part of cluster
        i++;
        // cluster consonant(s) attach to the following syllable; mark previous syllable guru
        if (out.length) out[out.length - 1].w = 2;
        // continue: the cluster's last consonant gets its own matra in next loop iteration
        continue;
      }
      if (LONG_MATRA.has(s[i])) { w = 2; i++; }
      else if (SHORT_MATRA.has(s[i])) { w = 1; i++; }
      if (s[i] === CHAND) i++;
      if (s[i] === ANUS || s[i] === VIS) { w = 2; i++; }
      out.push({ w }); continue;
    }
    i++;
  }
  return out.map((x) => x.w);
}
export const matras = (text) => syllables(text).reduce((a, b) => a + b, 0);

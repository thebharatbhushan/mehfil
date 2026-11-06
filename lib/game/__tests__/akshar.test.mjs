// Run: node --test "lib/game/__tests__/*.test.mjs"   (Node >= 22.18, which strips TypeScript types natively; no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';
import { getLastAkshar, getFirstAkshar, aksharMatches, normalizeForMatch } from '../akshar.ts';

const LAST = [
  // [input, expected, why]
  ['दवा', 'व', 'trailing aa-matra'],
  ['कि', 'क', 'trailing i-matra'],
  ['है', 'ह', 'trailing ai-matra'],
  ['नहीं', 'ह', 'trailing ii-matra + anusvara: the anusvara is skipped, the matra is skipped'],
  ['मेरे सपने', 'न', 'trailing e-matra'],
  ['दिल को', 'क', 'trailing o-matra'],
  ['कौन सा', 'स', 'matra aa'],
  ['आँख', 'ख', 'ends with a bare consonant'],
  ['हाँ', 'ह', 'chandrabindu after matra'],
  ['तुम', 'म', 'bare consonant'],
  ['दिल है।', 'ह', 'trailing danda'],
  ['दिल है ॥', 'ह', 'double danda + space'],
  ['"ज़िंदगी"…', 'ग', 'quotes and ellipsis around the word'],
  ['जान 123', 'न', 'trailing ASCII digits'],
  ['जान १२३।', 'न', 'trailing Devanagari digits + danda'],
  ['ज़िंदगी ग़म', 'म', 'nukta letters inside, last is plain'],
  ['दर्द-ए-दिल ग़ज़', 'ज', 'nukta on the last letter (ज़ -> ज)'],
  ['ख़ुदा बख़्श', 'श', 'nukta earlier + conjunct ending in श'],
  ['क़', 'क', 'precomposed U+0958 (क़) is normalised to क'],
  ['दोस्त', 'त', 'conjunct स्त -> last consonant'],
  ['क्या', 'य', 'conjunct क्य -> last consonant'],
  ['मित्र', 'त्र', 'ligature त्र is one akshar'],
  ['शस्त्र', 'त्र', 'ligature after another conjunct'],
  ['लक्ष', 'क्ष', 'ligature क्ष'],
  ['ज्ञान ज्ञ', 'ज्ञ', 'ligature ज्ञ'],
  ['विश्राम श्र', 'श्र', 'ligature श्र'],
  ['विद्वान्', 'न', 'trailing halant is ignored'],
  ['उसका नाम ओ', 'ओ', 'ends with an independent vowel'],
  ['बस इतना ही अ', 'अ', 'independent vowel अ'],
  ['पाप अं', 'अ', 'independent vowel + anusvara'],
  ['दुःख', 'ख', 'visarga inside the word'],
  ['पुनः', 'न', 'trailing visarga is ignored'],
  ['कृ', 'क', 'vocalic-r matra'],
  ['  तेरा   ', 'र', 'surrounding spaces'],
  ['Hello', '', 'no Devanagari at all'],
  ['', '', 'empty string'],
  ['।॥ ...', '', 'only punctuation'],
  ['दोस्‍त', 'त', 'zero-width joiner inside the word'],
];

for (const [input, expected, why] of LAST) {
  test(`getLastAkshar(${JSON.stringify(input)}) === ${JSON.stringify(expected)} (${why})`, () => {
    assert.equal(getLastAkshar(input), expected);
  });
}

const FIRST = [
  ['क्या', 'क'],
  ['क्षमा करो', 'क्ष'],
  ['"आँखें" खुलीं', 'आ'],
  ['ज़िंदगी', 'ज'],
  ['ज्ञान', 'ज्ञ'],
  ['त्रिशूल', 'त्र'],
  ['श्री राम', 'श्र'],
  ['स्वप्न', 'स'],
  ['  १ उम्मीद', 'उ'],
  ['ख़ुदा', 'ख'],
  ['', ''],
];
for (const [input, expected] of FIRST) {
  test(`getFirstAkshar(${JSON.stringify(input)}) === ${JSON.stringify(expected)}`, () => {
    assert.equal(getFirstAkshar(input), expected);
  });
}

test('NFC / decomposed input give the same answer', () => {
  const composed = 'ज़िंदगी';
  const decomposed = 'ज़िं' + 'दगी';
  assert.equal(getLastAkshar(composed), getLastAkshar(decomposed));
  assert.equal(getFirstAkshar(composed), getFirstAkshar(decomposed));
});

test('chain rule: last akshar of one sher matches first akshar of the next', () => {
  assert.ok(aksharMatches(getLastAkshar('दिल की बात है।'), getFirstAkshar('हम तो मुसाफ़िर हैं')));
  assert.ok(!aksharMatches(getLastAkshar('दवा'), getFirstAkshar('वफ़ा'.replace('व', 'ब'))));
  assert.ok(!aksharMatches('', ''));
});

test('normalizeForMatch ignores nukta, chandrabindu, punctuation and spaces', () => {
  assert.equal(normalizeForMatch('आँखें, ज़िंदगी।'), normalizeForMatch('आंखें जिंदगी'));
});

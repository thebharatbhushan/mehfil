/**
 * Waits until the Devanagari web fonts the game draws with are loaded, so the canvas never paints (and caches)
 * text in a fallback font. @fontsource splits fonts by unicode-range, so each load() names Devanagari sample text
 * to trigger the right subset. Never rejects and never waits longer than `timeoutMs` (the game then starts anyway).
 */
export async function waitForGameFonts(timeoutMs = 4000): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const sample = 'शेर अंताक्षरी क्षत्रज्ञश्र ज़िंदगी';
  const loads = Promise.all([
    document.fonts.load('400 24px "Noto Serif Devanagari"', sample),
    document.fonts.load('600 24px "Noto Serif Devanagari"', sample),
    document.fonts.load('700 24px "Noto Serif Devanagari"', sample),
    document.fonts.load('400 24px "Tiro Devanagari Hindi"', sample),
    document.fonts.load('600 24px "Lora"', 'Mehfil'),
  ])
    .then(() => document.fonts.ready)
    .catch(() => undefined);
  await Promise.race([loads, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}

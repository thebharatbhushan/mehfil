/**
 * Loads the official Mehfil logo PNGs once for canvas drawing (no other imports, so fonts.ts and logo.ts can both use it).
 *   dark  -> public/mehfil-logo.png        (maroon + gold, for light card themes)
 *   light -> public/mehfil-logo-light.png  (cream + gold, for dark card themes)
 */
const LOGO_SRC = { dark: '/mehfil-logo.png', light: '/mehfil-logo-light.png' } as const;
export type LogoTone = keyof typeof LOGO_SRC;
const logoImgs: Partial<Record<LogoTone, HTMLImageElement>> = {};
const logoLoads: Partial<Record<LogoTone, Promise<void>>> = {};

function loadLogo(tone: LogoTone): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  return (logoLoads[tone] ??= new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      logoImgs[tone] = img;
      resolve();
    };
    img.onerror = () => resolve(); // fall back to the vector feather + text lock-up below
    img.src = LOGO_SRC[tone];
  }));
}

/** Loads both logo variants. Await before painting a card; never rejects. */
export function preloadBrandLogo(): Promise<void> {
  return Promise.all([loadLogo('dark'), loadLogo('light')]).then(() => undefined);
}


export function getLogoImage(tone: LogoTone): HTMLImageElement | undefined {
  return logoImgs[tone];
}

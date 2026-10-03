/**
 * Share-as-image: shared types, option lists and defaults.
 * The card is always 1080 x 1350 (4:5 portrait, the Instagram / WhatsApp-status friendly ratio).
 */

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
/** Exported PNGs are rendered at this multiple of the logical size (2160 x 2700) so Devanagari matras and Nastaliq stay crisp. */
export const EXPORT_SCALE = 2;

export type BackgroundId = 'classic' | 'cream' | 'paper' | 'dark' | 'night' | 'warm' | 'minimal';
export type DecorationId = 'none' | 'leaves' | 'flowers' | 'botanical' | 'ornaments' | 'stars';
export type FontStyleId = 'classic' | 'elegant' | 'modern' | 'urdu';
export type AlignId = 'left' | 'center' | 'right';
export type SizeId = 'small' | 'medium' | 'large';

/** The Mehfil watermark, logo and mehfil.in are mandatory on every card, so they are not options. */
export interface ShareCardOptions {
  background: BackgroundId;
  decoration: DecorationId;
  font: FontStyleId;
  align: AlignId;
  size: SizeId;
}

export const DEFAULT_OPTIONS: ShareCardOptions = {
  background: 'classic',
  decoration: 'leaves',
  font: 'classic',
  align: 'center',
  size: 'medium',
};

export interface SharePoemData {
  /** Used for the file name: mehfil-poem-{id}.png */
  id: string;
  authorName: string;
  body: string;
  title?: string;
  /** Author's profile picture URL. When missing or unloadable the default Mehfil avatar / initial is used. */
  authorImage?: string;
  /** Absolute poem URL, included in the share text. */
  url?: string;
}

export interface OptionItem<T extends string> {
  id: T;
  label: string;
  hint: string;
}

export const BACKGROUND_OPTIONS: OptionItem<BackgroundId>[] = [
  { id: 'classic', label: 'Classic', hint: 'क्लासिक' },
  { id: 'cream', label: 'Cream', hint: 'क्रीम' },
  { id: 'paper', label: 'Paper', hint: 'काग़ज़' },
  { id: 'dark', label: 'Dark', hint: 'डार्क' },
  { id: 'night', label: 'Night', hint: 'रात' },
  { id: 'warm', label: 'Warm', hint: 'गर्म' },
  { id: 'minimal', label: 'Minimal', hint: 'सादा' },
];

export const DECORATION_OPTIONS: OptionItem<DecorationId>[] = [
  { id: 'none', label: 'None', hint: 'कोई नहीं' },
  { id: 'leaves', label: 'Leaves', hint: 'पत्तियाँ' },
  { id: 'flowers', label: 'Flowers', hint: 'फूल' },
  { id: 'botanical', label: 'Botanical', hint: 'वनस्पति' },
  { id: 'ornaments', label: 'Ornaments', hint: 'अलंकार' },
  { id: 'stars', label: 'Stars', hint: 'सितारे' },
];

export const FONT_OPTIONS: OptionItem<FontStyleId>[] = [
  { id: 'classic', label: 'Classic', hint: 'क्लासिक' },
  { id: 'elegant', label: 'Elegant', hint: 'नफ़ीस' },
  { id: 'modern', label: 'Modern', hint: 'आधुनिक' },
  { id: 'urdu', label: 'Urdu / Literary', hint: 'अदबी' },
];

export const ALIGN_OPTIONS: OptionItem<AlignId>[] = [
  { id: 'left', label: 'Left', hint: 'बाएँ' },
  { id: 'center', label: 'Center', hint: 'मध्य' },
  { id: 'right', label: 'Right', hint: 'दाएँ' },
];

export const SIZE_OPTIONS: OptionItem<SizeId>[] = [
  { id: 'small', label: 'Small', hint: 'छोटा' },
  { id: 'medium', label: 'Medium', hint: 'मध्यम' },
  { id: 'large', label: 'Large', hint: 'बड़ा' },
];

/** Base poem font size (px on the 1080-wide card) for each size option. */
export const SIZE_PX: Record<SizeId, number> = { small: 40, medium: 50, large: 60 };

/** The poem is never shrunk below this to fit; past it the poem is split over several cards instead. */
export const MIN_FIT_PX = 36;

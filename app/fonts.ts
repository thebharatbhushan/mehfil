/**
 * Self-hosted web fonts (via @fontsource), imported once from the root layout.
 *
 * Why not next/font/google: it downloads from fonts.googleapis.com at dev/build time, which fails
 * on slow or restricted networks (the page then silently falls back to browser-default fonts, which is
 * exactly what made Hindi look different in Chrome vs Firefox). @fontsource ships the font files in
 * node_modules, so there is no network dependency and every browser gets the same glyphs.
 * Each package splits fonts by unicode-range, so a visitor only downloads the scripts used on a page
 * (e.g. the large Nastaliq file loads only when Urdu text is present).
 */
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/lora/400.css';
import '@fontsource/lora/500.css';
import '@fontsource/lora/600.css';
import '@fontsource/lora/700.css';
import '@fontsource/cormorant-garamond/400.css'; // still used by the share-card canvas (lib/shareCard)
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/noto-serif-devanagari/400.css';
import '@fontsource/noto-serif-devanagari/500.css';
import '@fontsource/noto-serif-devanagari/600.css';
import '@fontsource/noto-serif-devanagari/700.css';
import '@fontsource/tiro-devanagari-hindi/400.css';
import '@fontsource/noto-nastaliq-urdu/400.css';
import '@fontsource/noto-nastaliq-urdu/700.css';

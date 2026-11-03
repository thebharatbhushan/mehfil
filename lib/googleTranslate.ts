/**
 * Google Website Translator helper.
 *
 * The page is authored in Hindi (<html lang="hi">). We load Google's free website-translation script only when it is
 * needed (a language was already chosen, or the visitor opens the language menu) and drive it from our own menu,
 * so Google's default widget/banner never shows. The chosen language is kept by Google's own `googtrans` cookie,
 * which means it also persists across pages and visits.
 */

export const SOURCE_LANG = 'hi';

export interface SiteLanguage {
  code: string; // Google language code
  native: string; // name written in that language (never translated)
  english: string;
}

export const LANGUAGES: SiteLanguage[] = [
  { code: 'hi', native: 'हिन्दी', english: 'Hindi (original)' },
  { code: 'en', native: 'English', english: 'English' },
  { code: 'ur', native: 'اردو', english: 'Urdu' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia' },
  { code: 'as', native: 'অসমীয়া', english: 'Assamese' },
  { code: 'ne', native: 'नेपाली', english: 'Nepali' },
  { code: 'sd', native: 'سنڌي', english: 'Sindhi' },
  { code: 'ar', native: 'العربية', english: 'Arabic' },
  { code: 'fa', native: 'فارسی', english: 'Persian' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'de', native: 'Deutsch', english: 'German' },
  { code: 'es', native: 'Español', english: 'Spanish' },
  { code: 'pt', native: 'Português', english: 'Portuguese' },
  { code: 'it', native: 'Italiano', english: 'Italian' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'ja', native: '日本語', english: 'Japanese' },
  { code: 'ko', native: '한국어', english: 'Korean' },
  { code: 'zh-CN', native: '中文（简体）', english: 'Chinese (Simplified)' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'ms', native: 'Bahasa Melayu', english: 'Malay' },
  { code: 'th', native: 'ไทย', english: 'Thai' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'sw', native: 'Kiswahili', english: 'Swahili' },
];

const SCRIPT_ID = 'google-translate-script';
const HOLDER_ID = 'google_translate_element';
const COOKIE = 'googtrans';

type GoogleWindow = Window & {
  google?: { translate?: { TranslateElement: new (opts: Record<string, unknown>, id: string) => unknown } };
  googleTranslateElementInit?: () => void;
};

/** Language currently applied by Google Translate ('hi' = original Hindi). */
export function getCurrentLang(): string {
  if (typeof document === 'undefined') return SOURCE_LANG;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  if (!m) return SOURCE_LANG;
  const parts = decodeURIComponent(m[1]).split('/'); // "/hi/en"
  const target = parts[2];
  return target && LANGUAGES.some((l) => l.code === target) ? target : SOURCE_LANG;
}

function cookieDomains(): string[] {
  const host = window.location.hostname;
  // Google reads the cookie on the host and on the parent domain; localhost / IPs only support the host form.
  return host.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(host) ? ['', host, `.${host}`] : [''];
}

function writeCookie(value: string, expire: boolean) {
  for (const d of cookieDomains()) {
    document.cookie = `${COOKIE}=${value}; path=/${d ? `; domain=${d}` : ''}${expire ? '; expires=Thu, 01 Jan 1970 00:00:00 GMT' : ''}; SameSite=Lax`;
  }
}

/**
 * Google swaps text nodes for <font> wrappers, which makes React's DOM updates throw
 * ("Failed to execute 'removeChild' on 'Node'") after a client-side navigation. These guards are the widely used fix.
 */
let patched = false;
function patchDomForTranslate() {
  if (patched || typeof Node !== 'function' || !Node.prototype) return;
  patched = true;
  const origRemove = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return origRemove.call(this, child) as T;
  };
  const origInsert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) return newNode;
    return origInsert.call(this, newNode, ref) as T;
  } as typeof Node.prototype.insertBefore;
}

let loading: Promise<void> | null = null;

/** Loads Google's translate script once (idempotent). Resolves when the hidden dropdown exists. */
export function ensureGoogleTranslate(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loading) return loading;
  patchDomForTranslate();
  loading = new Promise<void>((resolve) => {
    const w = window as GoogleWindow;
    let holder = document.getElementById(HOLDER_ID);
    if (!holder) {
      holder = document.createElement('div');
      holder.id = HOLDER_ID;
      holder.className = 'notranslate';
      holder.setAttribute('aria-hidden', 'true');
      document.body.appendChild(holder);
    }
    w.googleTranslateElementInit = () => {
      if (w.google?.translate?.TranslateElement) {
        new w.google.translate.TranslateElement(
          {
            pageLanguage: SOURCE_LANG,
            includedLanguages: LANGUAGES.filter((l) => l.code !== SOURCE_LANG).map((l) => l.code).join(','),
            autoDisplay: false,
          },
          HOLDER_ID,
        );
      }
      resolve();
    };
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.async = true;
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.onerror = () => {
        loading = null; // allow a retry (offline, blocked by an extension, ...)
        s.remove();
        resolve();
      };
      document.head.appendChild(s);
    }
  });
  return loading;
}

function findCombo(): HTMLSelectElement | null {
  return document.querySelector<HTMLSelectElement>('select.goog-te-combo');
}

function waitForCombo(timeoutMs = 6000): Promise<HTMLSelectElement | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const el = findCombo();
      if (el && el.options.length > 1) return resolve(el);
      if (Date.now() - start > timeoutMs) return resolve(null);
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

/** Translate the whole page into `code`; 'hi' restores the original Hindi. */
export async function setSiteLanguage(code: string): Promise<void> {
  if (code === SOURCE_LANG) {
    const wasTranslated = getCurrentLang() !== SOURCE_LANG;
    writeCookie('', true);
    if (wasTranslated) window.location.reload(); // simplest reliable way to drop Google's DOM changes
    return;
  }
  writeCookie(`/${SOURCE_LANG}/${code}`, false);
  await ensureGoogleTranslate();
  const combo = await waitForCombo();
  if (combo) {
    combo.value = code;
    combo.dispatchEvent(new Event('change'));
  } else {
    window.location.reload(); // widget unavailable: the cookie is read on the next load
  }
}

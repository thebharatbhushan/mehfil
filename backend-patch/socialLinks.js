// AUTO-GENERATED from lib/socialLinks.ts (CommonJS build for the Express/Mongoose backend).
// Same validation rules as the frontend — drop this file into your backend (e.g. utils/socialLinks.js).
"use strict";
/**
 * Social / website links — single source of truth for the frontend.
 *
 * - Platform list (order = display order)
 * - URL normalisation + validation (http/https only; platform hosts enforced)
 * - Helpers that turn a stored `socialLinks` object into a safe list for rendering
 *
 * Keys follow the existing profile convention (`instagram`, `x`, `website`, `linkedin` already
 * existed on the profile page); `facebook`, `youtube` and `goodreads` are new.
 * Every field is optional. The backend must apply the same rules (see BACKEND_PATCH.md) — this
 * file is defence in depth, never the only line of defence.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SOCIAL_URL_LENGTH = exports.SOCIAL_KEYS = exports.SOCIAL_PLATFORMS = void 0;
exports.validateSocialLink = validateSocialLink;
exports.validateSocialForm = validateSocialForm;
exports.deriveHandle = deriveHandle;
exports.getVisibleSocialLinks = getVisibleSocialLinks;
exports.hasSocialLinks = hasSocialLinks;
exports.toSocialForm = toSocialForm;
exports.SOCIAL_PLATFORMS = [
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username', hosts: ['instagram.com', 'instagr.am'] },
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username', hosts: ['facebook.com', 'fb.com', 'fb.me'] },
    { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/username', hosts: ['x.com', 'twitter.com'] },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@username', hosts: ['youtube.com', 'youtu.be'] },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username', hosts: ['linkedin.com'] },
    { key: 'goodreads', label: 'Goodreads', placeholder: 'https://goodreads.com/username', hosts: ['goodreads.com'] },
    { key: 'website', label: 'Website', placeholder: 'https://example.com', hosts: [] },
];
exports.SOCIAL_KEYS = exports.SOCIAL_PLATFORMS.map((p) => p.key);
exports.MAX_SOCIAL_URL_LENGTH = 300;
const PLATFORM_BY_KEY = new Map(exports.SOCIAL_PLATFORMS.map((p) => [p.key, p]));
function stripSubdomain(host) {
    return host.toLowerCase().replace(/^(www|m|mobile)\./, '');
}
function hostMatches(host, allowed) {
    const bare = stripSubdomain(host);
    return allowed.some((h) => bare === h || bare.endsWith(`.${h}`));
}
/** Rejects localhost / raw IPs / single-label hosts so "Website" must be a real public domain. */
function isPublicHostname(host) {
    if (!host.includes('.'))
        return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host))
        return false; // IPv4
    if (host.includes(':') || host.startsWith('['))
        return false; // IPv6
    if (/\.(local|localhost|internal|test)$/i.test(host))
        return false;
    return /^[a-z0-9.-]+$/i.test(host) || /^[^\s/]+$/u.test(host); // allow IDN
}
/**
 * Normalises and validates one link.
 *  - empty / whitespace            → ok, value ''
 *  - "instagram.com/me"            → "https://instagram.com/me"
 *  - "javascript:…", "data:…", …   → rejected (only http/https allowed)
 */
function validateSocialLink(key, raw) {
    const platform = PLATFORM_BY_KEY.get(key);
    if (!platform)
        return { ok: false, value: '', error: 'अमान्य प्लेटफ़ॉर्म।' };
    if (raw === undefined || raw === null)
        return { ok: true, value: '' };
    if (typeof raw !== 'string')
        return { ok: false, value: '', error: 'अमान्य लिंक।' };
    let input = raw.trim();
    if (!input)
        return { ok: true, value: '' };
    if (input.length > exports.MAX_SOCIAL_URL_LENGTH) {
        return { ok: false, value: '', error: `${platform.label}: लिंक ${exports.MAX_SOCIAL_URL_LENGTH} अक्षरों से छोटा रखें।` };
    }
    // Control characters / whitespace inside a URL are never legitimate.
    if (/[\u0000-\u001f\u007f\s]/.test(input)) {
        return { ok: false, value: '', error: `${platform.label}: लिंक में रिक्त स्थान नहीं होना चाहिए।` };
    }
    // A scheme is anything like "word:" before the first slash. Only http/https may pass.
    const schemeMatch = input.match(/^([a-z][a-z0-9+.-]*):/i);
    if (schemeMatch && !/^https?$/i.test(schemeMatch[1])) {
        // "example.com:8080/x" looks like a scheme to the regex — treat host:port as scheme-less.
        const looksLikeHostPort = /^[a-z0-9.-]+:\d+(\/|$)/i.test(input);
        if (!looksLikeHostPort) {
            return { ok: false, value: '', error: `${platform.label}: केवल http/https लिंक मान्य हैं।` };
        }
    }
    if (input.startsWith('//'))
        input = `https:${input}`;
    if (!/^https?:\/\//i.test(input))
        input = `https://${input}`;
    let url;
    try {
        url = new URL(input);
    }
    catch {
        return { ok: false, value: '', error: `${platform.label}: कृपया सही URL दर्ज करें।` };
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return { ok: false, value: '', error: `${platform.label}: केवल http/https लिंक मान्य हैं।` };
    }
    if (url.username || url.password) {
        return { ok: false, value: '', error: `${platform.label}: लिंक में यूज़रनेम/पासवर्ड नहीं हो सकता।` };
    }
    if (!isPublicHostname(url.hostname)) {
        return { ok: false, value: '', error: `${platform.label}: कृपया सही URL दर्ज करें।` };
    }
    if (platform.hosts.length > 0) {
        if (!hostMatches(url.hostname, platform.hosts)) {
            return { ok: false, value: '', error: `${platform.label}: लिंक ${platform.hosts[0]} का होना चाहिए।` };
        }
        // Profile links are always served over https.
        url.protocol = 'https:';
    }
    const normalised = url.toString();
    if (normalised.length > exports.MAX_SOCIAL_URL_LENGTH) {
        return { ok: false, value: '', error: `${platform.label}: लिंक ${exports.MAX_SOCIAL_URL_LENGTH} अक्षरों से छोटा रखें।` };
    }
    // Drop the trailing slash the URL API adds to bare origins ("https://example.com/").
    return { ok: true, value: url.pathname === '/' && !url.search && !url.hash ? normalised.replace(/\/$/, '') : normalised };
}
/** Validates the whole settings form at once. */
function validateSocialForm(form) {
    const values = {};
    const errors = {};
    for (const platform of exports.SOCIAL_PLATFORMS) {
        const result = validateSocialLink(platform.key, form[platform.key]);
        values[platform.key] = result.value;
        if (!result.ok && result.error)
            errors[platform.key] = result.error;
    }
    return { ok: Object.keys(errors).length === 0, values, errors };
}
function firstPathSegment(url) {
    return url.pathname.split('/').filter(Boolean)[0] || '';
}
/** Human-friendly secondary text: "@username" for social platforms, "example.com" for websites. */
function deriveHandle(key, url) {
    var _a;
    try {
        const u = new URL(url);
        const host = stripSubdomain(u.hostname);
        if (key === 'website') {
            const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
            const shown = `${host}${path}`;
            return shown.length > 40 ? `${shown.slice(0, 37)}…` : shown;
        }
        const parts = u.pathname.split('/').filter(Boolean);
        let name = '';
        if (key === 'linkedin')
            name = ['in', 'company', 'pub'].includes(parts[0]) ? parts[1] || '' : parts[0] || '';
        else if (key === 'youtube')
            name = ((_a = parts[0]) === null || _a === void 0 ? void 0 : _a.startsWith('@')) ? parts[0] : ['c', 'user', 'channel'].includes(parts[0]) ? parts[1] || '' : '';
        else if (key === 'goodreads')
            name = ''; // goodreads profile paths are numeric ids / slugs, not handles
        else
            name = firstPathSegment(u);
        name = decodeURIComponent(name).replace(/^@/, '');
        if (!name || name.length > 30 || /^(profile\.php|people|pages|channel|user|show)$/i.test(name))
            return '';
        return `@${name}`;
    }
    catch {
        return '';
    }
}
/**
 * Turns whatever the API returned into the list that may be rendered: known platforms only,
 * re-validated on the client, empty / invalid / unsafe values dropped silently.
 * (`twitter` is accepted as a legacy alias for `x`.)
 */
function getVisibleSocialLinks(links) {
    var _a;
    if (!links || typeof links !== 'object')
        return [];
    const source = links;
    const out = [];
    for (const platform of exports.SOCIAL_PLATFORMS) {
        const raw = (_a = source[platform.key]) !== null && _a !== void 0 ? _a : (platform.key === 'x' ? source.twitter : undefined);
        const result = validateSocialLink(platform.key, raw);
        if (result.ok && result.value) {
            out.push({ key: platform.key, label: platform.label, url: result.value, handle: deriveHandle(platform.key, result.value) });
        }
    }
    return out;
}
function hasSocialLinks(links) {
    return getVisibleSocialLinks(links).length > 0;
}
/** Form defaults from a user's stored links (twitter alias honoured). */
function toSocialForm(links) {
    var _a;
    const source = (links && typeof links === 'object' ? links : {});
    const form = {};
    for (const platform of exports.SOCIAL_PLATFORMS) {
        const raw = (_a = source[platform.key]) !== null && _a !== void 0 ? _a : (platform.key === 'x' ? source.twitter : undefined);
        form[platform.key] = typeof raw === 'string' ? raw : '';
    }
    return form;
}

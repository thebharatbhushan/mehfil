import type { SocialLinks } from '@/lib/socialLinks';

// Set NEXT_PUBLIC_API_URL=http://localhost:5000 in .env.local to talk to a local backend.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mehfilbackend.onrender.com';
// export const API_BASE_URL = 'http://192.168.0.79:5000';

/** Default profile picture used when a user has not uploaded one. */
export const DEFAULT_AVATAR =
  'https://res.cloudinary.com/djdvpnrnf/image/upload/v1780752284/profilePic_roaig0.png';

export interface Poem {
  _id: string;
  slug: string;
  title: string;
  body: string;
  category?: string;
  tags?: string[];
  author?: {
    _id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    profilePic?: string;
    socialLinks?: SocialLinks;
  };
  createdAt?: string;
}

export interface Writer {
  _id: string;
  username?: string;
  firstName: string;
  lastName?: string;
  profilePic?: string;
  bio?: string;
  city?: string;
  languagePref?: string;
  email?: string;
  createdAt?: string;
  poemsCount?: number;
  /** Optional social / website links (public data; safe to render after validation). */
  socialLinks?: SocialLinks;
}

/** Public profile URL: /u/<username> when known, otherwise the id-based fallback. */
export function authorHref(a: { _id?: string; username?: string } | null | undefined): string {
  if (a?.username) return `/u/${encodeURIComponent(a.username)}`;
  return a?._id ? `/author?id=${encodeURIComponent(a._id)}` : '/author';
}

export const CATEGORIES = [
  { id: 'love', label: 'Love', icon: '❤️' },
  { id: 'sad', label: 'Sad', icon: '🌧' },
  { id: 'motivation', label: 'Motivation', icon: '✨' },
  { id: 'nature', label: 'Nature', icon: '🍃' },
  { id: 'life', label: 'Life', icon: '🌙' },
  { id: 'sufi', label: 'Sufi', icon: '☪' },
  { id: 'shayari', label: 'Shayari', icon: '🖋' },
  { id: 'friendship', label: 'Friendship', icon: '🤝' },
];

export const POEM_CATEGORIES = [
  'Love', 'Sad', 'Motivation', 'Nature', 'Life', 'Sufi', 'Friendship',
];

export const POEM_TAGS = ['रोमांस', 'उदासी', 'प्रेरणा', 'शायरी', 'दर्शन', 'यादें'];

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function getLanguageLabel(lang?: string): string {
  const map: Record<string, string> = {
    hi: 'हिंदी',
    ur: 'उर्दू',
    en: 'English',
    bilingual: 'Bilingual',
  };
  return map[lang || ''] || 'हिंदी';
}

/** Language of a text from its dominant script: Devanagari -> hi, Arabic/Nastaliq -> ur, Latin -> en. */
export function detectScriptLang(text?: string): 'hi' | 'ur' | 'en' {
  const t = text || '';
  const dev = (t.match(/[\u0900-\u097F]/g) || []).length;
  const ar = (t.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
  const lat = (t.match(/[A-Za-z]/g) || []).length;
  if (ar > dev && ar >= lat) return 'ur';
  if (lat > dev && lat > ar) return 'en';
  return 'hi';
}

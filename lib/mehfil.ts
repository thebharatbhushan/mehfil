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

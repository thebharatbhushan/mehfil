/**
 * YouTube helpers. We only ever embed an 11-character video ID that we extracted ourselves,
 * never a user-supplied URL. (The backend validates the same way; this is for instant form feedback.)
 */
const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be',
]);

export function isValidYouTubeId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id);
}

export function extractYouTubeId(input: string): string | null {
  const raw = (input || '').trim();
  if (!raw || raw.length > 300) return null;
  if (ID_RE.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;
  let id: string | null | undefined = null;
  if (host.endsWith('youtu.be')) {
    id = url.pathname.split('/')[1];
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) id = parts[1];
  }
  return id && ID_RE.test(id) ? id : null;
}

export const YOUTUBE_INVALID_MESSAGE = 'Please enter a valid YouTube video link.';

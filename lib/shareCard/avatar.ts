/**
 * Author profile picture for the share card.
 *
 * Canvas can only be exported to PNG if every image drawn on it was fetched with CORS, so the picture is
 * loaded with crossOrigin="anonymous". If the author has no picture, or the host does not allow CORS, the
 * site's default avatar is tried, and finally the renderer draws the author's initial - the card never
 * fails and the exported PNG is never "tainted".
 */
import { DEFAULT_AVATAR } from '@/lib/mehfil';

const cache = new Map<string, HTMLImageElement | null>();
const inflight = new Map<string, Promise<HTMLImageElement | null>>();

const keyOf = (url?: string) => (url && url.trim()) || DEFAULT_AVATAR;

function loadOne(url: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    const done = (ok: boolean) => {
      clearTimeout(timer);
      img.onload = img.onerror = null;
      resolve(ok && img.naturalWidth > 0 ? img : null);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

/** Resolves with the author's picture, else the default avatar, else null. Never rejects. */
export function loadAuthorImage(url?: string, timeoutMs = 6000): Promise<HTMLImageElement | null> {
  const key = keyOf(url);
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    let img = await loadOne(key, timeoutMs);
    if (!img && key !== DEFAULT_AVATAR) img = await loadOne(DEFAULT_AVATAR, timeoutMs);
    cache.set(key, img);
    inflight.delete(key);
    return img;
  })();
  inflight.set(key, p);
  return p;
}

/** Synchronous lookup used by the renderer; null until loadAuthorImage has finished. */
export function getLoadedAuthorImage(url?: string): HTMLImageElement | null {
  return cache.get(keyOf(url)) ?? null;
}

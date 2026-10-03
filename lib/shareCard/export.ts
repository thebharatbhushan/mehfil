import { exportFileName, getPageCount, prepareFonts, renderCardToBlob } from './PoemImageGenerator';
import type { ShareCardOptions, SharePoemData } from './types';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Renders the requested page(s) to PNG files named mehfil-poem-{id}[-n].png */
export async function buildCardFiles(
  poem: SharePoemData,
  options: ShareCardOptions,
  pages: number[] | 'all',
): Promise<File[]> {
  // Fonts first: page count depends on measured text, which must use the real Hindi/Urdu faces.
  await prepareFonts(poem, options);
  const count = getPageCount(poem, options);
  const list = pages === 'all' ? Array.from({ length: count }, (_, i) => i) : pages;
  const files: File[] = [];
  for (const p of list) {
    const blob = await renderCardToBlob(poem, options, p);
    files.push(new File([blob], exportFileName(poem, p, count), { type: 'image/png' }));
  }
  return files;
}

export function downloadFiles(files: File[]) {
  files.forEach((f, i) => setTimeout(() => downloadBlob(f, f.name), i * 350));
}

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'failed';

export function canShareFiles(files: File[]): boolean {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * Shares the image(s) through the native share sheet (Web Share API level 2).
 * Never throws and never fails silently: the caller decides what to tell the user for each outcome.
 */
export async function shareFiles(files: File[], text: string, title: string): Promise<ShareOutcome> {
  if (!canShareFiles(files)) return 'unsupported';
  try {
    await navigator.share({ files, text, title });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

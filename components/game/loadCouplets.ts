import { API_BASE_URL, type Poem } from '@/lib/mehfil';
import { coupletsFromPoems, type Couplet } from '@/lib/game/couplets';

const PAGE_SIZE = 100;
const MAX_PAGES = 4; // newest 400 poems at most; slim rows keep each response small
const TIMEOUT_MS = 8000;

async function fetchPage(page: number, signal: AbortSignal): Promise<{ poems: Poem[]; totalPages: number }> {
  // Same public endpoint (and slim mode) the category pages use. No auth, no personal data.
  const res = await fetch(`${API_BASE_URL}/api/poems?page=${page}&limit=${PAGE_SIZE}&slim=1`, { signal });
  if (!res.ok) throw new Error(`poems api ${res.status}`);
  const data = (await res.json()) as { poems?: Poem[]; totalPages?: number } | Poem[];
  const poems = (Array.isArray(data) ? data : data.poems) || [];
  return { poems, totalPages: Array.isArray(data) ? 1 : data.totalPages || 1 };
}

/** Community couplets from the existing poems API. Any failure (offline, API down, aborted) yields [] so the local fallback takes over. */
export async function loadSiteCouplets(outer: AbortSignal): Promise<Couplet[]> {
  const ctrl = new AbortController();
  const stop = () => ctrl.abort();
  outer.addEventListener('abort', stop);
  const timer = setTimeout(stop, TIMEOUT_MS);
  try {
    const first = await fetchPage(1, ctrl.signal);
    const all = [...first.poems];
    const last = Math.min(first.totalPages, MAX_PAGES);
    if (last > 1) {
      const rest = await Promise.all(Array.from({ length: last - 1 }, (_, i) => fetchPage(i + 2, ctrl.signal).catch(() => ({ poems: [] as Poem[], totalPages: 1 }))));
      rest.forEach((r) => all.push(...r.poems));
    }
    return coupletsFromPoems(all);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
    outer.removeEventListener('abort', stop);
  }
}

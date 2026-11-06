import type { Entry } from '@/lib/game/couplets';

/** Tiny DOM builder for the overlay layer (text always goes through textContent, never innerHTML). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** A sher as a quote card. `blankSecond` hides line 2 (complete-the-sher question). */
export function sherCard(entry: Entry, opts: { blankSecond?: boolean; showSource?: boolean } = {}): HTMLElement {
  const card = h('blockquote', 'sg-sher');
  card.append(h('p', 'sg-sher-line', entry.lines[0]));
  card.append(opts.blankSecond ? h('p', 'sg-sher-line sg-blank', '……………………', { 'aria-label': 'दूसरी पंक्ति छिपी है' }) : h('p', 'sg-sher-line', entry.lines[1]));
  if (!opts.blankSecond && opts.showSource !== false) {
    card.append(h('cite', 'sg-cite', `— ${entry.poet} · ${entry.source}`));
  }
  return card;
}

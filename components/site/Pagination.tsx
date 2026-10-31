import Link from 'next/link';

/**
 * Shared list pagination (poems, poets). Uses the site's existing .pagination-bar / .filter-chip look.
 * Every control is a real <Link> so every page stays crawlable; with `onChange` the click is handled in place
 * (no full navigation) while modified clicks (new tab, etc.) still work normally.
 */

type Item = number | 'gap-left' | 'gap-right';

/** 1 … c-1 c c+1 … N  (all pages when there are 7 or fewer) so the row stays short for any page count. */
export function pageItems(current: number, total: number): Item[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Item[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 3) items.push('gap-left');
  else if (start === 3) items.push(2); // an ellipsis hiding a single page is pointless
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 2) items.push('gap-right');
  else if (end === total - 2) items.push(total - 1);
  items.push(total);
  return items;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  onChange?: (page: number) => void;
  /** Accessible name, e.g. "कविताओं के पृष्ठ". */
  label: string;
}

export function Pagination({ page, totalPages, hrefFor, onChange, label }: PaginationProps) {
  if (totalPages <= 1) return null;

  const handle = (target: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onChange) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onChange(target);
  };

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav aria-label={label}>
      <div className="pagination-bar">
        {prevDisabled ? (
          <span className="filter-chip pagination-nav pagination-disabled" aria-disabled="true">
            <i className="fas fa-chevron-left" aria-hidden="true" /> <span className="pagination-nav-label">पिछला</span>
          </span>
        ) : (
          <Link href={hrefFor(page - 1)} rel="prev" scroll={false} className="filter-chip pagination-nav" aria-label="पिछला पृष्ठ" onClick={handle(page - 1)}>
            <i className="fas fa-chevron-left" aria-hidden="true" /> <span className="pagination-nav-label">पिछला</span>
          </Link>
        )}

        {pageItems(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <Link
              key={item}
              href={hrefFor(item)}
              scroll={false}
              className={`filter-chip ${page === item ? 'active' : ''}`}
              aria-label={`पृष्ठ ${item}`}
              aria-current={page === item ? 'page' : undefined}
              onClick={handle(item)}
            >
              {item}
            </Link>
          ) : (
            <span key={item} className="pagination-ellipsis" aria-hidden="true">…</span>
          ),
        )}

        {nextDisabled ? (
          <span className="filter-chip pagination-nav pagination-disabled" aria-disabled="true">
            <span className="pagination-nav-label">अगला</span> <i className="fas fa-chevron-right" aria-hidden="true" />
          </span>
        ) : (
          <Link href={hrefFor(page + 1)} rel="next" scroll={false} className="filter-chip pagination-nav" aria-label="अगला पृष्ठ" onClick={handle(page + 1)}>
            <span className="pagination-nav-label">अगला</span> <i className="fas fa-chevron-right" aria-hidden="true" />
          </Link>
        )}
      </div>
      <p className="pagination-status" aria-live="polite">पृष्ठ {page} / {totalPages}</p>
    </nav>
  );
}

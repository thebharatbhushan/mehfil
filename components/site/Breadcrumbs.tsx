import Link from 'next/link';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd } from '@/lib/seo';

/** Visible breadcrumb trail + matching BreadcrumbList JSON-LD (single source for both). */
export function Breadcrumbs({ items }: { items: Array<{ name: string; path: string }> }) {
  return (
    <>
      <JsonLd data={breadcrumbLd(items)} />
      <nav aria-label="Breadcrumb" className="mehfil-container" style={{ paddingTop: '1.25rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        <ol style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.45rem', listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((it, i) => {
            const last = i === items.length - 1;
            return (
              <li key={it.path} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {last ? (
                  <span aria-current="page">{it.name}</span>
                ) : (
                  <>
                    <Link href={it.path} style={{ color: 'var(--accent)' }}>{it.name}</Link>
                    <span aria-hidden="true">›</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

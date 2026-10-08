import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeClient } from '@/components/home/HomeClient';
import { SEO_CATEGORIES, categoryHref } from '@/lib/categories';
import { authorPath, fetchAllPoems, fetchFeaturedPoems, fullNameOf, truncate } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const [all, featured] = await Promise.all([fetchAllPoems(), fetchFeaturedPoems()]);

  const latest = [...all].sort((a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0)).slice(0, 6);

  // Most prolific poets (by number of published poems).
  const counts = new Map<string, { name: string; path: string; n: number }>();
  for (const p of all) {
    const path = authorPath(p.author);
    if (!path) continue;
    const e = counts.get(path) || { name: fullNameOf(p.author), path, n: 0 };
    e.n += 1;
    counts.set(path, e);
  }
  const poets = Array.from(counts.values()).sort((a, b) => b.n - a.n).slice(0, 8);

  const link = { color: 'var(--accent)' } as const;
  const h2 = { fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--accent-dark)', margin: '1.8rem 0 0.6rem' } as const;

  return (
    <>
      <HomeClient />
      <section aria-label="मेहफ़िल के बारे में" style={{ padding: '1rem 0 3rem' }}>
        <div className="mehfil-container" style={{ lineHeight: 2 }}>
          <h2 style={{ ...h2, marginTop: 0 }}>हिंदी कविता, शायरी और साहित्य का घर</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            मेहफ़िल हिंदी और उर्दू साहित्य का एक मंच है, जहाँ <Link href="/poems" style={link}>हिंदी कविताएँ</Link>, ग़ज़लें और शायरी पढ़ी, लिखी और साझा की जाती हैं।
            आप <Link href="/category" style={link}>श्रेणी के अनुसार कविताएँ</Link> खोज सकते हैं, <Link href="/poets" style={link}>कवियों और शायरों</Link> से मिल सकते हैं
            और अपनी रचना <Link href="/publish" style={link}>प्रकाशित</Link> कर सकते हैं।
          </p>

          <h2 style={h2}>श्रेणियाँ</h2>
          <p>
            {SEO_CATEGORIES.map((c, i) => (
              <span key={c.slug}>{i > 0 && ' · '}<Link href={categoryHref(c.slug)} style={link}>{c.h1}</Link></span>
            ))}
          </p>

          {latest.length > 0 && (
            <>
              <h2 style={h2}>ताज़ा कविताएँ</h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {latest.map((p) => (
                  <li key={p._id}>
                    <Link href={`/poem/${encodeURIComponent(p.slug)}`} style={link}>{p.title}</Link>
                    {fullNameOf(p.author) && <> — {fullNameOf(p.author)}</>}
                    <span style={{ color: 'var(--text-muted)' }}> · {truncate(p.body, 70)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {featured.length > 0 && (
            <>
              <h2 style={h2}>विशेष रचनाएँ</h2>
              <p>
                {featured.slice(0, 6).map((p, i) => (
                  <span key={p._id}>{i > 0 && ' · '}<Link href={`/poem/${encodeURIComponent(p.slug)}`} style={link}>{p.title}</Link></span>
                ))}
              </p>
            </>
          )}

          {poets.length > 0 && (
            <>
              <h2 style={h2}>रचनाकार</h2>
              <p>
                {poets.map((a, i) => (
                  <span key={a.path}>{i > 0 && ' · '}<Link href={a.path} style={link}>{a.name} की कविताएँ</Link></span>
                ))}
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}

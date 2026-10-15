import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { PoetsClient } from '@/components/poets/PoetsClient';
import type { WriterWithPoems } from '@/components/poets/PoetsClient';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { POETS_PER_PAGE } from '@/lib/categories';
import { fetchAllPoems, fetchAllWriters, parsePage, publicWriter } from '@/lib/seo';

export const revalidate = 3600;

type Props = { searchParams: { page?: string } };

// Page 1 keeps the layout's metadata untouched; later pages get their own title and canonical (same scheme as /poems).
export function generateMetadata({ searchParams }: Props): Metadata {
  const page = parsePage(searchParams?.page);
  if (page <= 1) return {};
  const title = `हिंदी कवि और शायर — रचनाकारों की सूची — पृष्ठ ${page} | Mehfil`;
  return { title: { absolute: title }, alternates: { canonical: `/poets?page=${page}` }, openGraph: { title, url: `/poets?page=${page}` } };
}

// Server wrapper: the poet directory is rendered into the initial HTML from the same public API the client uses.
export default async function PoetsPage({ searchParams }: Props) {
  const [users, poems] = await Promise.all([fetchAllWriters(), fetchAllPoems()]);
  const page = parsePage(searchParams?.page);
  // A page beyond the last one is a real 404 (never a thin empty page). Skipped if the API returned nothing.
  if (users.length > 0 && page > Math.ceil(users.length / POETS_PER_PAGE)) notFound();

  const counts = new Map<string, number>();
  for (const p of poems) {
    const id = p.author?._id;
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }

  const initialWriters: WriterWithPoems[] = users.map((u) => ({
    ...publicWriter(u),
    poemCount: counts.get(u._id) || 0,
    style: (u.languagePref || 'shayari').toLowerCase(),
  }));

  return (
    <>
      <Breadcrumbs items={[{ name: 'होम', path: '/' }, { name: 'रचनाकार', path: '/poets' }]} />
      <PoetsClient initialWriters={initialWriters} initialPage={page} />
    </>
  );
}

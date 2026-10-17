import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { PoetsClient } from '@/components/poets/PoetsClient';
import type { WriterWithPoems } from '@/components/poets/PoetsClient';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { POETS_PER_PAGE } from '@/lib/categories';
import { fetchWritersPage, parsePage, publicWriter } from '@/lib/seo';

export const revalidate = 3600;

type Props = { searchParams: { page?: string } };

// Page 1 keeps the layout's metadata untouched; later pages get their own title and canonical (same scheme as /poems).
export function generateMetadata({ searchParams }: Props): Metadata {
  const page = parsePage(searchParams?.page);
  if (page <= 1) return {};
  const title = `हिंदी कवि और शायर — रचनाकारों की सूची — पृष्ठ ${page} | Mehfil`;
  return { title: { absolute: title }, alternates: { canonical: `/poets?page=${page}` }, openGraph: { title, url: `/poets?page=${page}` } };
}

// Server wrapper: only ONE page of writers (POETS_PER_PAGE) is fetched and rendered into the initial HTML.
export default async function PoetsPage({ searchParams }: Props) {
  const page = parsePage(searchParams?.page);
  const data = await fetchWritersPage(page, POETS_PER_PAGE);
  // A page beyond the last one is a real 404 (never a thin empty page). Skipped if the API returned nothing.
  if (data && data.total > 0 && page > data.totalPages) notFound();

  const initialWriters: WriterWithPoems[] = (data?.writers || []).map((u) => ({
    ...publicWriter(u),
    poemCount: u.poemCount || 0,
    style: (u.style || u.languagePref || 'shayari').toLowerCase(),
  }));

  return (
    <>
      <Breadcrumbs items={[{ name: 'होम', path: '/' }, { name: 'रचनाकार', path: '/poets' }]} />
      <PoetsClient initialWriters={initialWriters} initialPage={page} initialTotal={data?.total ?? initialWriters.length} />
    </>
  );
}

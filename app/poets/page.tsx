import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { PoetsClient } from '@/components/poets/PoetsClient';
import type { WriterWithPoems } from '@/components/poets/PoetsClient';
import { fetchAllPoems, fetchAllWriters, publicWriter } from '@/lib/seo';

export const revalidate = 3600;

// Server wrapper: the poet directory is rendered into the initial HTML from the same public API the client uses.
export default async function PoetsPage() {
  const [users, poems] = await Promise.all([fetchAllWriters(), fetchAllPoems()]);

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
      <PoetsClient initialWriters={initialWriters} />
    </>
  );
}

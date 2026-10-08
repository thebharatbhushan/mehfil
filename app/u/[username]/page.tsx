import { AuthorProfile } from '@/components/author/AuthorProfile';
import { fetchAuthor, publicPoem, publicWriter } from '@/lib/seo';

export const revalidate = 3600;

// Public author profile at /u/<username>.
// Public profile data and poems are fetched on the server (same API call as before) so they are in the
// initial HTML; AuthorProfile keeps all behaviour and refreshes the data silently after mount.
export default async function UserProfilePage({ params }: { params: { username: string } }) {
  let name = String(params?.username || '');
  try { name = decodeURIComponent(name); } catch { /* keep raw */ }
  const ident = name.replace(/^@/, '').toLowerCase();

  const { author } = await fetchAuthor(ident);
  const initial = author ? { author: publicWriter(author.user), poems: author.poems.map(publicPoem) } : null;

  return <AuthorProfile ident={ident} initial={initial} />;
}

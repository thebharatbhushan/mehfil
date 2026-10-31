import { PoemContent } from '@/components/poem/PoemClient';
import { fetchAuthor, fetchPoemBySlug, publicPoem, publicWriter } from '@/lib/seo';

export const revalidate = 3600;

function decodeSlug(slug: string): string {
  try { return decodeURIComponent(slug); } catch { return slug; }
}

// Server wrapper: fetches the poem (and its author's other poems) on the server with the same API calls the
// client component makes, so the full poem text, title, author and links are in the initial HTML.
// The client component keeps all interactivity and silently refreshes the data after mount.
export default async function PoemPage({ params }: { params: { slug: string } }) {
  const slug = decodeSlug(params.slug);
  const { poem } = await fetchPoemBySlug(slug);

  let author: ReturnType<typeof publicWriter> | null = null;
  let authorPoems: ReturnType<typeof publicPoem>[] = [];
  if (poem?.author?._id) {
    const res = await fetchAuthor(poem.author._id);
    if (res.author) {
      author = publicWriter(res.author.user);
      authorPoems = res.author.poems.filter((x) => x._id !== poem._id).map(publicPoem);
    }
  }

  return (
    <PoemContent
      slug={params.slug}
      initialPoem={poem ? publicPoem(poem) : null}
      initialAuthor={author}
      initialAuthorPoems={authorPoems}
    />
  );
}

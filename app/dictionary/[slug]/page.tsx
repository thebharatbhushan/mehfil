import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { JsonLd } from '@/components/site/JsonLd';
import { BackToSearch } from '@/components/dictionary/BackToSearch';
import { DICTIONARY_PATH, fetchWord, wordDescription, wordJsonLd, wordPath, wordTitle, type DictEntry, type DictWord } from '@/lib/dictionary';
import { DEFAULT_OG_IMAGE, fetchAllPoems, fullNameOf, oneLine, truncate } from '@/lib/seo';
import type { Poem } from '@/lib/mehfil';
import '@/components/dictionary/dictionary.css';

// Server-rendered + cached (ISR): crawlers receive the complete entry in the initial HTML.
export const revalidate = 3600;

type Props = { params: { slug: string } };

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decode(params.slug);
  const { word, missing } = await fetchWord(slug);
  const path = wordPath(slug);
  // noindex only when the API definitively says the word does not exist; an unreachable API never de-indexes a valid page.
  if (!word) return { title: 'शब्दकोश', alternates: { canonical: path }, ...(missing ? { robots: { index: false, follow: true } } : {}) };
  const e = word.entry;
  const title = wordTitle(e);
  const description = wordDescription(e);
  const full = `${title} | Mehfil`;
  return {
    title,
    description,
    alternates: { canonical: wordPath(e.slug) }, // one canonical URL per concept, even if reached via an old slug
    openGraph: { title: full, description, url: wordPath(e.slug), type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: full, description, images: [DEFAULT_OG_IMAGE.url] },
  };
}

function WordChips({ words, links }: { words: string[]; links: DictWord['links'] }) {
  return (
    <div className="dict-chips">
      {words.map((w) => {
        const link = links[w];
        return link ? (
          <Link key={w} href={wordPath(link.slug)} className="dict-chip" prefetch={false}>{w}</Link>
        ) : (
          <span key={w} className="dict-chip is-soft">{w}</span>
        );
      })}
    </div>
  );
}

/** Published Mehfil poems that really contain this word (Hindi/Urdu spellings only). Never invented; [] on any failure. */
async function poemsUsing(e: DictEntry): Promise<Array<{ poem: Poem; line: string }>> {
  const needles = [...new Set([e.canonicalWord, ...e.variants.hindi, ...e.variants.urdu].map((s) => s.trim()).filter((s) => [...s].length >= 3))];
  if (!needles.length) return [];
  try {
    const all = await Promise.race([fetchAllPoems(), new Promise<Poem[]>((r) => setTimeout(() => r([]), 3500))]);
    const out: Array<{ poem: Poem; line: string }> = [];
    for (const poem of all) {
      const hit = needles.find((n) => poem.body?.includes(n));
      if (!hit) continue;
      const line = poem.body.split(/\r?\n/).find((l) => l.includes(hit)) || '';
      out.push({ poem, line: truncate(line, 120) });
      if (out.length === 3) break;
    }
    return out;
  } catch {
    return [];
  }
}

export default async function WordPage({ params }: Props) {
  const slug = decode(params.slug);
  const { word, missing } = await fetchWord(slug);
  if (!word && missing) notFound(); // real 404 status, no soft-404
  if (!word) throw new Error('Dictionary API unreachable'); // temporary failure: error boundary, not cached, not a fake 404
  const { entry: e, links } = word;
  const poems = await poemsUsing(e);
  const english = e.englishTranslations;
  const pos = e.partOfSpeech.join(' · ');

  return (
    <>
      <JsonLd data={wordJsonLd(e)} />
      <Breadcrumbs items={[{ name: 'मुखपृष्ठ', path: '/' }, { name: 'शब्दकोश', path: DICTIONARY_PATH }, { name: e.canonicalWord, path: wordPath(e.slug) }]} />
      <main className="dict-page">
        <article className="dict-wrap" lang="hi">
          <BackToSearch />

          <header className="dict-word-hero">
            <div>
              <h1 className="dict-word-title">{e.canonicalWord}</h1>
              {english.length > 0 && (
                <div className="dict-chips" style={{ marginTop: '0.75rem' }}>
                  {english.map((t) => <span key={t.term} lang="en" className="dict-chip is-en">{t.term}{t.note ? ` (${t.note})` : ''}</span>)}
                </div>
              )}
            </div>
            {e.variants.urdu[0] && <div className="dict-word-urdu" lang="ur" dir="rtl">{e.variants.urdu[0]}</div>}
            <div className="dict-word-meta">
              {pos && <span><strong>{pos}</strong></span>}
              {e.pronunciation && <span>उच्चारण: <strong lang="en">{e.pronunciation}</strong></span>}
            </div>
          </header>

          <section className="dict-panel" aria-labelledby="forms">
            <h2 id="forms">वर्तनी <small>Spellings</small></h2>
            <div className="dict-chips">
              {[...new Set([...e.variants.hindi, ...e.variants.aliases.filter((a) => /[ऀ-ॿ]/.test(a))])].map((v) => <span key={`h${v}`} className="dict-chip">{v}</span>)}
              {[...new Set([...e.variants.urdu, ...e.variants.aliases.filter((a) => /[؀-ۿ]/.test(a))])].map((v) => <span key={`u${v}`} className="dict-chip" lang="ur" dir="rtl">{v}</span>)}
              {[...new Set([...e.variants.roman, ...e.variants.aliases.filter((a) => !/[ऀ-ॿ؀-ۿ]/.test(a))])].map((v) => <span key={`r${v}`} className="dict-chip is-roman" lang="en">{v}</span>)}
            </div>
          </section>

          {e.meanings.length > 0 && (
            <section className="dict-panel" aria-labelledby="meanings">
              <h2 id="meanings">अर्थ <small>{e.meanings.length > 1 ? `${e.meanings.length} अर्थ` : 'Meaning'}</small></h2>
              {e.meanings.map((m, i) => (
                <div key={i} className="dict-meaning">
                  <p className="dict-meaning-text">
                    {e.meanings.length > 1 && <span className="dict-meaning-num">{i + 1}</span>}
                    {m.hindi || m.english || m.urdu}
                    {m.partOfSpeech && <span className="dict-pos">{m.partOfSpeech}</span>}
                  </p>
                  {m.hindi && m.urdu && <p className="dict-meaning-sub" lang="ur" dir="rtl">{m.urdu}</p>}
                  {m.hindi && m.english && <p className="dict-meaning-sub" lang="en">{m.english}</p>}
                  {!m.hindi && m.english && m.urdu && <p className="dict-meaning-sub" lang="ur" dir="rtl">{m.urdu}</p>}
                  {m.examples.map((x, j) => (
                    <blockquote key={j} className="dict-example">
                      {x.text}
                      {x.translation && <em lang="en">{x.translation}</em>}
                    </blockquote>
                  ))}
                </div>
              ))}
            </section>
          )}

          {(e.synonyms.length > 0 || e.antonyms.length > 0) && (
            <div className="dict-cols" style={{ marginTop: '1.25rem' }}>
              {e.synonyms.length > 0 && (
                <section className="dict-panel" aria-labelledby="syn"><h2 id="syn">पर्यायवाची <small>Synonyms</small></h2><WordChips words={e.synonyms} links={links} /></section>
              )}
              {e.antonyms.length > 0 && (
                <section className="dict-panel" aria-labelledby="ant"><h2 id="ant">विलोम <small>Antonyms</small></h2><WordChips words={e.antonyms} links={links} /></section>
              )}
            </div>
          )}

          {e.relatedWords.length > 0 && (
            <section className="dict-panel" aria-labelledby="rel">
              <h2 id="rel">संबंधित शब्द <small>Related words</small></h2>
              <WordChips words={e.relatedWords} links={links} />
            </section>
          )}

          {e.etymology && (
            <section className="dict-panel" aria-labelledby="ety"><h2 id="ety">शब्द की उत्पत्ति <small>Origin</small></h2><p className="dict-meaning-sub" style={{ marginTop: 0 }}>{e.etymology}</p></section>
          )}

          {e.literaryExamples.length > 0 && (
            <section className="dict-panel" aria-labelledby="lit">
              <h2 id="lit">साहित्य में प्रयोग <small>Literary use</small></h2>
              {e.literaryExamples.map((x, i) => (
                <blockquote key={i} className="dict-quote" style={i ? { marginTop: '1rem' } : undefined}>
                  {x.text}
                  {(x.author || x.source) && <cite>— {[x.author, x.source].filter(Boolean).join(', ')}</cite>}
                </blockquote>
              ))}
            </section>
          )}

          {poems.length > 0 && (
            <section className="dict-panel" aria-labelledby="poems">
              <h2 id="poems">मेहफ़िल की रचनाओं में <small>In Mehfil poetry</small></h2>
              {poems.map(({ poem, line }) => {
                const by = fullNameOf(poem.author);
                return (
                  <Link key={poem._id} href={`/poem/${encodeURIComponent(poem.slug)}`} className="dict-poem" prefetch={false}>
                    <b>{oneLine(poem.title)}</b>
                    {by && <span>{by}</span>}
                    {line && <q>{line}</q>}
                  </Link>
                );
              })}
            </section>
          )}

          <p className="dict-muted" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link href={DICTIONARY_PATH} className="dict-link">शब्दकोश में और शब्द खोजें</Link>
          </p>
        </article>
      </main>
    </>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { API_BASE_URL, Poem, formatDate } from '@/lib/mehfil';
import { POEMS_LIST_PER_PAGE } from '@/lib/categories';
import { Pagination } from '@/components/site/Pagination';
import { usePageParam } from '@/lib/usePageParam';

const MOODS = ['all', 'love', 'sad', 'motivation', 'nature', 'shayari'];
const MOOD_ICONS: Record<string, string> = {
  Love: '❤️', Sad: '🌧', Motivation: '✨', Nature: '🍃', Life: '🌙', Sufi: '☪', Friendship: '🤝', Shayari: '🖋',
};

export function PoemsClient({ initialPoems = [], initialPage = 1, initialTotal = 0 }: { initialPoems?: Poem[]; initialPage?: number; initialTotal?: number }) {
  // initialPoems = just the current page, rendered on the server so it is present in the first HTML.
  const [poems, setPoems] = useState<Poem[]>(initialPoems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(initialPoems.length === 0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mood, setMood] = useState('all');
  const { page: rawPage, setPage, hrefFor } = usePageParam(initialPage, '/poems');
  const filterBarRef = useRef<HTMLDivElement>(null);
  const perPage = POEMS_LIST_PER_PAGE;
  const wotwRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  // Poem of the week = the newest poem overall; kept separately so it survives paging/filtering.
  const [poemOfTheWeek, setPoemOfTheWeek] = useState<Poem | null>(initialPage === 1 ? initialPoems[0] || null : null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (poemOfTheWeek) return;
    fetch(`${API_BASE_URL}/api/poems?page=1&limit=1`)
      .then((r) => r.json())
      .then((d) => setPoemOfTheWeek((d.poems || [])[0] || null))
      .catch(() => {});
  }, [poemOfTheWeek]);

  // Each page / filter change asks the API for just that page (never the full list).
  useEffect(() => {
    const noFilters = mood === 'all' && !debouncedSearch;
    // The server already rendered the initial page; skip the duplicate request on first mount.
    if (firstLoad.current && noFilters && initialPoems.length > 0 && rawPage === initialPage) {
      firstLoad.current = false;
      return;
    }
    firstLoad.current = false;
    const ctrl = new AbortController();
    const params = new URLSearchParams({ page: String(rawPage), limit: String(perPage) });
    if (mood !== 'all') params.set('category', mood);
    if (debouncedSearch) params.set('q', debouncedSearch);
    setLoading(true);
    fetch(`${API_BASE_URL}/api/poems?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        const list: Poem[] = data.poems || (Array.isArray(data) ? data : []);
        setPoems(list);
        setTotal(typeof data.total === 'number' ? data.total : list.length);
        setLoading(false);
      })
      .catch((e) => { if (e?.name !== 'AbortError') setLoading(false); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPage, mood, debouncedSearch]);

  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    const timer = setTimeout(() => {
      document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
    }, 100);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [loading, debouncedSearch, mood, rawPage]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  // Never show an empty page: a stale/out-of-range page (e.g. after the live list shrank) clamps to the last page.
  const page = Math.min(rawPage, totalPages);
  const pageItems = poems;

  useEffect(() => {
    if (!loading && rawPage > totalPages) setPage(totalPages, { replace: true });
  }, [loading, rawPage, totalPages, setPage]);

  // Any filter change returns to page 1 (and resets ?page= in the URL).
  const resetPage = () => setPage(1, { replace: true });

  const goToPage = (p: number) => {
    setPage(p);
    filterBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="page-header">
        <h1>कविताएँ</h1>
        <p>हिंदी और उर्दू की बेहतरीन रचनाएँ एक ही जगह</p>
      </div>

      <section style={{ paddingTop: 0 }}>
        <div className="mehfil-container">
          {/* Poem of the Week */}
          {!loading && poemOfTheWeek && (
            <div className="potw-section fade-up" ref={wotwRef}>
              <div className="potw-card">
                <div className="potw-shimmer" />
                <div className="potw-decoration potw-decoration-left">❋</div>
                <div className="potw-decoration potw-decoration-right">❀</div>

                <div className="potw-badge">
                  <i className="fas fa-crown" />
                  <span>सप्ताह की रचना</span>
                  <i className="fas fa-crown" />
                </div>

                <div className="potw-content">
                  <div className="potw-meta-row">
                    <span className="potw-category">
                      {MOOD_ICONS[poemOfTheWeek.category || ''] || '❤️'} {poemOfTheWeek.category || 'अन्य'}
                    </span>
                    <span className="potw-date" suppressHydrationWarning>
                      <i className="far fa-calendar-alt" /> {formatDate(poemOfTheWeek.createdAt)}
                    </span>
                  </div>

                  <h2 className="potw-title">{poemOfTheWeek.title}</h2>

                  <div className="potw-author">
                    <div className="potw-author-avatar">
                      {poemOfTheWeek.author?.profilePic ? (
                        <img src={poemOfTheWeek.author.profilePic} alt={`${poemOfTheWeek.author.firstName || ''} ${poemOfTheWeek.author.lastName || ''}`.trim()} width={40} height={40} decoding="async" loading="lazy" />
                      ) : (
                        <span>{(poemOfTheWeek.author?.firstName || 'A').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="potw-author-name">
                      {poemOfTheWeek.author?.firstName || 'अज्ञात'} {poemOfTheWeek.author?.lastName || ''}
                    </span>
                  </div>

                  <div className="potw-body">
                    <i className="fas fa-quote-left potw-quote-icon" />
                    <p>{(poemOfTheWeek.body || '').substring(0, 280)}{(poemOfTheWeek.body || '').length > 280 ? '...' : ''}</p>
                  </div>

                  <div className="potw-actions">
                    <Link href={`/poem/${poemOfTheWeek.slug}`} className="potw-read-btn" aria-label={`${poemOfTheWeek.title} — सम्पूर्ण पढ़ें`}>
                      <i className="fas fa-book-reader" /> सम्पूर्ण पढ़ें
                    </Link>
                    <button
                      className="potw-share-btn"
                      onClick={() => {
                        const url = `${window.location.origin}/poem/${poemOfTheWeek.slug}`;
                        if (navigator.share) {
                          navigator.share({ title: poemOfTheWeek.title, url }).catch(() => {});
                        } else {
                          navigator.clipboard?.writeText(url);
                        }
                      }}
                    >
                      <i className="fas fa-share-alt" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="filter-bar" ref={filterBarRef}>
            <div className="filter-search">
              <i className="fas fa-search" style={{ marginRight: '10px', color: '#b8a092' }} />
              <input
                type="text"
                placeholder="कविता, कवि या शब्द खोजें..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              />
            </div>
            <div className="filter-chips">
              {MOODS.map((m) => (
                <button
                  key={m}
                  className={`filter-chip ${mood === m ? 'active' : ''}`}
                  onClick={() => { setMood(m); resetPage(); }}
                >
                  {m === 'all' ? 'सभी' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loader-wrapper">
              <div className="loader-dots"><span></span><span></span><span></span></div>
              <div className="loader-text">अल्फ़ाज़ आ रहे हैं...</div>
            </div>
          ) : pageItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
              ✨ कोई रचनाएँ नहीं मिलीं।
            </p>
          ) : (
            <div className="poems-list-grid">
              {pageItems.map((poem) => (
                <Link href={`/poem/${poem.slug}`} key={poem._id} className="poem-card fade-up">
                  <div className="poem-card-header">
                    <div className="card-top-icon">{MOOD_ICONS[poem.category || ''] || '❤️'}</div>
                    <span className="mood">{poem.category || 'अन्य'}</span>
                  </div>
                  <h3>{poem.title}</h3>
                  <p>{(poem.body || '').substring(0, 120)}...</p>
                  <div className="poem-footer">
                    <span>By {poem.author?.firstName || 'अज्ञात'}</span>
                    <span>3 min read</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && (
            <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} onChange={goToPage} label="कविताओं के पृष्ठ" />
          )}
        </div>
      </section>
    </>
  );
}

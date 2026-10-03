'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { API_BASE_URL, Poem, formatDate } from '@/lib/mehfil';
import { matchesSearch } from '@/lib/search';

const MOODS = ['all', 'love', 'sad', 'motivation', 'nature', 'shayari'];
const MOOD_ICONS: Record<string, string> = {
  Love: '❤️', Sad: '🌧', Motivation: '✨', Nature: '🍃', Life: '🌙', Sufi: '☪', Friendship: '🤝', Shayari: '🖋',
};

export default function PoemsPage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mood, setMood] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 16;
  const wotwRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/poems`)
      .then((r) => r.json())
      .then((data) => {
        setPoems(data.poems || data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
  }, [loading, search, mood, page]);

  const poemOfTheWeek = useMemo(() => {
    if (!poems.length) return null;
    return poems[0];
  }, [poems]);

  const filtered = useMemo(() => {
    let result = poems;
    if (mood !== 'all') {
      result = result.filter((p) => (p.category || '').toLowerCase() === mood);
    }
    if (search.trim()) {
      result = result.filter(
        (p) =>
          matchesSearch(
            search,
            p.title,
            p.body || '',
            p.author?.firstName || '',
            p.author?.lastName || '',
            `${p.author?.firstName || ''} ${p.author?.lastName || ''}`,
          )
      );
    }
    return result;
  }, [poems, mood, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

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
                    <span className="potw-date">
                      <i className="far fa-calendar-alt" /> {formatDate(poemOfTheWeek.createdAt)}
                    </span>
                  </div>

                  <h2 className="potw-title">{poemOfTheWeek.title}</h2>

                  <div className="potw-author">
                    <div className="potw-author-avatar">
                      {poemOfTheWeek.author?.profilePic ? (
                        <img src={poemOfTheWeek.author.profilePic} alt="" />
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
                    <Link href={`/poem/${poemOfTheWeek.slug}`} className="potw-read-btn">
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

          <div className="filter-bar">
            <div className="filter-search">
              <i className="fas fa-search" style={{ marginRight: '10px', color: '#b8a092' }} />
              <input
                type="text"
                placeholder="कविता, कवि या शब्द खोजें..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="filter-chips">
              {MOODS.map((m) => (
                <button
                  key={m}
                  className={`filter-chip ${mood === m ? 'active' : ''}`}
                  onClick={() => { setMood(m); setPage(1); }}
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

          {totalPages > 1 && (
            <div className="pagination-bar">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`filter-chip ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

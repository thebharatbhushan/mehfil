'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { API_BASE_URL, Poem, Writer, formatDate, authorHref } from '@/lib/mehfil';
import { sharePoemImage } from '@/lib/shareImage';
import { useToast } from '@/components/site/ToastProvider';
import { SharePoemButton } from '@/components/share/SharePoemButton';
import { ReadingToolbar } from '@/components/reading/ReadingToolbar';
import { useReadingPrefs } from '@/hooks/use-reading-prefs';
import { ProfileSocialLinks } from '@/components/social/ProfileSocialLinks';

function PoemContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || searchParams.get('slug') || '';
  const { showToast } = useToast();
  const [poem, setPoem] = useState<Poem | null>(null);
  const [author, setAuthor] = useState<Writer | null>(null);
  const [authorPoems, setAuthorPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const { prefs, update: updatePrefs } = useReadingPrefs();

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE_URL}/api/poems/slug/${slug}`)
      .then((r) => r.json())
      .then(async (data) => {
        const p = data.poem || data;
        setPoem(p);
        if (p.author?._id) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/auth/user/${p.author._id}`);
            const d = await res.json();
            setAuthor(d.user || null);
            setAuthorPoems((d.poems || d.user?.poems || []).filter((x: Poem) => x._id !== p._id));
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

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
  }, [loading, authorPoems]);

  const handleShare = async () => {
    const currentUrl = window.location.href;
    try {
      await sharePoemImage(
        {
          title: poem?.title || 'कविता',
          body: poem?.body || '',
          authorName,
          username: (poem?.author as any)?.username || poem?.author?.firstName,
          profilePic: poem?.author?.profilePic,
        },
        currentUrl,
      );
      showToast('✨ साझा करें तैयार है!');
    } catch {
      navigator.clipboard?.writeText(currentUrl);
      showToast('🔗 लिंक कॉपी हो गया!');
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)' }}>कविता सांस ले रही है... कृपया प्रतीक्षा करें</p>
      </div>
    );
  }

  if (!poem) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(255, 250, 240, 0.8)', borderRadius: '2rem', margin: '2rem auto', maxWidth: '600px' }}>
        <i className="fas fa-leaf" style={{ fontSize: '3.5rem', color: 'var(--accent)', opacity: 0.6, marginBottom: '1rem' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '1rem 0', fontSize: '1.8rem', color: 'var(--accent-dark)' }}>
          😢 कविता नहीं मिली | यह रचना संसार से विदा हो चुकी है
        </h3>
        <Link href="/poems" className="back-link" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          <i className="fas fa-arrow-left" /> वापस कविताओं पर जाएँ
        </Link>
      </div>
    );
  }

  const authorName = poem.author
    ? `${poem.author.firstName || ''} ${poem.author.lastName || ''}`.trim()
    : 'अज्ञात रचनाकार';
  const authorPic =
    poem.author?.profilePic ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=C16A4B&color=fff&rounded=true&size=80`;
  const categoryDisplay = poem.category
    ? poem.category.charAt(0).toUpperCase() + poem.category.slice(1)
    : 'अन्य';

  const bodyLines = (poem.body || '').split(/\r?\n/);

  return (
    <main className="poem-main" style={{ padding: '2rem 0 4rem' }}>
      <div className="mehfil-container">
        <Link href="/poems" className="back-link">
          <i className="fas fa-arrow-left" /> सभी कविताएँ
        </Link>

        {/* Reading customisation: sticky so it stays reachable while scrolling a long poem */}
        <div className="reading-toolbar-wrap">
          <ReadingToolbar prefs={prefs} onChange={updatePrefs} />
        </div>

        {/* Poem Card */}
        <div className="poem-detail-card fade-up" data-reading-theme={prefs.theme} style={{ marginBottom: '3rem' }}>
          <h1 className="poem-title" style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: 'var(--accent-dark)', lineHeight: 1.2, marginBottom: '0.75rem', position: 'relative', zIndex: 2 }}>
            {poem.title || 'बेनाम कविता'}
          </h1>
          <div className="poem-meta" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px dashed var(--border-light)', paddingBottom: '1rem', position: 'relative', zIndex: 2 }}>
            <span className="category-badge" style={{ background: 'var(--accent-soft)', padding: '0.3rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600, color: '#7b3f2a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-feather-alt" /> {categoryDisplay}
            </span>
            <span className="poem-date" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="far fa-calendar-alt" /> {formatDate(poem.createdAt)}
            </span>
          </div>
          <div className="poem-body" data-size={prefs.size} data-align={prefs.align} style={{ position: 'relative', zIndex: 2 }}>
            {bodyLines.map((line, i) =>
              line.trim() === '' ? (
                <div key={i} className="rd-gap" aria-hidden="true" />
              ) : (
                // dir="auto": each line picks its own direction, so mixed Hindi/Urdu/English poems render correctly
                <p key={i} className="rd-line" dir="auto">{line}</p>
              ),
            )}
          </div>
        </div>

        {/* Share Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
          <SharePoemButton
            poem={{
              id: poem._id || poem.slug,
              authorName,
              body: poem.body || '',
              title: poem.title,
              authorImage: poem.author?.profilePic,
              url: typeof window !== 'undefined' ? window.location.href : undefined,
            }}
          />
          <button
            onClick={handleShare}
            style={{
              background: 'rgba(193, 106, 75, 0.1)',
              border: '1px solid var(--accent-soft)',
              padding: '0.7rem 1.6rem',
              borderRadius: '60px',
              fontWeight: 600,
              color: 'var(--accent-dark)',
              cursor: 'pointer',
              transition: '0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.85rem',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(193, 106, 75, 0.1)'; e.currentTarget.style.color = 'var(--accent-dark)'; e.currentTarget.style.borderColor = 'var(--accent-soft)'; }}
          >
            <i className="fas fa-share-alt" /> साझा करें
          </button>
        </div>

        {/* Author Card */}
        {poem.author?._id && (
          <div
            className="author-card card-shell fade-up"
            style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}
          >
            <Link href={authorHref(poem.author)} className="card-overlay-link" aria-label={`${authorName} की प्रोफ़ाइल देखें`} />
            <img
              className="author-avatar"
              src={authorPic}
              alt="author"
              style={{ width: '85px', height: '85px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)', background: '#efe0d2' }}
            />
            <div className="author-info">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginBottom: '0.3rem', color: 'var(--accent-dark)' }}>
                {authorName}
              </h3>
              <div style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-pen-fancy" /> कुल रचनाएँ: {authorPoems.length}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <i className="fas fa-quote-left" /> कलम के सिपाही, शब्दों के संगीतकार
              </div>
              <ProfileSocialLinks socialLinks={author?.socialLinks ?? poem.author?.socialLinks} ownerName={authorName} />
            </div>
          </div>
        )}

        {/* More Poems by Same Writer */}
        {authorPoems.length > 0 && (
          <div className="more-poems fade-up" style={{ marginTop: '2rem' }}>
            <h2 className="author-more-title" style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              marginBottom: '1.8rem',
              borderLeft: '5px solid var(--accent)',
              paddingLeft: '1rem',
              color: 'var(--accent-dark)',
            }}>
              <i className="fas fa-book-open" style={{ color: 'var(--accent)', marginRight: '10px' }} />
              इसी रचनाकार की और कविताएँ
            </h2>
            <div className="more-poems-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.8rem',
            }}>
              {authorPoems.map((p) => (
                <Link
                  href={`/poem/${p.slug}`}
                  key={p._id}
                  className="poem-mini-card fade-up"
                  style={{
                    background: 'white',
                    borderRadius: '1.5rem',
                    padding: '1.5rem',
                    transition: '0.25s',
                    border: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    display: 'block',
                    textDecoration: 'none',
                  }}
                >
                  <h4 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.35rem',
                    marginBottom: '0.5rem',
                    color: 'var(--accent-dark)',
                  }}>
                    {p.title || 'अनामिका'}
                  </h4>
                  <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--accent)',
                    textTransform: 'capitalize',
                    marginBottom: '0.6rem',
                    display: 'inline-block',
                    background: '#f5e6dd',
                    padding: '0.2rem 0.8rem',
                    borderRadius: '40px',
                  }}>
                    <i className="fas fa-tag" /> {p.category || 'कविता'}
                  </span>
                  <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}>
                    {(p.body || '').substring(0, 90)}...
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PoemPage() {
  return (
    <Suspense fallback={
      <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)' }}>कविता सांस ले रही है... कृपया प्रतीक्षा करें</p>
      </div>
    }>
      <PoemContent />
    </Suspense>
  );
}

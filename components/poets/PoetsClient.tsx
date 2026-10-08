'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { API_BASE_URL, Writer, authorHref } from '@/lib/mehfil';

import { matchesSearch } from '@/lib/search';
import { ProfileSocialLinks } from '@/components/social/ProfileSocialLinks';

const STYLE_FILTERS = [
  { key: 'all', label: 'सभी रचनाकार' },
  { key: 'ghazal', label: '🎵 ग़ज़ल' },
  { key: 'shayari', label: '🖋 शायरी' },
  { key: 'modern', label: '✨ आधुनिक कविता' },
  { key: 'sufi', label: '☪ सूफ़ी कलाम' },
];

const STYLE_LABELS: Record<string, string> = {
  ghazal: 'ग़ज़ल',
  shayari: 'शायरी',
  modern: 'आधुनिक कविता',
  sufi: 'सूफ़ी कलाम',
};

export interface WriterWithPoems extends Writer {
  poemCount?: number;
  style?: string;
}

function PoetsLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      width: '100%',
    }}>
      <div style={{
        textAlign: 'center',
        background: 'rgba(255, 253, 248, 0.9)',
        backdropFilter: 'blur(8px)',
        padding: '3rem 3.5rem',
        borderRadius: '3rem',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 22, height: 22, background: '#e0a87c', borderRadius: '50%', animation: 'inkFlowPoets 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
          <div style={{ width: 22, height: 22, background: 'var(--accent)', borderRadius: '50%', animation: 'inkFlowPoets 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
          <div style={{ width: 22, height: 22, background: 'var(--accent-dark)', borderRadius: '50%', animation: 'inkFlowPoets 1.4s infinite ease-in-out both' }} />
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.4rem',
          letterSpacing: '1px',
          background: 'linear-gradient(120deg, #c16a4b, #e4a482)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          fontWeight: 700,
          marginBottom: 12,
        }}>
          साहित्यिक आत्माओं का संसार खुल रहा है...
        </div>
        <div style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <i className="fas fa-feather-alt" style={{ animation: 'featherSwayPoets 1.8s infinite' }} />
          रचनाकार सज रहे हैं
          <i className="fas fa-spinner fa-pulse" />
        </div>
      </div>
    </div>
  );
}

export function PoetsClient({ initialWriters = [] }: { initialWriters?: WriterWithPoems[] }) {
  // initialWriters come from the server render so the poet directory is present in the first HTML;
  // the effect below still refreshes (and enriches) the list exactly as before.
  const [writers, setWriters] = useState<WriterWithPoems[]>(initialWriters);
  const [loading, setLoading] = useState(initialWriters.length === 0);
  const [search, setSearch] = useState('');
  const [style, setStyle] = useState('all');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/users`)
      .then((r) => r.json())
      .then(async (data) => {
        const users: Writer[] = data.users || [];
        const enriched = await Promise.all(
          users.map(async (u) => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/auth/user/${u._id}`);
              const d = await res.json();
              const poemCount = (d.poems || []).length;
              const styleVal = (u.languagePref || 'shayari').toLowerCase();
              // The public profile lookup is the source of truth for socialLinks (same data as the author page).
              const socialLinks = d.user?.socialLinks ?? u.socialLinks;
              return { ...u, socialLinks, poemCount, style: styleVal } as WriterWithPoems;
            } catch {
              return { ...u, poemCount: 0, style: (u.languagePref || 'shayari').toLowerCase() } as WriterWithPoems;
            }
          })
        );
        setWriters(enriched);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fade-up observer — only runs after content is loaded
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
  }, [loading, writers, search, style]);

  const filtered = useMemo(() => {
    let result = writers;
    if (style !== 'all') {
      result = result.filter((w) => w.style === style);
    }
    if (search.trim()) {
      result = result.filter((w) =>
        matchesSearch(
          search.trim().replace(/^@/, ''),
          w.username || '',
          `${w.firstName} ${w.lastName || ''}`,
          w.firstName,
          w.lastName || '',
          w.city || '',
          w.bio || '',
        )
      );
    }
    return result;
  }, [writers, style, search]);

  if (loading) {
    return (
      <main className="mehfil-container" style={{ padding: '2rem 0 4rem' }}>
        <PoetsLoader />
      </main>
    );
  }

  return (
    <main className="mehfil-container" style={{ padding: '2rem 0 4rem' }}>
      {/* Page Header */}
      <div className="page-header fade-up" style={{ textAlign: 'center', padding: '2.5rem 0 1.5rem' }}>
        <h1 style={{ fontSize: '3.8rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-dark)' }}>
          रचनाकार
        </h1>
        <div style={{ width: 80, height: 3, background: 'var(--accent)', margin: '0.8rem auto', borderRadius: 10 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>
          हिंदी और उर्दू साहित्य के वो चिराग़ जिनके अल्फ़ाज़ दिलों को रोशनी देते हैं
        </p>
      </div>

      {/* Featured Poet */}
      <div className="featured-poet fade-up" style={{
        background: 'linear-gradient(135deg, #fff8f0, #fff0e5)',
        borderRadius: '2rem',
        padding: '2rem',
        margin: '2rem 0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '2rem',
        border: '1px solid var(--border-light)',
      }}>
        <div style={{
          width: 140, height: 140,
          background: 'linear-gradient(135deg, #d6a98a, #bc7a58)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '3.5rem', color: 'white', flexShrink: 0,
        }}>
          <i className="fas fa-crown" />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'inline-block', background: 'var(--accent)', color: 'white', padding: '0.3rem 1rem', borderRadius: 50, fontSize: '0.7rem', marginBottom: '0.8rem' }}>
            <i className="fas fa-star" /> गुरुवार का विशेष रचनाकार
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--accent-dark)' }}>
            मन्नत काज़मी
          </h2>
          <p style={{ color: 'var(--accent)', margin: '0.3rem 0' }}>
            उर्दू शायरी &amp; ग़ज़ल विशेषज्ञ | 15+ वर्ष का सफर
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '1.5rem', margin: '0.5rem 0', fontSize: '0.8rem', color: 'var(--accent)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i className="fas fa-heart" /> 28.4K प्रशंसक</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i className="fas fa-book" /> 245 रचनाएँ</span>
          </div>
          <div style={{ fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-dark)', borderLeft: '3px solid var(--accent)', paddingLeft: '1rem', marginTop: '1rem' }}>
            &ldquo;शब्द वह दरिया हैं जिनमें तैरना सीख लिया तो साहित्य की गहराईयाँ अपने आप मिल जाती हैं।&rdquo;
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar fade-up" style={{
        background: 'white',
        borderRadius: 60,
        padding: '0.8rem 1.2rem',
        margin: '1.5rem 0 2rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-light)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {STYLE_FILTERS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStyle(s.key)}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: 50,
                background: style === s.key ? 'var(--accent)' : '#fef9f2',
                color: style === s.key ? 'white' : 'inherit',
                border: '1px solid ' + (style === s.key ? 'var(--accent)' : 'var(--border-light)'),
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fef9f2', padding: '0.4rem 1.2rem', borderRadius: 50, border: '1px solid var(--border-light)' }}>
          <i className="fas fa-search" style={{ color: 'var(--accent)' }} />
          <input
            type="text"
            placeholder="नाम, @यूज़रनेम या शहर खोजें..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: 180, fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Writers Count */}
      <div className="fade-up" style={{ margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        🌟 {filtered.length} प्रतिष्ठित रचनाकार मिले
      </div>

      {/* Writers Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          😢 कोई रचनाकार नहीं मिला...
        </div>
      ) : (
        <div className="poets-grid">
          {filtered.map((writer) => (
            <div
              key={writer._id}
              className="writer-card-premium poet-card card-shell fade-up"
              style={{
                background: 'white',
                borderRadius: '2rem',
                padding: 'clamp(1rem, 2.5vw, 2rem)',
                textAlign: 'center',
                transition: 'all 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.2)',
                border: '1px solid var(--border-light)',
                position: 'relative',
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
            >
              <Link
                href={authorHref(writer)}
                className="card-overlay-link"
                aria-label={`${writer.firstName} ${writer.lastName || ''} की प्रोफ़ाइल देखें`}
              />
              <div className="poet-card-avatar" style={{
                width: 'clamp(78px, 10vw, 120px)', height: 'clamp(78px, 10vw, 120px)',
                margin: '0 auto clamp(0.7rem, 1.5vw, 1.2rem)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'white',
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #dfbda9, #c78d72)',
                boxShadow: '0 15px 25px -8px rgba(0,0,0,0.1)',
              }}>
                {writer.profilePic ? (
                  <img src={writer.profilePic} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt={`कवि ${`${writer.firstName} ${writer.lastName || ''}`.trim()} की प्रोफ़ाइल तस्वीर`} loading="lazy" width={120} height={120} decoding="async" />
                ) : (
                  <i className="fas fa-feather-alt" />
                )}
              </div>
              <div className="poet-card-info">
                <div className="poet-card-style-badge" style={{ display: 'inline-block', background: '#e8c8ba', color: 'var(--accent-dark)', borderRadius: 30, padding: '0.2rem 0.8rem', fontSize: '0.65rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  🎭 {STYLE_LABELS[writer.style || 'shayari'] || 'शायरी'}
                </div>
                <h3 className="poet-card-name" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.6rem)', fontFamily: 'var(--font-display)', margin: '0.5rem 0', color: 'var(--accent-dark)' }}>
                  {writer.firstName} {writer.lastName || ''}
                </h3>
                <p className="poet-card-bio" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0', lineHeight: 1.5 }}>
                  {(writer.bio || 'शब्दों का मुसाफ़िर, एहसासों का हमसफ़र।').substring(0, 85)}
                </p>
                <div className="poet-card-stats" style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', margin: '1rem 0', fontSize: '0.8rem', color: 'var(--accent)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="fas fa-book-open" /> {writer.poemCount || 0} रचनाएँ
                  </span>
                </div>
              </div>
              <ProfileSocialLinks socialLinks={writer.socialLinks} ownerName={`${writer.firstName} ${writer.lastName || ''}`.trim()} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

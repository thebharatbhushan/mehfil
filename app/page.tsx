'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, DEFAULT_AVATAR, Poem, Writer } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';
import { SherOfTheDay } from '@/components/home/SherOfTheDay';
import { LafzOfTheDay } from '@/components/home/LafzOfTheDay';

const MOOD_ICONS: Record<string, string> = {
  Love: '❤️', Sad: '🌧', Motivation: '✨', Nature: '🍃', Life: '🌙', Sufi: '☪', Shayari: '🖋', Friendship: '🤝',
};

const CATEGORIES = [
  { icon: '❤️', label: 'Love' },
  { icon: '🌧', label: 'Sad' },
  { icon: '✨', label: 'Motivation' },
  { icon: '🍃', label: 'Nature' },
  { icon: '🌙', label: 'Life' },
  { icon: '☪', label: 'Sufi' },
  { icon: '🖋', label: 'Shayari' },
  { icon: '🤝', label: 'Friendship' },
];

export default function Home() {
  const router = useRouter();
  const { showToast } = useToast();
  const [poems, setPoems] = useState<Poem[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [loadingPoems, setLoadingPoems] = useState(true);
  const [loadingWriters, setLoadingWriters] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fade-up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' },
    );
    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [poems, writers]);

  // Load featured poems
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/poems/featured`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.poems) setPoems(data.poems);
        setLoadingPoems(false);
      })
      .catch(() => setLoadingPoems(false));
  }, []);

  // Load featured writers
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/featured-writers`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.writers) setWriters(data.writers);
        setLoadingWriters(false);
      })
      .catch(() => setLoadingWriters(false));
  }, []);

  // Auto-slider for featured poems
  useEffect(() => {
    if (loadingPoems || poems.length === 0) return;
    const startTimer = setTimeout(() => {
      const slider = sliderRef.current;
      if (!slider) return;

      const start = () => {
        autoScrollRef.current = setInterval(() => {
          slider.scrollBy({ left: 340, behavior: 'smooth' });
          const maxScroll = slider.scrollWidth - slider.clientWidth;
          if (slider.scrollLeft >= maxScroll - 20) {
            setTimeout(() => slider.scrollTo({ left: 0, behavior: 'smooth' }), 500);
          }
        }, 1800);
      };
      const stop = () => {
        if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      };

      start();
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', start);
      slider.addEventListener('touchstart', stop);
      slider.addEventListener('touchend', start);

      return () => {
        stop();
        slider.removeEventListener('mouseenter', stop);
        slider.removeEventListener('mouseleave', start);
        slider.removeEventListener('touchstart', stop);
        slider.removeEventListener('touchend', start);
      };
    }, 2000);

    return () => clearTimeout(startTimer);
  }, [loadingPoems, poems.length]);

  const getCurrentUser = () => {
    const user = localStorage.getItem('mehfil_user') || sessionStorage.getItem('mehfil_user');
    if (user) {
      try { return JSON.parse(user); } catch { return null; }
    }
    return null;
  };

  const handlePublish = () => {
    const user = getCurrentUser();
    if (!user) {
      showToast('✍️ कृपया पहले प्रवेश करें या पंजीकरण करें।', true);
      setTimeout(() => router.push('/login'), 1200);
      return;
    }
    router.push('/publish');
  };

  const handleExplore = () => {
    if (!getCurrentUser()) {
      showToast('✍️ कृपया पहले प्रवेश करें।', true);
      setTimeout(() => router.push('/login'), 1200);
      return;
    }
    router.push('/poems');
  };

  const handleCategoryClick = (label: string) => {
    showToast(`✨ Explore ${label} poetry!`);
  };

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="mehfil-container hero-grid">
          <div>
            <h1>
              जहाँ अल्फ़ाज़ <br />
              <span className="hero-highlight">एहसास बनते हैं</span>...
            </h1>
            <p>
              A premium Hindi &amp; Urdu poetry sanctuary where unspoken silence
              flows into verses. Discover soulful poems, meet authentic voices,
              and let your emotions bloom.
            </p>
            <div className="hero-divider"><span></span>❦<span></span></div>
            <div className="hero-search">
              <i className="fas fa-search" style={{ marginRight: '12px', color: '#b8a092' }} />
              <input type="text" placeholder="कविता, कवि, विषय या शब्द खोजें..." />
            </div>
            <div className="hero-buttons">
              <button className="primary-btn" onClick={handleExplore}>
                <i className="fas fa-book-open" /> Explore Poetry
              </button>
              <button className="secondary-btn" onClick={handlePublish}>
                <i className="fas fa-feather" /> Publish Poem
              </button>
            </div>
          </div>
          <div className="hero-cards">
            <div className="float-card">
              <div className="card-icon">❤️</div>
              <h3>मोहब्बत</h3>
              <p>&ldquo;तुम्हें पढ़ना किसी पुरानी किताब की तरह है, हर दफ़ा नया एहसास मिलता है...&rdquo;</p>
            </div>
            <div className="float-card">
              <div className="card-icon">🌙</div>
              <h3>तन्हाई</h3>
              <p>&ldquo;रात की ख़ामोशी में कुछ अधूरे ख़्वाब अब भी जागते हैं...&rdquo;</p>
            </div>
            <div className="float-card">
              <div className="card-icon">🪶</div>
              <h3>सफ़र</h3>
              <p>&ldquo;कुछ रास्ते मंज़िल से ज़्यादा ख़ुद से मिलाते हैं...&rdquo;</p>
            </div>
          </div>
        </div>
      </section>

      {/* आज का शेर + आज का लफ़्ज़ */}
      <section className="daily-section">
        <div className="mehfil-container daily-grid">
          <SherOfTheDay poems={poems} ready={!loadingPoems} />
          <LafzOfTheDay />
        </div>
      </section>

      {/* विशेष रचनाएँ */}
      <section>
        <div className="mehfil-container">
          <div className="featured-header">
            <div>
              <div className="featured-badge">
                <i className="fas fa-feather-alt" /> आज की चयनित रचनाएँ
              </div>
              <h2 className="featured-title">विशेष रचनाएँ</h2>
              <div className="featured-divider"><span></span>❦<span></span></div>
              <p className="featured-desc">
                हिंदी साहित्य प्रेमियों द्वारा सबसे अधिक पढ़ी गई और सराही गई रचनाएँ।
              </p>
            </div>
            <div className="featured-poem">
              शब्दों से ही तो है पहचान हमारी,<br />
              जो दिल से निकले वही रचना हमारी...
            </div>
          </div>

          <div className="poem-grid" ref={sliderRef}>
            {loadingPoems ? (
              <div className="loader-wrapper">
                <div className="loader-dots"><span></span><span></span><span></span></div>
                <div className="loader-text">अल्फ़ाज़ आ रहे हैं...</div>
              </div>
            ) : poems.length === 0 ? (
              <p style={{ textAlign: 'center', width: '100%', color: 'var(--text-muted)', padding: '2rem' }}>
                ✨ कोई रचनाएँ नहीं मिलीं।
              </p>
            ) : (
              poems.map((poem) => (
                <Link href={`/poem/${poem.slug}`} key={poem._id} className="poem-card fade-up" style={{ cursor: 'pointer' }}>
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
              ))
            )}
          </div>
        </div>
      </section>

      {/* Writer of the Week */}
      <section>
        <div className="mehfil-container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <div className="featured-badge" style={{ margin: 'auto auto 20px' }}>
              <i className="fas fa-crown" /> इस सप्ताह के साहित्यकार
            </div>
            <h2 className="section-title">सप्ताह के रचनाकार</h2>
            <p className="section-subtitle" style={{ maxWidth: '700px', margin: '20px auto 0', border: 'none', padding: 0 }}>
              हर हफ़्ते एक चुनी हुई कलम जिसके अल्फ़ाज़ ने दिलों पर गहरी छाप छोड़ी।
            </p>
          </div>

          {loadingWriters ? (
            <div className="loader-wrapper">
              <div className="loader-dots"><span></span><span></span><span></span></div>
              <div className="loader-text">सप्ताह के रचनाकार आ रहे हैं...</div>
            </div>
          ) : writers.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              ✨ अभी तक कोई सप्ताह के रचनाकार नहीं चुने गए।
            </p>
          ) : (
            <Link
              href={`/author?id=${writers[0]._id}`}
              className="wotw-card fade-up"
              style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            >
              <div className="wotw-image-side">
                {writers[0].profilePic ? (
                  <img src={writers[0].profilePic} alt={`${writers[0].firstName} ${writers[0].lastName || ''}`} />
                ) : (
                  <div className="wotw-image-placeholder">
                    <i className="fas fa-feather-alt" />
                  </div>
                )}
                <div className="wotw-crown-badge">
                  <i className="fas fa-crown" />
                </div>
              </div>
              <div className="wotw-content-side">
                <div className="wotw-award-label">
                  <i className="fas fa-award" /> सप्ताह का सम्मान
                </div>
                <h3 className="wotw-name">
                  {writers[0].firstName} {writers[0].lastName || ''}
                </h3>
                <div className="wotw-divider"><span></span>❦<span></span></div>
                <p className="wotw-bio">
                  {writers[0].bio || 'शब्दों का मुसाफ़िर, एहसासों का हमसफ़र। इनकी कलम में वो जादू है जो हर दिल को छू जाता है।'}
                </p>
                <div className="wotw-stats">
                  <div className="wotw-stat">
                    <i className="fas fa-book-open" />
                    <span>{writers[0].poemsCount || 0} रचनाएँ</span>
                  </div>
                  {writers[0].city && (
                    <div className="wotw-stat">
                      <i className="fas fa-map-marker-alt" />
                      <span>{writers[0].city}</span>
                    </div>
                  )}
                </div>
                <div className="wotw-cta">
                  <i className="fas fa-user-circle" /> इनकी प्रोफ़ाइल पढ़ें
                  <i className="fas fa-arrow-right" style={{ fontSize: '0.85rem' }} />
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Writers */}
      <section className="writers-section">
        <div className="mehfil-container">
          <div className="writers-head">
            <div className="featured-badge">
              <i className="fas fa-crown" /> साहित्य के चमकते सितारे
            </div>
            <h2 className="section-title writers-title">लोकप्रिय रचनाकार</h2>
            <div className="writers-orn" aria-hidden="true"><span /><i className="fas fa-feather-alt" /><span /></div>
            <p className="writers-lead">
              हज़ारों पाठकों द्वारा पसंद किए गए रचनाकार जिनके अल्फ़ाज़ दिलों को छू जाते हैं।
            </p>
          </div>

          <div className="writers-row">
            {loadingWriters ? (
              <div className="loader-wrapper">
                <div className="loader-dots"><span></span><span></span><span></span></div>
                <div className="loader-text">रचनाकार आ रहे हैं...</div>
              </div>
            ) : writers.length === 0 ? (
              <p style={{ textAlign: 'center', width: '100%', color: 'var(--text-muted)', padding: '2rem' }}>
                ✨ कोई रचनाकार नहीं मिले।
              </p>
            ) : (
              writers.map((writer) => {
                const fullName = `${writer.firstName || ''} ${writer.lastName || ''}`.trim() || 'मेहफ़िल रचनाकार';
                return (
                  <Link href={`/author?id=${writer._id}`} key={writer._id} className="writer-card fade-up">
                    <div className="writer-img">
                      <img
                        src={writer.profilePic || DEFAULT_AVATAR}
                        alt={fullName}
                        loading="lazy"
                        onError={(e) => {
                          if (e.currentTarget.src !== DEFAULT_AVATAR) e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                    </div>
                    <h3 className="writer-name">{fullName}</h3>
                    <p className="writer-handle">
                      {writer.username ? `@${writer.username}` : 'मेहफ़िल के रचनाकार'}
                    </p>
                    {typeof writer.poemsCount === 'number' && writer.poemsCount > 0 && (
                      <p className="writer-meta">
                        <i className="fas fa-book-open" aria-hidden="true" /> {writer.poemsCount} रचनाएँ
                      </p>
                    )}
                    <span className="follow-btn">प्रोफ़ाइल देखें</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="mehfil-container">
          <h2 className="section-title">भावनाएँ</h2>
          <p className="section-subtitle">Read poetry by emotion, feeling, and artistic expression.</p>
          <div className="categories">
            {CATEGORIES.map((cat) => (
              <div key={cat.label} className="category" onClick={() => handleCategoryClick(cat.label)}>
                {cat.icon} {cat.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Immersive Poem Reading */}
      <section>
        <div className="mehfil-container">
          <div className="reading-layout fade-up">
            <div className="featured-reading-card">
              <div className="poem-side">
                <div className="poem-badge">
                  <i className="fas fa-feather-alt" /> चयनित रचना
                </div>
                <h2 className="poem-title">एक अधूरी शाम</h2>
                <div className="poem-line"></div>
                <div className="poet">
                  <i className="far fa-user" /> Written by Ayaan &nbsp; | &nbsp;
                  <i className="far fa-calendar" /> 12 May 2026
                </div>
                <div className="poem-text">
                  तुम्हारी आवाज़ अब भी<br />
                  मेरे कमरे की दीवारों में रहती है...<br /><br />
                  कुछ बातें थीं जो कभी पूरी नहीं हुईं,<br />
                  कुछ शामें थीं जो आज भी अधूरी हैं...<br /><br />
                  और हाँ, हर रात उन्हीं अल्फ़ाज़ों में तुम्हें ढूँढ लेता हूँ...
                </div>
                <div className="poem-actions">
                  <div className="action"><i className="far fa-heart" /> Like</div>
                  <div className="action"><i className="far fa-comment-dots" /> Comment</div>
                  <div className="action"><i className="far fa-bookmark" /> Save</div>
                  <div className="action"><i className="fas fa-share-alt" /> Share</div>
                </div>
              </div>
              <div className="visual-side">
                <img
                  src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop"
                  alt="Poetry Evening"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mehfil-container">
          <div className="cta fade-up">
            <h2 style={{ fontSize: '3rem', fontFamily: 'var(--font-display)' }}>
              अपनी रचनाओं को <br />
              दुनिया तक पहुँचाइए
            </h2>
            <p style={{ margin: '1.2rem 0' }}>
              Join thousands of writers and poetry lovers sharing emotions,
              stories, and timeless words through beautiful literature.
            </p>
            <button className="primary-btn" onClick={handlePublish} style={{ background: '#9e4f36' }}>
              <i className="fas fa-palette" /> लेखन प्रारम्भ करें Today
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

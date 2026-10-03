'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL, DEFAULT_AVATAR, Writer, Poem, formatDate } from '@/lib/mehfil';
import { fetchOwnProfile, getCurrentUserId, getToken, resolveCurrentUserId, updateStoredUser } from '@/lib/auth';
import { useToast } from '@/components/site/ToastProvider';

function getLanguageLabel(langPref?: string): string {
  if (!langPref) return 'हिंदी / उर्दू';
  const langs: Record<string, string> = {
    hindi: 'हिंदी',
    urdu: 'उर्दू',
    english: 'अंग्रेज़ी',
    bilingual: 'द्विभाषी',
  };
  return langs[langPref.toLowerCase()] || langPref;
}


function AuthorLoader() {
  return (
    <main className="mehfil-container ap-page">
      <div className="ap-loader">
        <div className="ap-loader-card">
          <div className="ap-loader-dots" aria-hidden="true"><span /><span /><span /></div>
          <div className="ap-loader-title">रचनाकार की दुनिया में आपका स्वागत है...</div>
          <div className="ap-loader-sub">
            <i className="fas fa-feather-alt" aria-hidden="true" /> कृपया प्रतीक्षा करें
          </div>
        </div>
      </div>
    </main>
  );
}

function excerpt(body: string | undefined, max: number): string {
  const text = (body || '').trim();
  return text.length > max ? `${text.substring(0, max)}...` : text;
}

function AuthorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authorId = searchParams.get('id');
  const { showToast } = useToast();
  const [author, setAuthor] = useState<Writer | null>(null);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  // Who is looking at this page? (Used to recognise the user's own profile.)
  useEffect(() => {
    const read = () => setViewerId(getCurrentUserId());
    read();
    window.addEventListener('storage', read);
    window.addEventListener('mehfil-auth-change', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('mehfil-auth-change', read);
    };
  }, []);

  // "My Profile" without an explicit id: work out who the logged-in user is and open that profile.
  // (Previously this case returned early and the loader spun forever.)
  useEffect(() => {
    if (authorId) return;
    const controller = new AbortController();
    setLoading(true);
    resolveCurrentUserId(controller.signal).then((id) => {
      if (controller.signal.aborted) return;
      if (id) router.replace(`/author?id=${encodeURIComponent(id)}`);
      else router.replace('/login');
    });
    return () => controller.abort();
  }, [authorId, router]);

  useEffect(() => {
    if (!authorId) return;
    const controller = new AbortController();
    // Reset so navigating between two profiles never shows the previous author's data.
    setLoading(true);
    setAuthor(null);
    setPoems([]);
    setSearch('');

    (async () => {
      let user: Writer | null = null;
      let list: Poem[] = [];
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/user/${encodeURIComponent(authorId)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          user = data.user || null;
          list = data.poems || data.user?.poems || [];
        }
      } catch {
        /* handled by the fallback below */
      }

      // The public lookup failed or returned nothing: if this is the logged-in user's own id,
      // fall back to the token-authenticated profile endpoint instead of showing "not found".
      if (!user && getToken() && authorId === getCurrentUserId()) {
        const own = await fetchOwnProfile(controller.signal);
        if (own) user = own as unknown as Writer;
        if (user) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/poems/my-poems`, {
              headers: { Authorization: `Bearer ${getToken()}` },
              signal: controller.signal,
            });
            if (res.ok) list = (await res.json()).poems || [];
          } catch {
            /* poems stay empty */
          }
        }
      }

      if (controller.signal.aborted) return;
      setAuthor(user);
      setPoems(list);
      setLoading(false);
    })();

    return () => controller.abort();
  }, [authorId]);

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
  }, [loading, poems, search]);

  // Newest first; the latest piece is shown as the featured work.
  const sortedPoems = useMemo(
    () => [...poems].sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)),
    [poems],
  );

  const query = search.trim().toLowerCase();
  const filteredPoems = useMemo(
    () =>
      query === ''
        ? sortedPoems
        : sortedPoems.filter(
            (p) => (p.title || '').toLowerCase().includes(query) || (p.body || '').toLowerCase().includes(query),
          ),
    [sortedPoems, query],
  );

  const handleShare = async () => {
    const url = window.location.href;
    const fullName = `${author?.firstName || ''} ${author?.lastName || ''}`.trim();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${fullName} | Mehfil Poetry`, text: `${fullName} की रचनाएँ पढ़ें`, url });
      } catch {
        navigator.clipboard?.writeText(url);
        showToast('🔗 प्रोफ़ाइल लिंक कॉपी हो गया! अब साझा करें');
      }
    } else {
      navigator.clipboard?.writeText(url);
      showToast('🔗 प्रोफ़ाइल लिंक कॉपी हो गया! अब साझा करें');
    }
  };

  const isOwner = !!author && !!viewerId && String(author._id) === viewerId;

  const openEdit = () => {
    setEditName(`${author?.firstName || ''} ${author?.lastName || ''}`.trim());
    setEditBio(author?.bio || '');
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: editName, bio: editBio }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthor((prev) => (prev ? { ...prev, ...data.user } : prev));
        updateStoredUser(data.user || {});
        showToast('प्रोफ़ाइल अपडेट हुई!');
        setEditOpen(false);
      } else {
        showToast(data.message || 'अपडेट विफल।', true);
      }
    } catch {
      showToast('सर्वर त्रुटि।', true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AuthorLoader />;

  if (!author) {
    return (
      <main className="mehfil-container ap-page">
        <div className="ap-empty">
          <i className="fas fa-user-slash" aria-hidden="true" />
          <h3>😢 रचनाकार नहीं मिला | यह कलम अब यहाँ विराजमान नहीं है</h3>
          <Link href="/poems" className="back-link">
            <i className="fas fa-arrow-left" /> वापस कविताओं पर जाएँ
          </Link>
        </div>
      </main>
    );
  }

  const fullName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'अनामिका रचनाकार';
  const username = (author as Writer & { username?: string }).username;
  const profilePic = author.profilePic || DEFAULT_AVATAR;
  const memberSince = formatDate(author.createdAt);
  const langPref = getLanguageLabel(author.languagePref);
  const poemsCount = author.poemsCount || poems.length || 0;
  const bioText = author.bio || 'शब्दों का मुसाफ़िर, एहसासों का हमसफ़र।';
  const featured = query === '' ? sortedPoems[0] : undefined;

  return (
    <main className="mehfil-container ap-page">
      <Link href="/poems" className="back-link fade-up">
        <i className="fas fa-arrow-left" /> सभी कविताएँ
      </Link>

      {/* Profile header */}
      <header className="ap-hero fade-up">
        <div className="ap-cover" aria-hidden="true">
          <span className="ap-cover-pattern">अ आ इ क ख ग म ह र स</span>
          <span className="ap-cover-mark">❦</span>
        </div>

        <div className="ap-hero-body">
          <div className="ap-avatar-ring">
            <img src={profilePic} alt={fullName} className="ap-avatar" />
          </div>

          <div className="ap-identity">
            <h1 className="ap-name">{fullName}</h1>
            {username && <div className="ap-username">@{username}</div>}
            <p className="ap-bio">{bioText}</p>
            <ul className="ap-chips">
              <li><i className="fas fa-language" aria-hidden="true" /> {langPref}</li>
              {author.city && <li><i className="fas fa-map-marker-alt" aria-hidden="true" /> {author.city}</li>}
            </ul>
          </div>

          <div className="ap-actions">
            <button type="button" className="ap-btn" onClick={handleShare}>
              <i className="fas fa-share-alt" aria-hidden="true" /> प्रोफ़ाइल साझा करें
            </button>
            {isOwner && (
              <>
                <button type="button" className="ap-btn ap-btn-ghost" onClick={openEdit}>
                  <i className="fas fa-edit" aria-hidden="true" /> संपादित करें
                </button>
                <Link href="/profile#my-poems" className="ap-btn ap-btn-ghost">
                  <i className="fas fa-book-open" aria-hidden="true" /> रचनाएँ प्रबंधित करें
                </Link>
              </>
            )}
          </div>
        </div>

        <dl className="ap-stats">
          <div className="ap-stat">
            <dt>रचनाएँ</dt>
            <dd>{poemsCount}</dd>
          </div>
          <div className="ap-stat">
            <dt>भाषा</dt>
            <dd className="ap-stat-text">{langPref}</dd>
          </div>
          {memberSince && (
            <div className="ap-stat">
              <dt>सदस्यता</dt>
              <dd className="ap-stat-text">{memberSince}</dd>
            </div>
          )}
        </dl>
      </header>

      {/* Featured work */}
      {featured && (
        <section className="ap-section fade-up" aria-labelledby="ap-featured-title">
          <h2 id="ap-featured-title" className="ap-section-title">
            <span className="ap-section-kicker">नवीनतम</span> चुनिंदा रचना
          </h2>
          <Link href={`/poem/${featured.slug}`} className="ap-featured">
            <span className="ap-featured-mark" aria-hidden="true">&ldquo;</span>
            <div className="ap-featured-meta">
              <span className="ap-tag">{featured.category || 'कविता'}</span>
              <span className="ap-date">{formatDate(featured.createdAt)}</span>
            </div>
            <h3 className="ap-featured-title">{featured.title || 'अनामिका'}</h3>
            <p className="ap-featured-text">{excerpt(featured.body, 220)}</p>
            <span className="ap-read-more">पूरी रचना पढ़ें <i className="fas fa-arrow-right" aria-hidden="true" /></span>
          </Link>
        </section>
      )}

      {/* All works */}
      <section className="ap-section" aria-labelledby="ap-all-title">
        <div className="ap-section-head fade-up">
          <h2 id="ap-all-title" className="ap-section-title">सभी रचनाएँ</h2>
          <label className="ap-search">
            <i className="fas fa-search" aria-hidden="true" />
            <span className="sr-only">रचनाएँ खोजें</span>
            <input
              type="search"
             
              placeholder="शीर्षक या कविता के अंश से खोजें..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {filteredPoems.length === 0 ? (
          <div className="ap-empty">
            <i className="fas fa-leaf" aria-hidden="true" />
            <p>😢 {query ? 'कोई रचना नहीं मिली।' : 'अभी तक कोई रचना प्रकाशित नहीं हुई।'}</p>
          </div>
        ) : (
          <div className="ap-grid">
            {filteredPoems.map((poem) => (
              <Link href={`/poem/${poem.slug}`} key={poem._id} className="ap-card fade-up">
                <div className="ap-card-meta">
                  <span className="ap-tag">{poem.category || 'कविता'}</span>
                  <span className="ap-date">{formatDate(poem.createdAt)}</span>
                </div>
                <h3 className="ap-card-title">{poem.title || 'अनामिका'}</h3>
                <p className="ap-card-text">{excerpt(poem.body, 120)}</p>
                <span className="ap-read-more">पढ़ें <i className="fas fa-arrow-right" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {isOwner && editOpen && (
        <div className="modal-mask" onClick={() => setEditOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="प्रोफ़ाइल संपादित करें">
            <div className="modal-header-row">
              <h2 className="modal-title">प्रोफ़ाइल संपादित करें</h2>
              <button type="button" className="modal-close-x" onClick={() => setEditOpen(false)} aria-label="बंद करें">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="modal-field">
              <label className="modal-label" htmlFor="ap-edit-name">नाम</label>
              <input id="ap-edit-name" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="अपना नाम दर्ज करें" />
            </div>
            <div className="modal-field">
              <label className="modal-label" htmlFor="ap-edit-bio">परिचय</label>
              <textarea id="ap-edit-bio" className="form-input modal-textarea" value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="अपना परिचय लिखें..." />
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setEditOpen(false)}>रद्द करें</button>
              <button type="button" className="primary-btn" onClick={saveProfile} disabled={saving}>{saving ? 'सहेज रहे हैं…' : 'सहेजें'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AuthorPage() {
  return (
    <Suspense fallback={<AuthorLoader />}>
      <AuthorContent />
    </Suspense>
  );
}

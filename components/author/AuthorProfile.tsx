'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, DEFAULT_AVATAR, Writer, Poem, formatDate, authorHref } from '@/lib/mehfil';
import { fetchOwnProfile, getCurrentUserId, getStoredUser, getToken, myProfileHref, resolveCurrentUserId, updateStoredUser } from '@/lib/auth';
import { useToast } from '@/components/site/ToastProvider';
import { useScrollToTop } from '@/lib/useScrollToTop';

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


export function AuthorLoader() {
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

/** ident = Mongo id or username of the author to show; null = "my profile". */
export function AuthorProfile({ ident }: { ident: string | null }) {
  const router = useRouter();
  const authorId = ident;
  const { showToast } = useToast();
  const [author, setAuthor] = useState<Writer | null>(null);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const picInputRef = useRef<HTMLInputElement>(null);

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
      if (id) router.replace(myProfileHref(id));
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
      // Old id-based links (and /author?id=...) are switched to the username URL.
      const uname = (user as (Writer & { username?: string }) | null)?.username;
      if (uname && uname !== authorId) {
        router.replace(authorHref({ _id: user!._id, username: uname }));
        return;
      }
      setAuthor(user);
      setPoems(list);
      setLoading(false);
    })();

    return () => controller.abort();
  }, [authorId, router]);

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
    setEditUsername((author as Writer & { username?: string })?.username || '');
    setEditOpen(true);
  };

  // Sends multipart form data to PUT /api/auth/profile and syncs page state + stored user.
  const sendProfileUpdate = async (formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` }, // browser sets the multipart boundary
        body: formData,
      });
      let data: { success?: boolean; user?: Record<string, unknown>; message?: string } = {};
      try { data = await res.json(); } catch { /* non-JSON error body */ }
      if (res.ok && data.success && data.user) {
        setAuthor((prev) => (prev ? { ...prev, ...data.user } : prev));
        updateStoredUser(data.user);
        return true;
      }
      showToast(data.message || 'अपडेट विफल।', true);
    } catch {
      showToast('सर्वर त्रुटि।', true);
    }
    return false;
  };

  const saveProfile = async () => {
    const parts = editName.trim().split(/\s+/).filter(Boolean);
    const formData = new FormData();
    formData.append('firstName', parts.shift() || '');
    formData.append('lastName', parts.join(' '));
    formData.append('bio', editBio);
    const currentUsername = (author as Writer & { username?: string })?.username || '';
    const newUsername = editUsername.trim().replace(/^@/, '').toLowerCase();
    if (newUsername && newUsername !== currentUsername) formData.append('username', newUsername);
    setSaving(true);
    const ok = await sendProfileUpdate(formData);
    setSaving(false);
    if (ok) {
      showToast('प्रोफ़ाइल अपडेट हुई!');
      setEditOpen(false);
      if (newUsername && newUsername !== currentUsername) router.replace(`/u/${newUsername}`);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      showToast('केवल JPG, PNG या WebP चित्र चुनें।', true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('चित्र 5 MB से छोटा होना चाहिए।', true);
      return;
    }
    const formData = new FormData();
    formData.append('profilePic', file);
    setUploadingPic(true);
    const ok = await sendProfileUpdate(formData);
    setUploadingPic(false);
    if (ok) showToast('प्रोफ़ाइल तस्वीर अपडेट हुई!');
  };

  useScrollToTop(!loading);

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
          <div className="ap-avatar-ring" style={{ position: 'relative' }}>
            <img src={profilePic} alt={fullName} className="ap-avatar" />
            {isOwner && (
              <>
                <button
                  type="button"
                  aria-label="प्रोफ़ाइल तस्वीर बदलें"
                  title="प्रोफ़ाइल तस्वीर बदलें"
                  disabled={uploadingPic}
                  onClick={() => picInputRef.current?.click()}
                  style={{
                    position: 'absolute', right: 2, bottom: 2, width: 34, height: 34, borderRadius: '50%',
                    border: '2px solid #fff', background: 'var(--accent)', color: '#fff', cursor: uploadingPic ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
                  }}
                >
                  <i className={uploadingPic ? 'fas fa-spinner fa-spin' : 'fas fa-camera'} aria-hidden="true" />
                </button>
                <input
                  ref={picInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </>
            )}
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
                <Link href="/profile" className="ap-btn ap-btn-ghost">
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
              <label className="modal-label" htmlFor="ap-edit-username">यूज़रनेम</label>
              <input id="ap-edit-username" className="form-input" value={editUsername} onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._@]/g, '').slice(0, 21))} placeholder="rahul_sharma" autoCapitalize="none" spellCheck={false} />
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

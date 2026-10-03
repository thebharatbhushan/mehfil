'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, Poem, formatDate } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';
import { getCurrentUserId, myProfileHref } from '@/lib/auth';

interface Profile {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  profilePic?: string;
  gender?: string;
  languagePref?: string;
  email?: string;
  city?: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [poemModal, setPoemModal] = useState<Poem | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const storedUser = localStorage.getItem('mehfil_user') || sessionStorage.getItem('mehfil_user');
    let localUser: Profile | null = null;
    if (storedUser) {
      try { localUser = JSON.parse(storedUser); } catch { /* ignore */ }
    }

    // Prefer the token-authenticated endpoint; if it fails (expired token, error body, network),
    // fall back to the public author lookup for the logged-in user's id instead of silently
    // showing stale browser-storage data or a blank profile.
    const loadProfile = async (): Promise<Profile | null> => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const data = await r.json();
          if (data.user) return data.user as Profile;
        }
      } catch { /* try the fallback */ }
      const id = getCurrentUserId();
      if (id) {
        try {
          const r = await fetch(`${API_BASE_URL}/api/auth/user/${encodeURIComponent(id)}`);
          if (r.ok) {
            const data = await r.json();
            if (data.user) return data.user as Profile;
          }
        } catch { /* fall through to stored data */ }
      }
      return null;
    };

    loadProfile().then((remote) => {
      const merged = remote ? { ...(localUser || {}), ...remote } : localUser;
      if (merged) {
        setProfile(merged);
        setEditName(`${merged.firstName || ''} ${merged.lastName || ''}`.trim());
        setEditBio(merged.bio || '');
      }
      setLoading(false);
    });

    fetch(`${API_BASE_URL}/api/poems/my-poems`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setPoems(data.poems || []))
      .catch(() => {});
  }, [router]);

  const handleUpdateProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, bio: editBio }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...profile, ...data.user };
        setProfile(updated);
        const stored = localStorage.getItem('mehfil_user') || sessionStorage.getItem('mehfil_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const merged = { ...parsed, ...data.user };
            if (localStorage.getItem('mehfil_user')) localStorage.setItem('mehfil_user', JSON.stringify(merged));
            else sessionStorage.setItem('mehfil_user', JSON.stringify(merged));
          } catch { /* ignore */ }
        }
        showToast('प्रोफ़ाइल अपडेट हुई!');
        setEditModal(false);
      } else {
        showToast(data.message || 'अपडेट विफल।', true);
      }
    } catch {
      showToast('सर्वर त्रुटि।', true);
    }
  };

  const handleDeletePoem = async (id: string) => {
    if (!confirm('क्या आप इस रचना को हटाना चाहते हैं?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/poems/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPoems(poems.filter((p) => p._id !== id));
        showToast('रचना हटा दी गई।');
      }
    } catch {
      showToast('हटाने में विफल।', true);
    }
  };

  if (loading) {
    return (
      <section className="profile-loading-wrap">
        <div className="profile-loader-content">
          <div className="spinner" />
          <p className="loader-text">प्रोफ़ाइल लोड हो रही है...</p>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="profile-loading-wrap">
        <div className="profile-loader-content">
          <i className="fas fa-exclamation-circle" style={{ fontSize: '3rem', color: 'var(--accent)', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)' }}>प्रोफ़ाइल लोड नहीं हो सकी। कृपया पुनः लॉगिन करें।</p>
        </div>
      </section>
    );
  }

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'अनाम रचनाकार';
  const genderLabel = profile.gender === 'male' ? 'पुरुष' : profile.gender === 'female' ? 'महिला' : profile.gender || '';
  const langLabel = profile.languagePref === 'hi' ? 'हिंदी'
    : profile.languagePref === 'ur' ? 'उर्दू'
    : profile.languagePref === 'en' ? 'English'
    : profile.languagePref || 'हिंदी';
  const memberSince = profile.createdAt ? formatDate(profile.createdAt) : '';
  const initials = (profile.firstName || 'U').charAt(0).toUpperCase();

  return (
    <section className="profile-page-wrap">
      <div className="mehfil-container">
        {/* Profile Hero Card */}
        <div className="profile-hero-card fade-up">
          {/* Cover */}
          <div className="profile-cover">
            <div className="profile-cover-pattern">अ क म ह र स</div>
            <div className="profile-cover-overlay" />
            <div className="profile-cover-deco profile-cover-deco-1">❦</div>
            <div className="profile-cover-deco profile-cover-deco-2">✿</div>
          </div>

          {/* Hero Content */}
          <div className="profile-hero-inner">
            <div className="profile-hero-top">
              {/* Avatar */}
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-ring">
                  {profile.profilePic ? (
                    <img
                      src={profile.profilePic}
                      alt={fullName}
                      className="profile-avatar-img"
                    />
                  ) : (
                    <div className="profile-avatar-placeholder">{initials}</div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="profile-hero-info">
                <h2 className="profile-hero-name">{fullName}</h2>
                {profile.username && <div className="profile-hero-username">@{profile.username}</div>}
                <div className="profile-hero-tags">
                  {genderLabel && (
                    <span className="profile-tag"><i className="fas fa-user" /> {genderLabel}</span>
                  )}
                  <span className="profile-tag"><i className="fas fa-language" /> {langLabel}</span>
                  {profile.city && (
                    <span className="profile-tag"><i className="fas fa-map-marker-alt" /> {profile.city}</span>
                  )}
                  <Link href={myProfileHref()} className="profile-tag" style={{ textDecoration: 'none' }}>
                    <i className="fas fa-user-circle" /> सार्वजनिक प्रोफ़ाइल
                  </Link>
                </div>
                {profile.email && (
                  <div className="profile-email-row">
                    <i className="far fa-envelope" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile.bio ? (
                  <p className="profile-hero-bio">&ldquo;{profile.bio}&rdquo;</p>
                ) : (
                  <p className="profile-hero-bio profile-hero-bio-empty">
                    अभी कोई परिचय नहीं है। संपादित करें बटन दबाकर अपना परिचय जोड़ें।
                  </p>
                )}
              </div>

              {/* Edit Button */}
              <button className="profile-edit-btn" onClick={() => setEditModal(true)}>
                <i className="fas fa-edit" /> <span>संपादित करें</span>
              </button>
            </div>

            {/* Stats */}
            <div className="profile-stats-row">
              <div className="profile-stat-item">
                <div className="profile-stat-icon-wrap">
                  <i className="fas fa-book-open" />
                </div>
                <div className="profile-stat-num">{poems.length}</div>
                <div className="profile-stat-label">रचनाएँ</div>
              </div>
              <div className="profile-stat-item">
                <div className="profile-stat-icon-wrap">
                  <i className="fas fa-heart" />
                </div>
                <div className="profile-stat-num">0</div>
                <div className="profile-stat-label">पसंद</div>
              </div>
              <div className="profile-stat-item">
                <div className="profile-stat-icon-wrap">
                  <i className="fas fa-calendar-plus" />
                </div>
                <div className="profile-stat-num profile-stat-date">{memberSince || '—'}</div>
                <div className="profile-stat-label">सदस्यता</div>
              </div>
            </div>
          </div>
        </div>

        {/* My Poems */}
        <div className="glass-panel profile-poems-panel" id="my-poems">
          <div className="poem-panel-header">
            <h2 className="poem-panel-title">
              <span className="poem-panel-icon"><i className="fas fa-feather-alt" /></span>
              मेरी रचनाएँ
            </h2>
            <Link href="/publish" className="primary-btn profile-new-poem-btn">
              <i className="fas fa-plus" /> नई रचना
            </Link>
          </div>

          {poems.length === 0 ? (
            <div className="profile-empty-state">
              <div className="profile-empty-icon-wrap">
                <i className="fas fa-pen-fancy" />
              </div>
              <h3 className="profile-empty-title">अभी कोई रचना नहीं है</h3>
              <p className="profile-empty-text">अपनी पहली रचना प्रकाशित करें और अपनी कला को दुनिया के साथ साझा करें।</p>
              <Link href="/publish" className="primary-btn profile-empty-cta">
                <i className="fas fa-feather" /> लेखन प्रारम्भ करें
              </Link>
            </div>
          ) : (
            <div className="profile-poem-list">
              {poems.map((poem) => (
                <div className="poem-card-item" key={poem._id}>
                  <div className="poem-card-info">
                    <h3 className="profile-poem-title">{poem.title}</h3>
                    <p className="profile-poem-meta">
                      <span className="profile-poem-cat">{poem.category || 'अन्य'}</span>
                      <span className="profile-poem-dot">·</span>
                      <span>{formatDate(poem.createdAt)}</span>
                    </p>
                  </div>
                  <div className="poem-card-actions">
                    <Link href={`/poem/${poem.slug}`} className="action" aria-label={`${poem.title} देखें`} title="रचना देखें">
                      <i className="far fa-eye" />
                    </Link>
                    <button className="action" onClick={() => setPoemModal(poem)} aria-label={`${poem.title} संपादित करें`} title="रचना संपादित करें">
                      <i className="fas fa-edit" />
                    </button>
                    <button className="action profile-delete-btn" onClick={() => handleDeletePoem(poem._id)} aria-label={`${poem.title} हटाएँ`} title="रचना हटाएँ">
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModal && (
        <div className="modal-mask" onClick={() => setEditModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title">प्रोफ़ाइल संपादित करें</h2>
              <button className="modal-close-x" onClick={() => setEditModal(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="modal-field">
              <label className="modal-label">नाम</label>
              <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="अपना नाम दर्ज करें" />
            </div>
            <div className="modal-field">
              <label className="modal-label">परिचय</label>
              <textarea className="form-input modal-textarea" value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="अपना परिचय लिखें..." />
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setEditModal(false)}>रद्द करें</button>
              <button className="primary-btn" onClick={handleUpdateProfile}>सहेजें</button>
            </div>
          </div>
        </div>
      )}

      {/* Poem View Modal */}
      {poemModal && (
        <div className="modal-mask" onClick={() => setPoemModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title">रचना देखें</h2>
              <button className="modal-close-x" onClick={() => setPoemModal(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="modal-field">
              <label className="modal-label">शीर्षक</label>
              <input className="form-input" defaultValue={poemModal.title} readOnly />
            </div>
            <div className="modal-field">
              <label className="modal-label">रचना</label>
              <textarea className="form-input modal-textarea modal-textarea-lg" defaultValue={poemModal.body} readOnly />
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setPoemModal(null)}>बंद करें</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, Poem, formatDate, getLanguageLabel } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';
import { getCurrentUserId, myProfileHref, updateStoredUser } from '@/lib/auth';
import { useScrollToTop } from '@/lib/useScrollToTop';
import {
  calculateProfileCompletion,
  getCompletionMessage,
  getProfileCompletionItems,
  ProfileCompletionUser,
} from '@/lib/profileCompletion';

interface SocialLinks {
  instagram?: string;
  x?: string;
  website?: string;
  linkedin?: string;
}

interface Profile extends ProfileCompletionUser {
  _id?: string;
  languagePref?: string;
  createdAt?: string;
  socialLinks?: SocialLinks;
}

type EditSection = 'basic' | 'account' | 'location' | 'education' | 'about' | 'interests' | 'languages' | 'social' | 'password' | null;

const INTEREST_OPTIONS = [
  'कविता', 'ग़ज़ल', 'शायरी', 'कहानी', 'हिंदी साहित्य', 'उर्दू साहित्य', 'उपन्यास', 'निबंध', 'फिक्शन', 'नॉन-फिक्शन',
];
const LANGUAGE_OPTIONS = ['हिंदी', 'उर्दू', 'English', 'संस्कृत', 'पंजाबी', 'बंगाली', 'मराठी'];

function getDobInputValue(value?: string) {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : '';
}

function SectionCard({
  title,
  icon,
  section,
  onEdit,
  children,
  hint,
}: {
  title: string;
  icon: string;
  section: EditSection;
  onEdit: (section: EditSection) => void;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <article className="profile-detail-card">
      <div className="profile-detail-head">
        <div className="profile-detail-title-wrap">
          <span className="profile-detail-icon"><i className={`fas ${icon}`} /></span>
          <div>
            <h3>{title}</h3>
            {hint && <p>{hint}</p>}
          </div>
        </div>
        <button className="profile-section-edit" onClick={() => onEdit(section)}>
          <i className="fas fa-pen" /> <span>संपादित करें</span>
        </button>
      </div>
      {children}
    </article>
  );
}

function EmptyValue({ text = 'जानकारी नहीं जोड़ी गई' }: { text?: string }) {
  return <span className="profile-empty-value">{text}</span>;
}

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEdit, setActiveEdit] = useState<EditSection>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [poemModal, setPoemModal] = useState<Poem | null>(null);
  const picInputRef = useRef<HTMLInputElement>(null);
  useScrollToTop(!loading);

  const [basicForm, setBasicForm] = useState({ firstName: '', lastName: '', gender: 'prefer-not', dob: '' });
  const [accountForm, setAccountForm] = useState({ username: '', email: '', currentPassword: '' });
  const [locationForm, setLocationForm] = useState({ city: '', state: '', country: '' });
  const [educationForm, setEducationForm] = useState({ highestEducation: '', institution: '', fieldOfStudy: '' });
  const [bioForm, setBioForm] = useState('');
  const [interestsForm, setInterestsForm] = useState<string[]>([]);
  const [languagesForm, setLanguagesForm] = useState<string[]>([]);
  const [socialForm, setSocialForm] = useState({ instagram: '', x: '', website: '', linkedin: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const completion = useMemo(() => profile ? calculateProfileCompletion(profile) : 0, [profile]);
  const completionItems = useMemo(() => profile ? getProfileCompletionItems(profile) : [], [profile]);
  const missingItems = completionItems.filter((item) => !item.complete);

  const hydrateForms = (user: Profile) => {
    setBasicForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      gender: user.gender || 'prefer-not',
      dob: getDobInputValue(user.dob),
    });
    setAccountForm({ username: user.username || '', email: user.email || '', currentPassword: '' });
    setLocationForm({ city: user.city || '', state: user.state || '', country: user.country || '' });
    setEducationForm({ highestEducation: user.highestEducation || '', institution: user.institution || '', fieldOfStudy: user.fieldOfStudy || '' });
    setBioForm(user.bio || '');
    setInterestsForm(user.literaryInterests || []);
    setLanguagesForm(user.languages || []);
    setSocialForm({
      instagram: user.socialLinks?.instagram || '',
      x: user.socialLinks?.x || '',
      website: user.socialLinks?.website || '',
      linkedin: user.socialLinks?.linkedin || '',
    });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

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

    const loadProfile = async (): Promise<Profile | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return null;
        }
        if (response.ok) {
          const data = await response.json();
          if (data.user) return data.user as Profile;
        }
      } catch { /* fallback below */ }

      const id = getCurrentUserId();
      if (id) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/user/${encodeURIComponent(id)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.user) return data.user as Profile;
          }
        } catch { /* use local storage below */ }
      }
      return null;
    };

    Promise.all([
      loadProfile(),
      fetch(`${API_BASE_URL}/api/poems/my-poems`, { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => response.ok ? response.json() : { poems: [] })
        .catch(() => ({ poems: [] })),
    ]).then(([remote, poemData]) => {
      const merged = remote ? { ...(localUser || {}), ...remote } as Profile : localUser;
      if (merged) {
        setProfile(merged);
        hydrateForms(merged);
        if (remote) updateStoredUser(remote as Record<string, unknown>);
      }
      setPoems(poemData.poems || []);
      setLoading(false);
    });
  }, [router]);

  const applyUser = (user: Profile) => {
    setProfile(user);
    hydrateForms(user);
    updateStoredUser(user as Record<string, unknown>);
  };

  const sendProfileUpdate = async (body: FormData | Record<string, unknown>, endpoint = '/api/auth/profile') => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    setSaving(true);
    try {
      const isFormData = body instanceof FormData;
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        },
        body: isFormData ? body : JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        showToast(data.message || 'अपडेट विफल हुआ।', true);
        return false;
      }
      if (data.user) applyUser(data.user as Profile);
      showToast(data.message || 'प्रोफ़ाइल अपडेट हो गई।');
      return true;
    } catch {
      showToast('सर्वर से कनेक्ट नहीं हो सका।', true);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSection = async () => {
    if (!profile || !activeEdit) return;

    if (activeEdit === 'basic') {
      if (!basicForm.firstName.trim() || !basicForm.lastName.trim()) {
        showToast('कृपया पहला और अंतिम नाम भरें।', true);
        return;
      }
      if (!basicForm.dob) {
        showToast('जन्म तिथि आवश्यक है।', true);
        return;
      }
      if (await sendProfileUpdate(basicForm)) setActiveEdit(null);
      return;
    }
    if (activeEdit === 'account') {
      const usernameChanged = accountForm.username.trim().replace(/^@/, '').toLowerCase() !== (profile.username || '');
      const emailChanged = accountForm.email.trim().toLowerCase() !== (profile.email || '').toLowerCase();
      if (!usernameChanged && !emailChanged) {
        setActiveEdit(null);
        return;
      }
      if (!accountForm.currentPassword) {
        showToast('यूज़रनेम/ईमेल बदलने के लिए वर्तमान पासवर्ड आवश्यक है।', true);
        return;
      }
      const ok = await sendProfileUpdate({
        username: accountForm.username.trim().replace(/^@/, '').toLowerCase(),
        email: accountForm.email.trim().toLowerCase(),
        currentPassword: accountForm.currentPassword,
      }, '/api/auth/profile/account');
      if (ok) setActiveEdit(null);
      return;
    }
    if (activeEdit === 'location') {
      if (await sendProfileUpdate(locationForm)) setActiveEdit(null);
      return;
    }
    if (activeEdit === 'education') {
      if (await sendProfileUpdate(educationForm)) setActiveEdit(null);
      return;
    }
    if (activeEdit === 'about') {
      if (bioForm.length > 500) {
        showToast('परिचय 500 अक्षरों तक रखें।', true);
        return;
      }
      if (await sendProfileUpdate({ bio: bioForm })) setActiveEdit(null);
      return;
    }
    if (activeEdit === 'interests') {
      if (await sendProfileUpdate({ literaryInterests: interestsForm })) setActiveEdit(null);
      return;
    }
    if (activeEdit === 'languages') {
      if (await sendProfileUpdate({ languages: languagesForm })) setActiveEdit(null);
      return;
    }
    if (activeEdit === 'social') {
      if (await sendProfileUpdate({ socialLinks: socialForm })) setActiveEdit(null);
      return;
    }
    if (activeEdit === 'password') {
      if (passwordForm.newPassword.length < 8) {
        showToast('नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।', true);
        return;
      }
      if (await sendProfileUpdate(passwordForm, '/api/auth/profile/password')) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setActiveEdit(null);
      }
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
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
    if (ok) showToast('प्रोफ़ाइल तस्वीर अपडेट हुई।');
  };

  const openSection = (section: EditSection) => {
    if (section === 'basic' && !profile?.profilePic) {
      // Basic completion is still editable below; missing avatar gets its own direct action.
      document.getElementById('profile-basic')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setActiveEdit(section);
  };

  const handleMissingItem = (key: string) => {
    if (key === 'profilePic') {
      picInputRef.current?.click();
      return;
    }
    const item = completionItems.find((entry) => entry.key === key);
    if (item) openSection(item.section as EditSection);
  };

  const toggleValue = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const handleDeletePoem = async (id: string) => {
    if (!confirm('क्या आप इस रचना को हटाना चाहते हैं?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/poems/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        setPoems((current) => current.filter((poem) => poem._id !== id));
        showToast('रचना हटा दी गई।');
      } else showToast('हटाने में विफल।', true);
    } catch { showToast('हटाने में विफल।', true); }
  };

  if (loading) {
    return <section className="profile-loading-wrap"><div className="profile-loader-content"><div className="spinner" /><p className="loader-text">प्रोफ़ाइल लोड हो रही है...</p></div></section>;
  }

  if (!profile) {
    return <section className="profile-loading-wrap"><div className="profile-loader-content"><i className="fas fa-exclamation-circle" style={{ fontSize: '3rem', color: 'var(--accent)', opacity: 0.5 }} /><p style={{ color: 'var(--text-muted)' }}>प्रोफ़ाइल लोड नहीं हो सकी। कृपया पुनः लॉगिन करें।</p></div></section>;
  }

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'अनाम रचनाकार';
  const initials = `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`.trim().toUpperCase() || 'U';
  const genderLabel = profile.gender === 'male' ? 'पुरुष' : profile.gender === 'female' ? 'महिला' : profile.gender === 'non-binary' ? 'नॉन-बाइनरी' : 'पसंद नहीं बताना';
  const memberSince = profile.createdAt ? formatDate(profile.createdAt) : '—';
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (completion / 100) * circumference;

  return (
    <section className="profile-page-wrap">
      <div className="mehfil-container profile-dashboard">
        <div className="profile-premium-header fade-up visible">
          <div className="profile-cover-premium">
            <div className="profile-cover-pattern">अ  क  म  ह  र  स</div>
            <span className="profile-cover-quote">हर शब्द, आपकी पहचान का एक हिस्सा।</span>
            <span className="profile-cover-deco profile-cover-deco-1">❦</span>
            <span className="profile-cover-deco profile-cover-deco-2">✿</span>
          </div>
          <div className="profile-header-content">
            <div className="profile-avatar-column">
              <button className="profile-avatar-ring profile-avatar-action" onClick={() => !uploadingPic && picInputRef.current?.click()} disabled={uploadingPic} aria-label="प्रोफ़ाइल तस्वीर बदलें">
                {profile.profilePic ? <img src={profile.profilePic} alt={fullName} className="profile-avatar-img" /> : <span className="profile-avatar-placeholder">{initials}</span>}
                <span className="profile-avatar-camera"><i className={uploadingPic ? 'fas fa-spinner fa-spin' : 'fas fa-camera'} /></span>
              </button>
              <input ref={picInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            <div className="profile-header-copy">
              <div className="profile-eyebrow"><span>मेहफ़िल सदस्य</span><span className="profile-eyebrow-dot" /> <span>{memberSince} से</span></div>
              <h1>{fullName}</h1>
              {profile.username && <div className="profile-username">@{profile.username}</div>}
              <div className="profile-header-tags">
                <span><i className="fas fa-user" /> {genderLabel}</span>
                <span><i className="fas fa-language" /> {getLanguageLabel(profile.languagePref)}</span>
                {profile.city && <span><i className="fas fa-map-marker-alt" /> {profile.city}{profile.state ? `, ${profile.state}` : ''}</span>}
              </div>
              <p className="profile-header-bio">{profile.bio ? `“${profile.bio}”` : 'अपने बारे में एक छोटा-सा परिचय जोड़ें और अपनी साहित्यिक पहचान को और बेहतर बनाएं।'}</p>
              <div className="profile-header-actions">
                <button className="profile-primary-btn" onClick={() => missingItems[0] ? handleMissingItem(missingItems[0].key) : setActiveEdit('basic')}>
                  <i className="fas fa-sparkles" /> {completion < 100 ? 'प्रोफ़ाइल पूरी करें' : 'प्रोफ़ाइल संपादित करें'}
                </button>
                <Link href={myProfileHref()} className="profile-secondary-btn"><i className="fas fa-external-link-alt" /> सार्वजनिक प्रोफ़ाइल</Link>
              </div>
            </div>
            <div className="profile-completion-card">
              <div className="profile-progress-ring">
                <svg viewBox="0 0 110 110" aria-label={`Profile Completion ${completion}%`}>
                  <circle className="profile-progress-track" cx="55" cy="55" r={radius} />
                  <circle className="profile-progress-value" cx="55" cy="55" r={radius} strokeDasharray={circumference} strokeDashoffset={dashOffset} />
                </svg>
                <div className="profile-progress-center"><strong>{completion}%</strong><span>पूर्ण</span></div>
              </div>
              <div className="profile-completion-copy"><strong>Profile Completion</strong><p>{getCompletionMessage(completion)}</p></div>
            </div>
          </div>
        </div>

        <div className="profile-main-grid">
          <main className="profile-sections-column">
            <div className="profile-section-heading"><span className="profile-section-kicker">YOUR PROFILE</span><h2>आपकी साहित्यिक पहचान</h2><p>महत्वपूर्ण जानकारी पहले से भरी हुई है। बाकी जानकारी आप अपनी सुविधा से जोड़ सकते हैं।</p></div>

            <SectionCard title="व्यक्तिगत जानकारी" icon="fa-user-circle" section="basic" onEdit={openSection} hint="आपके खाते की मूल पहचान">
              <div className="profile-field-grid" id="profile-basic">
                <div><span>नाम</span><strong>{fullName}</strong></div>
                <div><span>यूज़रनेम</span><strong>{profile.username ? `@${profile.username}` : <EmptyValue />}</strong></div>
                <div><span>लिंग</span><strong>{genderLabel}</strong></div>
                <div><span>जन्म तिथि</span><strong>{profile.dob ? formatDate(profile.dob) : <EmptyValue />}</strong></div>
              </div>
            </SectionCard>

            <SectionCard title="अकाउंट और सुरक्षा" icon="fa-shield-alt" section="account" onEdit={openSection} hint="ईमेल, यूज़रनेम और सुरक्षित पासवर्ड">
              <div className="profile-account-grid">
                <div><span>ईमेल</span><strong className="break-anywhere">{profile.email || <EmptyValue />}</strong></div>
                <div><span>पासवर्ड</span><strong className="password-mask">••••••••••</strong><button className="inline-change-btn" onClick={() => setActiveEdit('password')}>पासवर्ड बदलें</button></div>
              </div>
            </SectionCard>

            <SectionCard title="स्थान" icon="fa-map-marker-alt" section="location" onEdit={openSection} hint="आप कहाँ से हैं, यह आपकी प्रोफ़ाइल को अधिक व्यक्तिगत बनाता है">
              <div className="profile-field-grid profile-three-grid">
                <div><span>शहर</span><strong>{profile.city || <EmptyValue text="शहर जोड़ें" />}</strong></div>
                <div><span>राज्य</span><strong>{profile.state || <EmptyValue text="राज्य जोड़ें" />}</strong></div>
                <div><span>देश</span><strong>{profile.country || <EmptyValue text="देश जोड़ें" />}</strong></div>
              </div>
            </SectionCard>

            <SectionCard title="शिक्षा" icon="fa-graduation-cap" section="education" onEdit={openSection} hint="आपकी शैक्षणिक पृष्ठभूमि">
              {profile.highestEducation || profile.institution || profile.fieldOfStudy ? (
                <div className="education-display"><strong>{profile.highestEducation || 'शिक्षा'}</strong><span>{profile.fieldOfStudy || 'अध्ययन क्षेत्र नहीं जोड़ा गया'}</span><small>{profile.institution || 'संस्थान नहीं जोड़ा गया'}</small></div>
              ) : <div className="profile-empty-block"><i className="fas fa-graduation-cap" /><div><strong>अपनी शिक्षा जोड़ें</strong><p>पाठकों और रचनाकारों को आपकी पृष्ठभूमि जानने में मदद मिलेगी।</p></div></div>}
            </SectionCard>

            <SectionCard title="मेरे बारे में" icon="fa-feather-alt" section="about" onEdit={openSection} hint="आपकी कहानी, आपकी आवाज़">
              <div className={profile.bio ? 'profile-bio-display' : 'profile-empty-block'}>{profile.bio ? profile.bio : <><i className="fas fa-quote-left" /><div><strong>एक छोटा परिचय लिखें</strong><p>आप क्या लिखते हैं, क्या पढ़ते हैं या साहित्य आपके लिए क्या मायने रखता है—बताइए।</p></div></>}</div>
            </SectionCard>

            <SectionCard title="साहित्यिक रुचियाँ" icon="fa-book-open" section="interests" onEdit={openSection} hint="आप किन विधाओं और विषयों से जुड़े हैं">
              {profile.literaryInterests?.length ? <div className="profile-chip-list">{profile.literaryInterests.map((item) => <span className="profile-chip" key={item}>{item}</span>)}</div> : <div className="profile-empty-block"><i className="fas fa-book-open" /><div><strong>अपनी रुचियाँ चुनें</strong><p>कविता, ग़ज़ल, शायरी, कहानी और अपनी पसंद की दूसरी विधाएँ चुनें।</p></div></div>}
            </SectionCard>

            <SectionCard title="भाषाएँ" icon="fa-language" section="languages" onEdit={openSection} hint="जिन भाषाओं में आप पढ़ते या लिखते हैं">
              {profile.languages?.length ? <div className="profile-chip-list">{profile.languages.map((item) => <span className="profile-chip profile-chip-language" key={item}>{item}</span>)}</div> : <div className="profile-empty-block"><i className="fas fa-language" /><div><strong>भाषाएँ जोड़ें</strong><p>अपनी साहित्यिक भाषाओं को चुनें।</p></div></div>}
            </SectionCard>

            <SectionCard title="सोशल / प्रोफ़ेशनल लिंक" icon="fa-link" section="social" onEdit={openSection} hint="वैकल्पिक — केवल वही लिंक जोड़ें जिन्हें आप साझा करना चाहते हैं">
              {Object.values(profile.socialLinks || {}).some(Boolean) ? <div className="profile-social-list">
                {profile.socialLinks?.instagram && <a href={profile.socialLinks.instagram} target="_blank" rel="noreferrer"><i className="fab fa-instagram" /> Instagram</a>}
                {profile.socialLinks?.x && <a href={profile.socialLinks.x} target="_blank" rel="noreferrer"><i className="fab fa-x-twitter" /> X</a>}
                {profile.socialLinks?.website && <a href={profile.socialLinks.website} target="_blank" rel="noreferrer"><i className="fas fa-globe" /> Website</a>}
                {profile.socialLinks?.linkedin && <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer"><i className="fab fa-linkedin" /> LinkedIn</a>}
              </div> : <div className="profile-optional-note"><i className="fas fa-info-circle" /> ये लिंक optional हैं और Profile Completion में शामिल नहीं हैं।</div>}
            </SectionCard>
          </main>

          <aside className="profile-sidebar">
            <div className="profile-complete-panel">
              <div className="profile-panel-kicker">PROFILE JOURNEY</div>
              <h3>Complete your profile</h3>
              <p>{completion === 100 ? 'आपकी प्रोफ़ाइल पूरी है। ✨' : `आप ${completion}% तक पहुँच चुके हैं।`}</p>
              <div className="profile-linear-progress"><span style={{ width: `${completion}%` }} /></div>
              <div className="profile-progress-caption"><strong>{completion}%</strong><span>{100 - completion}% बाकी</span></div>
              <div className="profile-check-list">
                {completionItems.map((item) => <button key={item.key} className={item.complete ? 'complete' : ''} onClick={() => !item.complete && handleMissingItem(item.key)} disabled={item.complete}><i className={`fas ${item.complete ? 'fa-check-circle' : 'fa-circle'}`} /><span>{item.label}</span>{!item.complete && <i className="fas fa-chevron-right profile-check-arrow" />}</button>)}
              </div>
              {completion < 100 && <button className="profile-primary-btn profile-sidebar-cta" onClick={() => handleMissingItem(missingItems[0]?.key || 'profilePic')}><i className="fas fa-magic" /> अगला कदम पूरा करें</button>}
            </div>
            <div className="profile-side-note"><i className="fas fa-quote-right" /><p>“शब्दों से बनी पहचान, समय से भी लंबी चलती है।”</p><span>— मेहफ़िल</span></div>
          </aside>
        </div>

        <div className="glass-panel profile-poems-panel" id="my-poems">
          <div className="poem-panel-header"><h2 className="poem-panel-title"><span className="poem-panel-icon"><i className="fas fa-feather-alt" /></span>मेरी रचनाएँ</h2><Link href="/publish" className="primary-btn profile-new-poem-btn"><i className="fas fa-plus" /> नई रचना</Link></div>
          {poems.length === 0 ? <div className="profile-empty-state"><div className="profile-empty-icon-wrap"><i className="fas fa-pen-fancy" /></div><h3 className="profile-empty-title">अभी कोई रचना नहीं है</h3><p className="profile-empty-text">अपनी पहली रचना प्रकाशित करें और अपनी कला को दुनिया के साथ साझा करें।</p><Link href="/publish" className="primary-btn profile-empty-cta"><i className="fas fa-feather" /> लेखन प्रारम्भ करें</Link></div> : <div className="profile-poem-list">{poems.map((poem) => <div className="poem-card-item" key={poem._id}><div className="poem-card-info"><h3 className="profile-poem-title">{poem.title}</h3><p className="profile-poem-meta"><span className="profile-poem-cat">{poem.category || 'अन्य'}</span><span className="profile-poem-dot">·</span><span>{formatDate(poem.createdAt)}</span></p></div><div className="poem-card-actions"><Link href={`/poem/${poem.slug}`} className="action" aria-label={`${poem.title} देखें`} title="रचना देखें"><i className="far fa-eye" /></Link><button className="action" onClick={() => setPoemModal(poem)} aria-label={`${poem.title} देखें`} title="रचना देखें"><i className="fas fa-book-open" /></button><button className="action profile-delete-btn" onClick={() => handleDeletePoem(poem._id)} aria-label={`${poem.title} हटाएँ`} title="रचना हटाएँ"><i className="fas fa-trash" /></button></div></div>)}</div>}
        </div>
      </div>

      {activeEdit && (
        <div className="modal-mask profile-modal-mask" onClick={() => !saving && setActiveEdit(null)}>
          <div className="modal-dialog profile-edit-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header-row"><div><h2 className="modal-title">{activeEdit === 'basic' ? 'व्यक्तिगत जानकारी' : activeEdit === 'account' ? 'अकाउंट जानकारी' : activeEdit === 'location' ? 'स्थान' : activeEdit === 'education' ? 'शिक्षा' : activeEdit === 'about' ? 'मेरे बारे में' : activeEdit === 'interests' ? 'साहित्यिक रुचियाँ' : activeEdit === 'languages' ? 'भाषाएँ' : activeEdit === 'social' ? 'सोशल / प्रोफ़ेशनल लिंक' : 'पासवर्ड बदलें'}</h2><p className="profile-modal-subtitle">जानकारी अपडेट करें और सेव करें।</p></div><button className="modal-close-x" onClick={() => setActiveEdit(null)} disabled={saving}><i className="fas fa-times" /></button></div>

            {activeEdit === 'basic' && <div className="profile-modal-fields"><div className="profile-form-grid"><label className="modal-field"><span className="modal-label">पहला नाम</span><input className="form-input" value={basicForm.firstName} onChange={(e) => setBasicForm({ ...basicForm, firstName: e.target.value })} /></label><label className="modal-field"><span className="modal-label">अंतिम नाम</span><input className="form-input" value={basicForm.lastName} onChange={(e) => setBasicForm({ ...basicForm, lastName: e.target.value })} /></label></div><label className="modal-field"><span className="modal-label">लिंग</span><select className="form-input" value={basicForm.gender} onChange={(e) => setBasicForm({ ...basicForm, gender: e.target.value })}><option value="male">पुरुष</option><option value="female">महिला</option><option value="non-binary">नॉन-बाइनरी</option><option value="prefer-not">पसंद नहीं बताना</option></select></label><label className="modal-field"><span className="modal-label">जन्म तिथि</span><input className="form-input" type="date" value={basicForm.dob} onChange={(e) => setBasicForm({ ...basicForm, dob: e.target.value })} max={new Date().toISOString().slice(0, 10)} /></label></div>}

            {activeEdit === 'account' && <div className="profile-modal-fields"><label className="modal-field"><span className="modal-label">यूज़रनेम</span><input className="form-input" value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._]/g, '').slice(0, 20) })} autoCapitalize="none" spellCheck={false} /></label><label className="modal-field"><span className="modal-label">ईमेल</span><input className="form-input" type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} /></label><label className="modal-field"><span className="modal-label">वर्तमान पासवर्ड <small>(सुरक्षा के लिए)</small></span><input className="form-input" type="password" value={accountForm.currentPassword} onChange={(e) => setAccountForm({ ...accountForm, currentPassword: e.target.value })} autoComplete="current-password" /></label></div>}

            {activeEdit === 'location' && <div className="profile-modal-fields"><div className="profile-form-grid"><label className="modal-field"><span className="modal-label">शहर</span><input className="form-input" value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} placeholder="जैसे Jaipur" /></label><label className="modal-field"><span className="modal-label">राज्य</span><input className="form-input" value={locationForm.state} onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })} placeholder="जैसे Rajasthan" /></label></div><label className="modal-field"><span className="modal-label">देश</span><input className="form-input" value={locationForm.country} onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })} placeholder="जैसे India" /></label></div>}

            {activeEdit === 'education' && <div className="profile-modal-fields"><label className="modal-field"><span className="modal-label">उच्चतम शिक्षा</span><input className="form-input" value={educationForm.highestEducation} onChange={(e) => setEducationForm({ ...educationForm, highestEducation: e.target.value })} placeholder="जैसे Bachelor's Degree" /></label><label className="modal-field"><span className="modal-label">संस्थान / कॉलेज / विश्वविद्यालय</span><input className="form-input" value={educationForm.institution} onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })} /></label><label className="modal-field"><span className="modal-label">अध्ययन क्षेत्र</span><input className="form-input" value={educationForm.fieldOfStudy} onChange={(e) => setEducationForm({ ...educationForm, fieldOfStudy: e.target.value })} placeholder="जैसे Computer Science" /></label></div>}

            {activeEdit === 'about' && <div className="profile-modal-fields"><label className="modal-field"><span className="modal-label">परिचय <small>{bioForm.length}/500</small></span><textarea className="form-input modal-textarea profile-bio-input" value={bioForm} onChange={(e) => setBioForm(e.target.value.slice(0, 500))} placeholder="अपने बारे में कुछ लिखें..." /></label></div>}

            {activeEdit === 'interests' && <div className="profile-modal-fields"><p className="profile-choice-help">जो पसंद हो, उसे चुनें। आप कई विकल्प चुन सकते हैं।</p><div className="profile-choice-grid">{INTEREST_OPTIONS.map((item) => <button type="button" key={item} className={`profile-choice-pill ${interestsForm.includes(item) ? 'selected' : ''}`} onClick={() => toggleValue(item, setInterestsForm)}>{interestsForm.includes(item) && <i className="fas fa-check" />} {item}</button>)}</div></div>}

            {activeEdit === 'languages' && <div className="profile-modal-fields"><p className="profile-choice-help">जिन भाषाओं में आप पढ़ते या लिखते हैं, उन्हें चुनें।</p><div className="profile-choice-grid">{LANGUAGE_OPTIONS.map((item) => <button type="button" key={item} className={`profile-choice-pill ${languagesForm.includes(item) ? 'selected' : ''}`} onClick={() => toggleValue(item, setLanguagesForm)}>{languagesForm.includes(item) && <i className="fas fa-check" />} {item}</button>)}</div></div>}

            {activeEdit === 'social' && <div className="profile-modal-fields"><label className="modal-field"><span className="modal-label">Instagram</span><input className="form-input" value={socialForm.instagram} onChange={(e) => setSocialForm({ ...socialForm, instagram: e.target.value })} placeholder="https://instagram.com/..." /></label><label className="modal-field"><span className="modal-label">X / Twitter</span><input className="form-input" value={socialForm.x} onChange={(e) => setSocialForm({ ...socialForm, x: e.target.value })} placeholder="https://x.com/..." /></label><label className="modal-field"><span className="modal-label">Website</span><input className="form-input" value={socialForm.website} onChange={(e) => setSocialForm({ ...socialForm, website: e.target.value })} placeholder="https://example.com" /></label><label className="modal-field"><span className="modal-label">LinkedIn</span><input className="form-input" value={socialForm.linkedin} onChange={(e) => setSocialForm({ ...socialForm, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." /></label></div>}

            {activeEdit === 'password' && <div className="profile-modal-fields"><div className="profile-security-callout"><i className="fas fa-lock" /><div><strong>पासवर्ड सुरक्षित रहेगा</strong><p>पासवर्ड कभी प्रोफ़ाइल डेटा के साथ वापस नहीं भेजा जाता।</p></div></div><label className="modal-field"><span className="modal-label">वर्तमान पासवर्ड</span><input className="form-input" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} autoComplete="current-password" /></label><label className="modal-field"><span className="modal-label">नया पासवर्ड</span><input className="form-input" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} autoComplete="new-password" /></label><label className="modal-field"><span className="modal-label">नया पासवर्ड पुष्टि करें</span><input className="form-input" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} autoComplete="new-password" /></label></div>}

            <div className="modal-actions"><button className="secondary-btn" onClick={() => setActiveEdit(null)} disabled={saving}>रद्द करें</button><button className="primary-btn" onClick={saveSection} disabled={saving}>{saving ? 'सहेजा जा रहा है...' : 'सहेजें'}</button></div>
          </div>
        </div>
      )}

      {poemModal && <div className="modal-mask" onClick={() => setPoemModal(null)}><div className="modal-dialog" onClick={(event) => event.stopPropagation()}><div className="modal-header-row"><h2 className="modal-title">रचना देखें</h2><button className="modal-close-x" onClick={() => setPoemModal(null)}><i className="fas fa-times" /></button></div><div className="modal-field"><label className="modal-label">शीर्षक</label><input className="form-input" value={poemModal.title} readOnly /></div><div className="modal-field"><label className="modal-label">रचना</label><textarea className="form-input modal-textarea modal-textarea-lg" value={poemModal.body} readOnly /></div><div className="modal-actions"><button className="secondary-btn" onClick={() => setPoemModal(null)}>बंद करें</button></div></div></div>}
    </section>
  );
}

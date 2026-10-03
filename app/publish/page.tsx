'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, POEM_CATEGORIES, POEM_TAGS } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';

export default function PublishPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [copyright, setCopyright] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('✍️ कृपया पहले प्रवेश करें।', true);
      setTimeout(() => router.push('/login'), 1200);
    }
    const draft = localStorage.getItem('mehfil_draft');
    if (draft) {
      try {
        const d = JSON.parse(draft);
        setTitle(d.title || '');
        setCategory(d.category || '');
        setBody(d.body || '');
        setTags(d.tags || []);
      } catch {}
    }
  }, [router, showToast]);

  const toggleTag = (tag: string) => {
    setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || body.length < 20) {
      showToast('❌ कृपया सभी आवश्यक फ़ील्ड भरें।', true);
      return;
    }
    if (!copyright) {
      showToast('❌ कृपया कॉपीराइट घोषणा स्वीकार करें।', true);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/poems/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, category, body, tags, copyrightDeclaration: copyright }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('mehfil_draft');
        showToast('✨ आपकी रचना प्रकाशित हो गई!');
        setTimeout(() => router.push('/profile'), 1000);
      } else {
        showToast(data.message || '❌ प्रकाशन विफल।', true);
      }
    } catch {
      showToast('❌ सर्वर त्रुटि।', true);
    }
    setLoading(false);
  };

  const handleDraft = () => {
    localStorage.setItem('mehfil_draft', JSON.stringify({ title, category, body, tags }));
    showToast('📝 ड्राफ़्ट सहेजा गया।');
  };

  return (
    <section style={{ paddingTop: '2rem' }}>
      <div className="mehfil-container" style={{ maxWidth: '1000px' }}>
        <div className="page-header" style={{ padding: '1rem 0 2rem' }}>
          <h1>नई रचना प्रकाशित करें</h1>
          <p>अपनी कविता दुनिया के साथ साझा करें</p>
        </div>

        <div className="form-card">
          <div className="form-grid">
            <form onSubmit={handlePublish}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>शीर्षक *</label>
                <input className="form-input" placeholder="अपनी कविता का शीर्षक दें..." value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>श्रेणी *</label>
                <select className="form-input" style={{ appearance: 'none' }} value={category} onChange={(e) => setCategory(e.target.value)} required>
                  <option value="">श्रेणी चुनें...</option>
                  {POEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                  रचना * <span style={{ float: 'right' }}>{body.length} अक्षर</span>
                </label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="अपनी कविता यहाँ लिखें... (न्यूनतम 20 अक्षर)"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>टैग्स</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {POEM_TAGS.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      className={`tag-option ${tags.includes(tag) ? 'selected' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={copyright} onChange={(e) => setCopyright(e.target.checked)} style={{ marginTop: '3px' }} />
                  <span>मैं घोषणा करता/करती हूँ कि यह रचना मेरी मौलिक कृति है और किसी अन्य की कॉपीराइट का उल्लंघन नहीं करती।</span>
                </label>
              </div>
              <div className="publish-btn-row">
                <button className="primary-btn publish-submit-btn" type="submit" disabled={loading}>
                  {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><i className="fas fa-paper-plane" /> प्रकाशित करें</>}
                </button>
                <button className="secondary-btn publish-draft-btn" type="button" onClick={handleDraft}>
                  <i className="fas fa-save" /> ड्राफ़्ट सहेजें
                </button>
              </div>
            </form>

            <div>
              <div className="form-inspiration" style={{ background: 'linear-gradient(135deg, #fdf6ef, #f8e8d8)', borderRadius: '1.5rem', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '5rem', opacity: 0.08 }}>❦</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--accent-dark)', marginBottom: '1rem', position: 'relative', zIndex: 2 }}>
                  लेखन प्रेरणा
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, position: 'relative', zIndex: 2 }}>
                  &ldquo;शब्दों से ही तो है पहचान हमारी, जो दिल से निकले वही रचना हमारी...&rdquo;
                </p>
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.6)', borderRadius: '1rem', position: 'relative', zIndex: 2 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <i className="fas fa-lightbulb" style={{ color: 'var(--accent)' }} /> टिप: अपनी रचना को हृदय से लिखें। अल्फ़ाज़ ख़ुद-ब-ख़ुद संवाद करेंगे।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

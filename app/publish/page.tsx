'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, POEM_CATEGORIES, POEM_TAGS } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';
import { extractYouTubeId, YOUTUBE_INVALID_MESSAGE } from '@/lib/youtube';

export default function PublishPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [copyright, setCopyright] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  // Id of the server-side draft being edited (set after the first save, or when opened from ?draft=<id>).
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('✍️ कृपया पहले प्रवेश करें।', true);
      setTimeout(() => router.push('/login'), 1200);
      return;
    }

    // Continue editing a saved draft: /publish?draft=<id>. Drafts are private and stored in the database,
    // so they follow the author across browsers and devices.
    const id = new URLSearchParams(window.location.search).get('draft');
    if (id) {
      let cancelled = false;
      setLoadingDraft(true);
      fetch(`${API_BASE_URL}/api/drafts/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async (res) => ({ res, data: await res.json().catch(() => ({})) }))
        .then(({ res, data }) => {
          if (cancelled) return;
          if (res.status === 401) {
            showToast('❌ सत्र समाप्त हो गया है, कृपया दोबारा प्रवेश करें।', true);
            return;
          }
          if (!res.ok || !data.draft) {
            showToast('❌ यह ड्राफ़्ट नहीं मिला।', true);
            return;
          }
          const d = data.draft;
          setDraftId(d._id);
          setTitle(d.title || '');
          setCategory(d.category || '');
          setBody(d.body || '');
          setTags(Array.isArray(d.tags) ? d.tags : []);
          setYoutubeUrl(d.youtubeVideoId ? `https://www.youtube.com/watch?v=${d.youtubeVideoId}` : '');
          setCopyright(!!d.copyrightDeclaration);
        })
        .catch(() => { if (!cancelled) showToast('❌ सर्वर त्रुटि।', true); })
        .finally(() => { if (!cancelled) setLoadingDraft(false); });
      return () => { cancelled = true; };
    }

    // Older versions kept one draft in this browser only. Restore it once so nothing is lost; it moves to the
    // database the next time "ड्राफ़्ट सहेजें" is pressed.
    const draft = localStorage.getItem('mehfil_draft');
    if (draft) {
      try {
        const d = JSON.parse(draft);
        setTitle(d.title || '');
        setCategory(d.category || '');
        setBody(d.body || '');
        setTags(d.tags || []);
        setYoutubeUrl(d.youtubeUrl || '');
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
    if (youtubeUrl.trim() && !extractYouTubeId(youtubeUrl)) {
      setYoutubeError(YOUTUBE_INVALID_MESSAGE);
      showToast(`❌ ${YOUTUBE_INVALID_MESSAGE}`, true);
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
        body: JSON.stringify({ title, category, body, tags, copyrightDeclaration: copyright, ...(youtubeUrl.trim() ? { youtubeUrl: youtubeUrl.trim() } : {}), ...(draftId ? { draftId } : {}) }),
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

  const handleDraft = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('✍️ कृपया पहले प्रवेश करें।', true);
      router.push('/login');
      return;
    }
    if (!title.trim() && !body.trim()) {
      showToast('❌ ड्राफ़्ट सहेजने के लिए शीर्षक या कुछ पाठ लिखें।', true);
      return;
    }
    if (youtubeUrl.trim() && !extractYouTubeId(youtubeUrl)) {
      setYoutubeError(YOUTUBE_INVALID_MESSAGE);
      showToast(`❌ ${YOUTUBE_INVALID_MESSAGE}`, true);
      return;
    }
    setSavingDraft(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/drafts${draftId ? `/${draftId}` : ''}`, {
        method: draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // youtubeUrl '' clears a previously saved link; the draft keeps every field the poem form has.
        body: JSON.stringify({ title, category, body, tags, copyrightDeclaration: copyright, youtubeUrl: youtubeUrl.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.draft) {
        if (!draftId) {
          setDraftId(data.draft._id);
          // Keep the address bar pointing at this draft so a refresh reopens it (no navigation, form state is kept).
          window.history.replaceState(window.history.state, '', `/publish?draft=${encodeURIComponent(data.draft._id)}`);
        }
        localStorage.removeItem('mehfil_draft'); // the old browser-only copy now lives in the database
        showToast('📝 ड्राफ़्ट सहेजा गया।');
      } else if (res.status === 404 && draftId) {
        // The draft was deleted elsewhere: the next save creates a fresh one.
        setDraftId(null);
        window.history.replaceState(window.history.state, '', '/publish');
        showToast('❌ पुराना ड्राफ़्ट नहीं मिला; दोबारा सहेजें।', true);
      } else if (res.status === 401) {
        showToast('❌ सत्र समाप्त हो गया है, कृपया दोबारा प्रवेश करें।', true);
      } else {
        showToast(data.message || '❌ ड्राफ़्ट सहेजा नहीं जा सका।', true);
      }
    } catch {
      showToast('❌ सर्वर त्रुटि।', true);
    }
    setSavingDraft(false);
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
              <div className="yt-field">
                <label htmlFor="youtubeUrl" className="yt-field-title">
                  <i className="fas fa-microphone-alt" aria-hidden="true" /> अपनी आवाज़ में सुनाएँ <span>(वैकल्पिक)</span>
                </label>
                <p className="yt-field-hint">
                  अपनी कविता का YouTube वीडियो जोड़ें, ताकि पाठक आपकी रचना को पढ़ने के साथ-साथ आपकी आवाज़ में सुन भी सकें।
                </p>
                <input
                  id="youtubeUrl"
                  type="url"
                  inputMode="url"
                  className={`form-input ${youtubeError ? 'yt-field-invalid' : ''}`}
                  placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"
                  value={youtubeUrl}
                  onChange={(e) => { setYoutubeUrl(e.target.value); if (youtubeError) setYoutubeError(''); }}
                  onBlur={() => setYoutubeError(youtubeUrl.trim() && !extractYouTubeId(youtubeUrl) ? YOUTUBE_INVALID_MESSAGE : '')}
                  aria-invalid={!!youtubeError}
                  aria-describedby={youtubeError ? 'youtubeUrlError' : undefined}
                  autoComplete="off"
                />
                {youtubeError && <p id="youtubeUrlError" className="yt-field-error" role="alert">{youtubeError}</p>}
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={copyright} onChange={(e) => setCopyright(e.target.checked)} style={{ marginTop: '3px' }} />
                  <span>मैं घोषणा करता/करती हूँ कि यह रचना मेरी मौलिक कृति है और किसी अन्य की कॉपीराइट का उल्लंघन नहीं करती।</span>
                </label>
              </div>
              <div className="publish-btn-row">
                <button className="primary-btn publish-submit-btn" type="submit" disabled={loading || savingDraft || loadingDraft}>
                  {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><i className="fas fa-paper-plane" /> प्रकाशित करें</>}
                </button>
                <button className="secondary-btn publish-draft-btn" type="button" onClick={handleDraft} disabled={savingDraft || loading || loadingDraft}>
                  {savingDraft ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><i className="fas fa-save" /> ड्राफ़्ट सहेजें</>}
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

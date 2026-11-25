'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/mehfil';
import type { OwnBook } from '@/lib/mehfil';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/site/ToastProvider';
import './books.css';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const STATUS_LABEL: Record<OwnBook['status'], string> = {
  pending: 'समीक्षा में',
  approved: 'प्रोफ़ाइल पर दिख रही है',
  rejected: 'अस्वीकृत',
};

interface FormState {
  id: string | null; // null = adding a new book
  title: string;
  link: string;
  file: File | null;
  preview: string;
}

const EMPTY: FormState = { id: null, title: '', link: '', file: null, preview: '' };

/**
 * Owner-only section on /profile: add up to 3 books (cover image + https link). Every new book or change is sent to the
 * admin for approval; only approved books appear on the public profile.
 */
export function BookManager() {
  const { showToast } = useToast();
  const [books, setBooks] = useState<OwnBook[]>([]);
  const [max, setMax] = useState(3);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const auth = useCallback(() => ({ Authorization: `Bearer ${getToken() || ''}` }), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/books/mine`, { headers: auth() });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setBooks(data.books || []);
        if (data.max) setMax(data.max);
      }
    } catch {
      /* the section simply stays empty */
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => { if (form?.preview.startsWith('blob:')) URL.revokeObjectURL(form.preview); }, [form?.preview]);

  const pickFile = (file?: File) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return showToast('केवल JPG, PNG या WebP इमेज चुनें।', true);
    if (file.size > MAX_BYTES) return showToast('इमेज 5 MB या उससे छोटी होनी चाहिए।', true);
    setForm((f) => (f ? { ...f, file, preview: URL.createObjectURL(file) } : f));
  };

  const submit = async () => {
    if (!form || busy) return;
    const title = form.title.trim();
    if (title.length < 2) return showToast('किताब का नाम लिखें।', true);
    if (!form.link.trim()) return showToast('किताब का लिंक डालें।', true);
    if (!form.id && !form.file) return showToast('किताब का कवर इमेज चुनें।', true);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('link', form.link.trim());
      if (form.file) fd.append('cover', form.file);
      const res = await fetch(`${API_BASE_URL}/api/books${form.id ? `/${form.id}` : ''}`, {
        method: form.id ? 'PUT' : 'POST',
        headers: auth(),
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return showToast(data.message || 'सेव नहीं हो सका। कृपया पुनः प्रयास करें।', true);
      showToast(data.message || 'सेव हो गया।');
      setForm(null);
      await load();
    } catch {
      showToast('नेटवर्क में समस्या है। कृपया पुनः प्रयास करें।', true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b: OwnBook) => {
    if (!window.confirm(`“${b.title}” को हटाएँ?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/books/${b._id}`, { method: 'DELETE', headers: auth() });
      if (!res.ok) return showToast('किताब हटाई नहीं जा सकी।', true);
      showToast('किताब हटा दी गई।');
      await load();
    } catch {
      showToast('नेटवर्क में समस्या है।', true);
    }
  };

  return (
    <article className="profile-detail-card bk-manager" id="profile-books">
      <div className="profile-detail-head">
        <span className="profile-detail-title-wrap">
          <span className="profile-detail-icon"><i className="fas fa-book" aria-hidden="true" /></span>
          <span className="profile-detail-title-text">
            <h3>आपकी किताबें</h3>
            <p>किताब का कवर और लिंक अपनी प्रोफ़ाइल पर दिखाएँ</p>
          </span>
        </span>
      </div>
      <p className="bk-note" style={{ marginTop: '0.9rem' }}>
        अपनी किताब का कवर और खरीदने / पढ़ने का https लिंक जोड़ें (अधिकतम {max})। एडमिन की मंज़ूरी के बाद ही यह आपकी सार्वजनिक प्रोफ़ाइल पर दिखेगी।
        कुछ बदलने पर किताब दोबारा समीक्षा में जाती है।
      </p>

      {!loading && books.length > 0 && (
        <ul className="bk-list" style={{ listStyle: 'none', padding: 0 }}>
          {books.map((b) => (
            <li key={b._id} className="bk-item">
              <img className="bk-cover" src={b.coverUrl} alt={`${b.title} का कवर`} loading="lazy" />
              <div className="bk-item-body">
                <span className="bk-item-title">{b.title}</span>
                <a className="bk-item-link" href={b.link} target="_blank" rel="noopener noreferrer nofollow ugc">{b.link}</a>
                <span className={`bk-status is-${b.status}`}>{STATUS_LABEL[b.status]}</span>
                {b.status === 'rejected' && b.moderationReason && <span className="bk-reason">कारण: {b.moderationReason}</span>}
                <div className="bk-actions">
                  <button type="button" className="bk-btn" onClick={() => setForm({ id: b._id, title: b.title, link: b.link, file: null, preview: b.coverUrl })}>
                    <i className="fas fa-edit" aria-hidden="true" /> बदलें
                  </button>
                  <button type="button" className="bk-btn danger" onClick={() => remove(b)}>
                    <i className="fas fa-trash" aria-hidden="true" /> हटाएँ
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <div className="bk-form">
          <label>
            किताब का नाम
            <input type="text" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="जैसे: दिल की बातें" />
          </label>
          <label>
            किताब का लिंक
            <input type="url" inputMode="url" value={form.link} maxLength={500} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://amazon.in/..." />
            <span className="bk-help">केवल https लिंक (Amazon, Flipkart, Notion Press, आपकी वेबसाइट आदि)।</span>
          </label>
          <div className="bk-form-row">
            {form.preview ? <img className="bk-cover" src={form.preview} alt="चुना हुआ कवर" /> : null}
            <div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files?.[0])} />
              <button type="button" className="bk-btn" onClick={() => fileRef.current?.click()}>
                <i className="fas fa-image" aria-hidden="true" /> {form.preview ? 'कवर बदलें' : 'कवर चुनें'}
              </button>
              <p className="bk-help">JPG / PNG / WebP, 5 MB तक। खड़ी (2:3) तस्वीर सबसे अच्छी दिखती है।</p>
            </div>
          </div>
          <div className="bk-actions">
            <button type="button" className="bk-btn primary" onClick={submit} disabled={busy}>
              {busy ? 'सेव हो रहा है…' : form.id ? 'बदलाव सेव करें' : 'समीक्षा के लिए भेजें'}
            </button>
            <button type="button" className="bk-btn" onClick={() => setForm(null)} disabled={busy}>रद्द करें</button>
          </div>
        </div>
      ) : (
        books.length < max && (
          <button type="button" className="bk-btn primary" onClick={() => setForm({ ...EMPTY })}>
            <i className="fas fa-plus" aria-hidden="true" /> किताब जोड़ें
          </button>
        )
      )}
    </article>
  );
}

export default BookManager;

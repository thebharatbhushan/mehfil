'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { API_BASE_URL } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';

const pill: CSSProperties = {
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
};

const activePill: CSSProperties = { ...pill, background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' };

type Kind = 'bookmarks' | 'likes';

/**
 * Save / Like toggles for a signed-in member (they feed the reader badges). Shows nothing for guests and never any counts.
 * The server decides everything: it is idempotent and refuses saving/liking your own poem.
 *
 * The button reacts instantly: it flips to the new state at once with a spinner and "सहेजी जा रही है…",
 * then the server answer confirms it (or the change is rolled back with an error toast).
 *
 * variant="card": only the Save button, styled as the homepage ".action" chip, and visible to guests too
 * (a guest tap shows a "log in to save" hint instead of doing nothing).
 */
export function PoemMarks({ poemId, variant = 'pill' }: { poemId?: string; variant?: 'pill' | 'card' }) {
  const { showToast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState({ bookmarked: false, liked: false });
  const [pending, setPending] = useState<{ bookmarks: boolean; likes: boolean }>({ bookmarks: false, likes: false });

  useEffect(() => {
    setState({ bookmarked: false, liked: false });
    if (!poemId) return;
    let t: string | null = null;
    try {
      t = localStorage.getItem('token');
    } catch {}
    setToken(t);
    if (!t) return;
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/engagement/poems/${encodeURIComponent(poemId)}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.success) setState({ bookmarked: !!d.bookmarked, liked: !!d.liked });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [poemId]);

  if (!poemId) return null;
  if (!token && variant !== 'card') return null;

  const toggle = async (kind: Kind) => {
    if (!token) {
      showToast('रचना सहेजने के लिए पहले लॉगिन करें', true);
      return;
    }
    if (pending[kind]) return;
    const key = kind === 'bookmarks' ? 'bookmarked' : 'liked';
    const turnOn = !state[key];
    // Optimistic: show the new state immediately, so the tap never feels dead.
    setState((s) => ({ ...s, [key]: turnOn }));
    setPending((p) => ({ ...p, [kind]: true }));
    let ok = false;
    let message = '';
    try {
      const res = await fetch(`${API_BASE_URL}/api/engagement/${kind}/${encodeURIComponent(poemId)}`, {
        method: turnOn ? 'PUT' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      ok = res.ok && !!data?.success;
      message = data?.message || '';
    } catch {}
    setPending((p) => ({ ...p, [kind]: false }));
    if (ok) {
      showToast(kind === 'bookmarks' ? (turnOn ? 'रचना सहेज ली गई' : 'संग्रह से हटाई गई') : turnOn ? 'पसंद दर्ज हुई' : 'पसंद हटाई गई');
    } else {
      setState((s) => ({ ...s, [key]: !turnOn })); // roll back
      showToast(message || 'कुछ गड़बड़ हुई, फिर कोशिश करें', true);
    }
  };

  const saveLabel = pending.bookmarks ? (state.bookmarked ? 'सहेजी जा रही है…' : 'हटाई जा रही है…') : state.bookmarked ? 'सहेजी गई' : 'सहेजें';
  const likeLabel = pending.likes ? (state.liked ? 'दर्ज हो रही है…' : 'हटाई जा रही है…') : state.liked ? 'पसंद की' : 'पसंद करें';
  const saveIcon = pending.bookmarks ? 'fas fa-spinner fa-spin' : `${state.bookmarked ? 'fas' : 'far'} fa-bookmark`;
  const likeIcon = pending.likes ? 'fas fa-spinner fa-spin' : `${state.liked ? 'fas' : 'far'} fa-heart`;

  if (variant === 'card') {
    return (
      <button
        type="button"
        className="action"
        onClick={() => toggle('bookmarks')}
        aria-pressed={state.bookmarked}
        aria-busy={pending.bookmarks}
        style={{ cursor: pending.bookmarks ? 'progress' : 'pointer', ...(state.bookmarked ? { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' } : {}) }}
      >
        <i className={saveIcon} /> {saveLabel}
      </button>
    );
  }

  return (
    <>
      <button type="button" onClick={() => toggle('bookmarks')} aria-pressed={state.bookmarked} aria-busy={pending.bookmarks} style={{ ...(state.bookmarked ? activePill : pill), cursor: pending.bookmarks ? 'progress' : 'pointer' }}>
        <i className={saveIcon} /> {saveLabel}
      </button>
      <button type="button" onClick={() => toggle('likes')} aria-pressed={state.liked} aria-busy={pending.likes} style={{ ...(state.liked ? activePill : pill), cursor: pending.likes ? 'progress' : 'pointer' }}>
        <i className={likeIcon} /> {likeLabel}
      </button>
    </>
  );
}

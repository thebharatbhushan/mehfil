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
 */
export function PoemMarks({ poemId }: { poemId?: string }) {
  const { showToast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState({ bookmarked: false, liked: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
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

  if (!poemId || !token) return null;

  const toggle = async (kind: Kind) => {
    if (busy) return;
    const key = kind === 'bookmarks' ? 'bookmarked' : 'liked';
    const turnOn = !state[key];
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/engagement/${kind}/${encodeURIComponent(poemId)}`, {
        method: turnOn ? 'PUT' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setState((s) => ({ ...s, [key]: turnOn }));
        showToast(kind === 'bookmarks' ? (turnOn ? 'रचना सहेज ली गई' : 'संग्रह से हटाई गई') : turnOn ? 'पसंद दर्ज हुई' : 'पसंद हटाई गई');
      } else {
        showToast(data?.message || 'कुछ गड़बड़ हुई, फिर कोशिश करें', true);
      }
    } catch {
      showToast('कुछ गड़बड़ हुई, फिर कोशिश करें', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => toggle('bookmarks')} disabled={busy} aria-pressed={state.bookmarked} style={state.bookmarked ? activePill : pill}>
        <i className={`${state.bookmarked ? 'fas' : 'far'} fa-bookmark`} /> {state.bookmarked ? 'सहेजी गई' : 'सहेजें'}
      </button>
      <button type="button" onClick={() => toggle('likes')} disabled={busy} aria-pressed={state.liked} style={state.liked ? activePill : pill}>
        <i className={`${state.liked ? 'fas' : 'far'} fa-heart`} /> {state.liked ? 'पसंद की' : 'पसंद करें'}
      </button>
    </>
  );
}

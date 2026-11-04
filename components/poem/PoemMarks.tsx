'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/mehfil';
import { clearStoredSession, getActiveToken } from '@/lib/auth';
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
type MarkState = { bookmarked: boolean; liked: boolean };

const INITIAL: MarkState = { bookmarked: false, liked: false };

const KEY_OF: Record<Kind, keyof MarkState> = { bookmarks: 'bookmarked', likes: 'liked' };

const PENDING_LABEL: Record<Kind, { on: string; off: string }> = {
  bookmarks: { on: 'सहेजा जा रहा है...', off: 'हटाया जा रहा है...' },
  likes: { on: 'पसंद की जा रही है...', off: 'पसंद हटाई जा रही है...' },
};

const DONE_TOAST: Record<Kind, { on: string; off: string }> = {
  bookmarks: { on: 'रचना सहेज ली गई', off: 'संग्रह से हटाई गई' },
  likes: { on: 'पसंद दर्ज हुई', off: 'पसंद हटाई गई' },
};

/**
 * Shared save / like logic. A click flips the button into its "in progress" state at once (so it never looks
 * stuck while the request is in flight) and the server's answer then confirms it or rolls it back.
 * The server decides everything: it is idempotent and refuses saving/liking your own poem.
 */
export function usePoemMarks(poemId?: string) {
  const { showToast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<MarkState>(INITIAL);
  const [pending, setPending] = useState<{ kind: Kind; turnOn: boolean } | null>(null);

  useEffect(() => {
    const sync = () => setToken(getActiveToken());
    window.addEventListener('mehfil-auth-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('mehfil-auth-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    setState(INITIAL);
    if (!poemId) return;
    // Only a really signed-in member (token + stored user) may like / save.
    const t = getActiveToken();
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

  const toggle = async (kind: Kind) => {
    if (!poemId || !token || pending) return;
    const key = KEY_OF[kind];
    const turnOn = !state[key];
    setPending({ kind, turnOn });
    try {
      const res = await fetch(`${API_BASE_URL}/api/engagement/${kind}/${encodeURIComponent(poemId)}`, {
        method: turnOn ? 'PUT' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Expired / invalid login: sign out locally instead of leaving buttons that cannot work.
        clearStoredSession();
        setToken(null);
        setState(INITIAL);
        showToast('सेशन समाप्त हो गया है, कृपया दोबारा लॉगिन करें', true);
        return;
      }
      if (res.ok && data?.success) {
        setState((s) => ({ ...s, [key]: turnOn }));
        showToast(turnOn ? DONE_TOAST[kind].on : DONE_TOAST[kind].off);
      } else {
        showToast(data?.message || 'कुछ गड़बड़ हुई, फिर कोशिश करें', true);
      }
    } catch {
      showToast('कुछ गड़बड़ हुई, फिर कोशिश करें', true);
    } finally {
      setPending(null);
    }
  };

  return { token, state, pending, toggle, showToast };
}

const Spinner = () => <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />;

/**
 * Save / Like toggles for a signed-in member (they feed the reader badges). Shows nothing for guests and never any counts.
 */
export function PoemMarks({ poemId }: { poemId?: string }) {
  const { token, state, pending, toggle } = usePoemMarks(poemId);
  if (!poemId || !token) return null;

  const renderPill = (kind: Kind, label: { off: string; on: string }, icon: string) => {
    const key = KEY_OF[kind];
    const active = state[key];
    const isPending = pending?.kind === kind;
    const text = isPending ? (pending!.turnOn ? PENDING_LABEL[kind].on : PENDING_LABEL[kind].off) : active ? label.on : label.off;
    // While pending, preview the target look so the click gives instant visual feedback.
    const looksActive = isPending ? pending!.turnOn : active;
    return (
      <button
        type="button"
        onClick={() => toggle(kind)}
        disabled={!!pending}
        aria-pressed={active}
        aria-busy={isPending}
        style={{ ...(looksActive ? activePill : pill), ...(pending && !isPending ? { opacity: 0.6 } : null), cursor: pending ? 'progress' : 'pointer' }}
      >
        {isPending ? <Spinner /> : <i className={`${active ? 'fas' : 'far'} ${icon}`} />} {text}
      </button>
    );
  };

  return (
    <>
      {renderPill('bookmarks', { off: 'सहेजें', on: 'सहेजी गई' }, 'fa-bookmark')}
      {renderPill('likes', { off: 'पसंद करें', on: 'पसंद की' }, 'fa-heart')}
    </>
  );
}

/**
 * Save button for list/home cards (uses the site's `.action` pill). Unlike PoemMarks it is also shown to guests:
 * tapping it sends them to the login page instead of silently doing nothing.
 */
export function PoemSaveAction({ poemId }: { poemId?: string }) {
  const { token, state, pending, toggle, showToast } = usePoemMarks(poemId);
  const router = useRouter();
  const isPending = pending?.kind === 'bookmarks';
  const saved = isPending ? pending!.turnOn : state.bookmarked;

  const onClick = () => {
    if (!token) {
      showToast('रचना सहेजने के लिए पहले लॉगिन करें');
      router.push('/login');
      return;
    }
    toggle('bookmarks');
  };

  return (
    <button
      type="button"
      className="action"
      onClick={onClick}
      disabled={!!pending}
      aria-pressed={state.bookmarked}
      aria-busy={isPending}
      style={{ border: 'none', font: 'inherit', cursor: pending ? 'progress' : 'pointer', ...(saved ? { background: 'var(--accent)', color: 'white' } : null) }}
    >
      {isPending ? <Spinner /> : <i className={`${state.bookmarked ? 'fas' : 'far'} fa-bookmark`} />}{' '}
      {isPending ? PENDING_LABEL.bookmarks[pending!.turnOn ? 'on' : 'off'] : state.bookmarked ? 'सहेजी गई' : 'सहेजें'}
    </button>
  );
}

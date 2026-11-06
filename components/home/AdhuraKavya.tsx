'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, DEFAULT_AVATAR, authorHref } from '@/lib/mehfil';
import { getActiveToken, loginUrlWithNext } from '@/lib/auth';
import { useToast } from '@/components/site/ToastProvider';

const MAX_LINE = 200;

interface KavyaAuthor {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profilePic?: string;
}

interface AdhuraToday {
  dateKey: string;
  firstLine: string;
  closed: boolean;
}

interface PreviousKavya {
  dateKey: string;
  firstLine: string;
  secondLine: string;
  author: KavyaAuthor | null;
}

function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextLocalMidnightDelay(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 250);
  return Math.max(1000, next.getTime() - now.getTime());
}

/** आज का अधूरा काव्य: today's first line + a box for logged-in members, and the previous couplet with its poet. */
export function AdhuraKavya() {
  const { showToast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState<AdhuraToday | null>(null);
  const [previous, setPrevious] = useState<PreviousKavya | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [line, setLine] = useState('');
  const [savedLine, setSavedLine] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editedRef = useRef(false);

  const load = useCallback(async () => {
    const token = getActiveToken();
    setLoggedIn(!!token);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/daily/adhura-kavya?date=${encodeURIComponent(localDateKey())}`,
        { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      const data = await response.json();
      if (data.success) {
        setToday((data.today as AdhuraToday | null) || null);
        setPrevious((data.previous as PreviousKavya | null) || null);
        const mine = typeof data.mine?.line === 'string' ? data.mine.line : '';
        setSavedLine(mine);
        // Don't overwrite what the member is currently typing when the card refreshes in the background.
        if (!editedRef.current) setLine(mine);
      }
    } catch (error) {
      console.error('Failed to load Adhura Kavya:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;
      editedRef.current = false;
      await load();
      if (cancelled) return;
      timerRef.current = setTimeout(refresh, nextLocalMidnightDelay());
    };
    refresh();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!today || submitting) return;
    const token = getActiveToken();
    if (!token) {
      setLoggedIn(false);
      showToast('✍️ कृपया पहले प्रवेश करें।', true);
      return;
    }
    const text = line.trim();
    if (text.length < 2) {
      showToast('✍️ कृपया अगली पंक्ति लिखें।', true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/daily/adhura-kavya/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dateKey: today.dateKey, line: text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        showToast(data.message || 'पंक्ति भेजी नहीं जा सकी। कृपया दोबारा प्रयास करें।', true);
        if (response.status === 409) load();
        return;
      }
      setSavedLine(text);
      setLine(text);
      editedRef.current = false;
      showToast('✍️ आपकी पंक्ति भेज दी गई है।');
    } catch {
      showToast('पंक्ति भेजी नहीं जा सकी। कृपया दोबारा प्रयास करें।', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Nothing to show yet (not configured and no earlier couplet): keep the homepage exactly as before.
  if (!loaded || (!today && !previous)) return null;

  const authorName = previous?.author
    ? `${previous.author.firstName || ''} ${previous.author.lastName || ''}`.trim() || previous.author.username || ''
    : '';
  const unchanged = !!savedLine && line.trim() === savedLine;

  return (
    <section
      className={`daily-card adhura-card${today && previous ? '' : ' adhura-single'}`}
      aria-labelledby="adhura-heading"
    >
      <header className="daily-head">
        <span className="daily-kicker">Complete the Couplet</span>
        <h2 id="adhura-heading" className="daily-title">आज का अधूरा काव्य</h2>
      </header>

      <div className="adhura-body">
        {today ? (
          <div className="adhura-today">
            <p className="adhura-first">{today.firstLine}</p>
            <p className="adhura-blank" aria-hidden="true">………………………</p>

            {today.closed ? (
              <p className="adhura-note">आज की प्रविष्टियाँ बंद हो चुकी हैं। चुनी गई पंक्ति अगले दिन &ldquo;पिछला काव्य&rdquo; में दिखेगी।</p>
            ) : loggedIn ? (
              <form className="adhura-form" onSubmit={submit}>
                <label htmlFor="adhura-input" className="adhura-label">आपकी अगली पंक्ति</label>
                <textarea
                  id="adhura-input"
                  className="adhura-input"
                  rows={2}
                  maxLength={MAX_LINE}
                  value={line}
                  placeholder="इस पंक्ति को अपने शब्दों में पूरा कीजिए…"
                  onChange={(e) => { editedRef.current = true; setLine(e.target.value); }}
                />
                <div className="adhura-actions">
                  <span className="adhura-count">{line.length}/{MAX_LINE}</span>
                  <button type="submit" className="adhura-submit" disabled={submitting || !line.trim() || unchanged}>
                    {submitting ? 'भेजा जा रहा है…' : savedLine ? 'पंक्ति बदलें' : 'पंक्ति भेजें'}
                  </button>
                </div>
                {savedLine ? <p className="adhura-note">✓ आपकी पंक्ति भेजी जा चुकी है। आप चाहें तो इसे बदल सकते हैं।</p> : null}
              </form>
            ) : (
              <p className="adhura-note">
                पंक्ति पूरी करने के लिए{' '}
                <Link href={loginUrlWithNext('/')} className="adhura-login">प्रवेश करें</Link>।
                सबसे अच्छी पंक्ति रचनाकार के नाम और प्रोफ़ाइल के साथ दिखाई जाएगी।
              </p>
            )}
          </div>
        ) : null}

        {previous ? (
          <div className="adhura-prev">
            <span className="adhura-prev-kicker">पिछला काव्य</span>
            <p className="adhura-prev-line">{previous.firstLine}</p>
            <p className="adhura-prev-line">{previous.secondLine}</p>
            {previous.author ? (
              <Link href={authorHref(previous.author)} className="adhura-poet" aria-label={`${authorName} की प्रोफ़ाइल देखें`}>
                <img
                  src={previous.author.profilePic || DEFAULT_AVATAR}
                  alt={authorName}
                  width={44}
                  height={44}
                  decoding="async"
                  loading="lazy"
                  onError={(e) => { if (e.currentTarget.src !== DEFAULT_AVATAR) e.currentTarget.src = DEFAULT_AVATAR; }}
                />
                <span className="adhura-poet-name">{authorName}</span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

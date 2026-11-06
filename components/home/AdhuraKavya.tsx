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
  id: string;
  dateKey: string;
  firstLine: string;
  closesAt: string;
  closed: boolean;
  /** Present only after submissions closed AND the admin picked the best line. */
  selected: { secondLine: string; author: KavyaAuthor | null } | null;
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

/** "रात 8:00 बजे" style label for the closing time (23:59:59 is shown as midnight). */
function closeTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  let m = d.getMinutes();
  if (h === 23 && m === 59) { h = 24; m = 0; }
  const period = h >= 19 || h < 4 ? 'रात' : h < 12 ? 'सुबह' : h < 16 ? 'दोपहर' : 'शाम';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}:${String(m).padStart(2, '0')} बजे`;
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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      }
    } catch (error) {
      console.error('Failed to load Adhura Kavya:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  // A different entry (e.g. the admin added a new one) starts with an empty box.
  const todayId = today?.id;
  useEffect(() => {
    setLine('');
  }, [todayId]);

  // When submissions are open, reload exactly when they close so the card flips without a page refresh.
  useEffect(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (!today || today.closed) return;
    const delay = new Date(today.closesAt).getTime() - Date.now() + 500;
    if (!Number.isFinite(delay) || delay <= 0 || delay > 2_147_000_000) return;
    closeTimerRef.current = setTimeout(load, delay);
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [today, load]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;
      await load();
      if (cancelled) return;
      timerRef.current = setTimeout(refresh, nextLocalMidnightDelay());
    };
    refresh();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    // A new entry added by the admin during the day shows up without a manual refresh.
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(poll);
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
        body: JSON.stringify({ entryId: today.id, line: text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        showToast(data.message || 'पंक्ति भेजी नहीं जा सकी। कृपया दोबारा प्रयास करें।', true);
        if (response.status === 409) load();
        return;
      }
      setSavedLine(text);
      setLine(text);
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
  const closeLabel = today ? closeTimeLabel(today.closesAt) : '';
  const todayAuthorName = today?.selected?.author
    ? `${today.selected.author.firstName || ''} ${today.selected.author.lastName || ''}`.trim() || today.selected.author.username || ''
    : '';

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
            {today.closed && today.selected ? (
              <>
                <p className="adhura-first adhura-second">{today.selected.secondLine}</p>
                {today.selected.author ? (
                  <>
                  <span className="adhura-poet-label">चयनित पंक्ति के रचनाकार</span>
                  <Link href={authorHref(today.selected.author)} className="adhura-poet" aria-label={`${todayAuthorName} की प्रोफ़ाइल देखें`}>
                    <img
                      src={today.selected.author.profilePic || DEFAULT_AVATAR}
                      alt={todayAuthorName}
                      width={44}
                      height={44}
                      decoding="async"
                      loading="lazy"
                      onError={(e) => { if (e.currentTarget.src !== DEFAULT_AVATAR) e.currentTarget.src = DEFAULT_AVATAR; }}
                    />
                    <span className="adhura-poet-name">{todayAuthorName}</span>
                  </Link>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <p className="adhura-blank" aria-hidden="true">………………………</p>
                {today.closed ? (
                  <p className="adhura-note">आज की प्रविष्टियाँ बंद हो चुकी हैं। चुनी गई पंक्ति और रचनाकार का नाम जल्द यहाँ दिखाया जाएगा।</p>
                ) : loggedIn ? (
                  savedLine ? (
                    <div className="adhura-mine">
                      <span className="adhura-label">आपकी भेजी हुई पंक्ति</span>
                      <p className="adhura-mine-line">{savedLine}</p>
                      <p className="adhura-note">✓ आपकी पंक्ति भेज दी गई है। प्रविष्टियाँ आज {closeLabel} बंद होंगी।</p>
                    </div>
                  ) : (
                    <form className="adhura-form" onSubmit={submit}>
                      <label htmlFor="adhura-input" className="adhura-label">आपकी अगली पंक्ति (एक बार ही भेजी जा सकती है)</label>
                      <textarea
                        id="adhura-input"
                        className="adhura-input"
                        rows={2}
                        maxLength={MAX_LINE}
                        value={line}
                        placeholder="इस पंक्ति को अपने शब्दों में पूरा कीजिए…"
                        onChange={(e) => setLine(e.target.value)}
                      />
                      <div className="adhura-actions">
                        <span className="adhura-count">{line.length}/{MAX_LINE}</span>
                        <button type="submit" className="adhura-submit" disabled={submitting || !line.trim()}>
                          {submitting ? 'भेजा जा रहा है…' : 'पंक्ति भेजें'}
                        </button>
                      </div>
                      <p className="adhura-note">प्रविष्टियाँ आज {closeLabel} बंद होंगी।</p>
                    </form>
                  )
                ) : (
                  <p className="adhura-note">
                    पंक्ति पूरी करने के लिए{' '}
                    <Link href={loginUrlWithNext('/')} className="adhura-login">प्रवेश करें</Link>।
                    सबसे अच्छी पंक्ति रचनाकार के नाम और प्रोफ़ाइल के साथ दिखाई जाएगी। प्रविष्टियाँ आज {closeLabel} बंद होंगी।
                  </p>
                )}
              </>
            )}
          </div>
        ) : null}

        {previous ? (
          <div className="adhura-prev">
            <span className="adhura-prev-kicker">पिछला काव्य</span>
            <p className="adhura-prev-line">{previous.firstLine}</p>
            <p className="adhura-prev-line">{previous.secondLine}</p>
            {previous.author ? (
              <>
              <span className="adhura-poet-label">पिछली प्रविष्टि के रचनाकार</span>
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
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

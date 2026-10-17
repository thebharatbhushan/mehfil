'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/mehfil';
import { MATCH_LABEL, wordPath, type DictCard } from '@/lib/dictionary';
import './dictionary.css';

const RECENT_KEY = 'mehfil_dict_recent';
const LAST_KEY = 'mehfil_dict_last';
const DEBOUNCE_MS = 250;
const MAX_QUERY = 80;

type Status = 'idle' | 'loading' | 'done' | 'error';

// localStorage can throw (private mode, blocked storage): every access is guarded and the UI works without it.
const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 6) : [];
  } catch { return []; }
};
const writeRecent = (list: string[]) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* ignore */ } };

/** Highlights `query` inside `text` using plain React nodes (never HTML), so user input can never inject markup. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q || !text) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let i = lower.indexOf(needle);
  if (i === -1) return <>{text}</>;
  while (i !== -1) {
    if (i > from) parts.push(text.slice(from, i));
    parts.push(<mark key={i} className="dict-hl">{text.slice(i, i + needle.length)}</mark>);
    from = i + needle.length;
    i = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts.map((p, k) => <Fragment key={k}>{p}</Fragment>)}</>;
}

export function WordCard({ card, query = '', id, selected, onOpen }: { card: DictCard; query?: string; id?: string; selected?: boolean; onOpen?: () => void }) {
  const m = card.matchedOn;
  const showMatch = !!m && m.type !== 'exact';
  const others = [...card.variants.hindi, ...card.variants.roman].filter((v) => v !== card.canonicalWord).slice(0, 5);
  return (
    <Link href={wordPath(card.slug)} id={id} role={id ? 'option' : undefined} className="dict-card" aria-selected={selected || undefined} onClick={onOpen} prefetch={false}>
      <div>
        <div className="dict-card-word">
          <Highlight text={card.canonicalWord} query={query} />
          {card.partOfSpeech && <span className="dict-pos">{card.partOfSpeech}</span>}
        </div>
      </div>
      {card.urdu && <div className="dict-card-urdu" lang="ur" dir="rtl"><Highlight text={card.urdu} query={query} /></div>}
      <div className="dict-card-body">
        {showMatch && m && (
          <span className={`dict-badge${m.type === 'typo' ? ' is-typo' : ''}`}>
            {MATCH_LABEL[m.type]}: <span lang={m.language === 'en' ? 'en' : m.language} dir={m.language === 'ur' ? 'rtl' : undefined}><Highlight text={m.text} query={query} /></span>
            {m.note ? ` (${m.note})` : ''}
          </span>
        )}
        {card.meaning && <p className="dict-card-meaning"><Highlight text={card.meaning} query={query} /></p>}
        {(others.length > 0 || card.english.length > 0) && (
          <div className="dict-chips">
            {others.map((v) => <span key={v} className="dict-chip is-roman"><Highlight text={v} query={query} /></span>)}
            {card.english.map((v) => <span key={v} lang="en" className="dict-chip is-en"><Highlight text={v} query={query} /></span>)}
          </div>
        )}
      </div>
    </Link>
  );
}

export function DictionarySearch({ featured }: { featured: DictCard[] }) {
  const router = useRouter();
  const uid = useId();
  const listId = `${uid}-results`;
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0); // only the newest request may update the screen
  const abortRef = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, DictCard[]>());

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<DictCard[]>([]);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [searched, setSearched] = useState('');

  const trimmed = query.replace(/\s+/g, ' ').trim();

  const remember = useCallback((q: string) => {
    const clean = q.trim();
    if (!clean) return;
    const next = [clean, ...readRecent().filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    writeRecent(next);
    setRecent(next);
    try { sessionStorage.setItem(LAST_KEY, clean); } catch { /* ignore */ }
  }, []);

  const run = useCallback(async (q: string) => {
    const id = ++reqId.current;
    abortRef.current?.abort();
    const hit = cache.current.get(q);
    if (hit) { setResults(hit); setSearched(q); setStatus('done'); setActive(-1); return; }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE_URL}/api/dictionary/search?q=${encodeURIComponent(q)}&limit=12`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { results?: DictCard[] };
      if (id !== reqId.current) return; // a newer search started meanwhile
      const list = Array.isArray(data.results) ? data.results : [];
      if (cache.current.size > 40) cache.current.clear();
      cache.current.set(q, list);
      setResults(list); setSearched(q); setStatus('done'); setActive(-1);
    } catch (e) {
      if ((e as Error).name === 'AbortError' || id !== reqId.current) return;
      setStatus('error');
    }
  }, []);

  // Restore ?q= (shared links / back button) and the recent list once on mount.
  useEffect(() => {
    setRecent(readRecent());
    try {
      const q = new URLSearchParams(window.location.search).get('q');
      if (q) setQuery(q.slice(0, MAX_QUERY));
    } catch { /* ignore */ }
  }, []);

  // Debounced live search.
  useEffect(() => {
    if (!trimmed) {
      reqId.current++; abortRef.current?.abort();
      setStatus('idle'); setResults([]); setActive(-1); setSearched('');
      try { window.history.replaceState(null, '', window.location.pathname); } catch { /* ignore */ }
      return;
    }
    const t = setTimeout(() => {
      void run(trimmed);
      try { window.history.replaceState(null, '', `${window.location.pathname}?q=${encodeURIComponent(trimmed)}`); } catch { /* ignore */ }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive((a) => (a <= 0 ? results.length - 1 : a - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[active >= 0 ? active : 0];
      if (pick && status === 'done' && searched === trimmed) { remember(trimmed); router.push(wordPath(pick.slug)); }
      else if (trimmed) { void run(trimmed); }
    } else if (e.key === 'Escape') { setQuery(''); }
  };

  const clear = () => { setQuery(''); inputRef.current?.focus(); };
  const clearRecent = () => { writeRecent([]); setRecent([]); };
  const useRecent = (q: string) => { setQuery(q); inputRef.current?.focus(); };

  const chips = useMemo(() => featured.slice(6), [featured]);
  const topCards = useMemo(() => featured.slice(0, 6), [featured]);
  const showResults = trimmed.length > 0;
  const stale = showResults && searched !== trimmed;

  const liveText =
    status === 'loading' ? 'खोज रहे हैं…' :
    status === 'error' ? 'खोज में समस्या आई।' :
    status === 'done' && !stale ? (results.length ? `${results.length} परिणाम मिले` : 'कोई परिणाम नहीं मिला') : '';

  return (
    <>
      <div className="dict-search" role="search">
        <div className="dict-search-box">
          <i className="fas fa-search dict-search-icon" aria-hidden="true" />
          <label htmlFor={`${uid}-q`} className="dict-sr">शब्द खोजें — हिंदी, اردو, Roman या English</label>
          <input
            id={`${uid}-q`}
            ref={inputRef}
            className="dict-input"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={MAX_QUERY}
            placeholder="शब्द खोजें… इंतज़ार · انتظار · intezaar · wait"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showResults && results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
          />
          {status === 'loading' && <span className="dict-spin" role="status" aria-label="खोज रहे हैं" />}
          {query && <button type="button" className="dict-icon-btn" onClick={clear} aria-label="खोज साफ़ करें"><i className="fas fa-times" aria-hidden="true" /></button>}
        </div>
        <p className="dict-hint">हिंदी, उर्दू, Roman या English — किसी भी लिपि में खोजें</p>
        <p className="dict-sr" aria-live="polite">{liveText}</p>
      </div>

      {!showResults && recent.length > 0 && (
        <div className="dict-recent">
          <span className="dict-recent-label">हाल की खोज:</span>
          {recent.map((r) => <button key={r} type="button" className="dict-chip-btn" onClick={() => useRecent(r)}>{r}</button>)}
          <button type="button" className="dict-link" onClick={clearRecent}>साफ़ करें</button>
        </div>
      )}

      {showResults ? (
        <section aria-label="खोज परिणाम">
          {status === 'error' && (
            <div className="dict-error" role="alert">
              <h2>खोज अभी नहीं हो सकी</h2>
              <p>सर्वर से संपर्क नहीं हो पाया। कृपया थोड़ी देर में फिर कोशिश करें।</p>
              <button type="button" className="dict-btn" onClick={() => void run(trimmed)}>फिर कोशिश करें</button>
            </div>
          )}
          {status === 'loading' && results.length === 0 && <p className="dict-status">खोज रहे हैं…</p>}
          {status !== 'error' && results.length > 0 && (
            <ul id={listId} role="listbox" aria-label="शब्द परिणाम" className="dict-results" style={stale ? { opacity: 0.6 } : undefined}>
              {results.map((c, i) => (
                <li key={c.slug} role="presentation">
                  <WordCard card={c} query={searched} id={`${uid}-opt-${i}`} selected={i === active} onOpen={() => remember(trimmed)} />
                </li>
              ))}
            </ul>
          )}
          {status === 'done' && !stale && results.length === 0 && (
            <div className="dict-empty">
              <h2>“{searched}” के लिए कोई शब्द नहीं मिला</h2>
              <p>वर्तनी बदलकर देखें, या किसी दूसरी लिपि (हिंदी / اردو / Roman) में लिखें। अभी शब्दकोश बढ़ रहा है — हो सकता है यह शब्द जल्द जुड़े।</p>
              <Link href="/feedback" className="dict-btn is-ghost">इस शब्द का सुझाव दें</Link>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="dict-section" aria-labelledby={`${uid}-feat`}>
            <div className="dict-section-head">
              <h2 id={`${uid}-feat`}>चुनिंदा शब्द</h2>
              <p>मेहफ़िल के शब्दकोश से</p>
            </div>
            {topCards.length > 0 ? (
              <ul className="dict-grid">{topCards.map((c) => <li key={c.slug}><WordCard card={c} /></li>)}</ul>
            ) : (
              <div className="dict-empty"><h2>शब्दकोश जल्द ही भरेगा</h2><p>अभी कोई प्रकाशित शब्द उपलब्ध नहीं है। कृपया बाद में देखें।</p></div>
            )}
          </section>

          {chips.length > 0 && (
            <section className="dict-section" aria-labelledby={`${uid}-lit`}>
              <div className="dict-section-head"><h2 id={`${uid}-lit`}>साहित्यिक शब्दावली</h2><p>और शब्द खोजें</p></div>
              <div className="dict-chips">
                {chips.map((c) => (
                  <Link key={c.slug} href={wordPath(c.slug)} className="dict-chip" prefetch={false}>
                    {c.canonicalWord}
                    {c.urdu && <span lang="ur" dir="rtl">{c.urdu}</span>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="dict-section">
            <div className="dict-promo">
              <div>
                <h3>आज का लफ़्ज़</h3>
                <p>हर दिन एक नया लफ़्ज़ — अर्थ, व्याख्या और उदाहरण के साथ, मेहफ़िल के मुखपृष्ठ पर।</p>
              </div>
              <Link href="/" className="dict-btn">आज का लफ़्ज़ देखें</Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}

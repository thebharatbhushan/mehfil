'use client';

import { useMemo, useState } from 'react';

export interface FaqItem { q: string; a: string }

/** Searchable accordion. All answers are in the server-rendered HTML; search only hides non-matching items. */
export function FaqClient({ faqs }: { faqs: FaqItem[] }) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const t = query.trim().toLowerCase();
    return t ? faqs.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(t)) : faqs;
  }, [faqs, query]);

  return (
    <>
      <div className="lg-search">
        <i className="fas fa-search" aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="अपना सवाल खोजें…" aria-label="FAQ में खोजें" />
      </div>
      <div className="lg-faq">
        {shown.map((f, i) => (
          <details key={f.q} className="lg-sec" open={i === 0 || !!query.trim() ? true : undefined}>
            <summary>
              <span className="lg-num"><i className="fas fa-question" /></span>
              <h2>{f.q}</h2>
              <i className="fas fa-chevron-down lg-chev" aria-hidden="true" />
            </summary>
            <div className="lg-sec-body"><p>{f.a}</p></div>
          </details>
        ))}
        {shown.length === 0 && <p className="lg-empty">कोई परिणाम नहीं मिला। कृपया दूसरा शब्द आज़माएँ या हमसे संपर्क करें।</p>}
      </div>
    </>
  );
}

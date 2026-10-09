'use client';

import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

export interface LegalSection { heading: string; paras?: string[]; items?: string[] }

const pad = (n: number) => String(n + 1).padStart(2, '0');

/** Collapsible (dropdown) sections + sticky table of contents with active-section highlight. */
export function LegalBody({ sections }: { sections: LegalSection[] }) {
  const refs = useRef<Array<HTMLDetailsElement | null>>([]);
  const mobileToc = useRef<HTMLDetailsElement | null>(null);
  const [active, setActive] = useState(0);
  const [allOpen, setAllOpen] = useState(true);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(Number((hit.target as HTMLElement).dataset.idx));
      },
      { rootMargin: '-18% 0px -70% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [sections.length]);

  const syncAll = () => setAllOpen(refs.current.every((d) => d?.open));

  const toggleAll = () => {
    const next = !allOpen;
    refs.current.forEach((d) => { if (d) d.open = next; });
    setAllOpen(next);
  };

  const go = (i: number) => (e: MouseEvent) => {
    e.preventDefault();
    const el = refs.current[i];
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (mobileToc.current) mobileToc.current.open = false;
    syncAll();
  };

  const tocList = (
    <ol>
      {sections.map((s, i) => (
        <li key={s.heading}>
          <a href={`#sec-${i + 1}`} className={i === active ? 'on' : ''} onClick={go(i)}>
            <span>{pad(i)}</span>{s.heading}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="lg-layout">
      <aside className="lg-toc" aria-label="विषय-सूची">
        <div className="lg-toc-title"><i className="fas fa-list-ul" /> विषय-सूची</div>
        {tocList}
      </aside>

      <div className="lg-main">
        <details className="lg-toc-m" ref={mobileToc}>
          <summary><i className="fas fa-list-ul" /> विषय-सूची <i className="fas fa-chevron-down lg-chev" /></summary>
          {tocList}
        </details>

        <div className="lg-tools">
          <span>{sections.length} विषय</span>
          <button type="button" onClick={toggleAll}>
            <i className={`fas ${allOpen ? 'fa-compress-alt' : 'fa-expand-alt'}`} /> {allOpen ? 'सब बंद करें' : 'सब खोलें'}
          </button>
        </div>

        {sections.map((s, i) => (
          <details key={s.heading} id={`sec-${i + 1}`} data-idx={i} className="lg-sec" open ref={(el) => { refs.current[i] = el; }} onToggle={syncAll}>
            <summary>
              <span className="lg-num">{pad(i)}</span>
              <h2>{s.heading}</h2>
              <i className="fas fa-chevron-down lg-chev" aria-hidden="true" />
            </summary>
            <div className="lg-sec-body">
              {s.paras?.map((p) => <p key={p}>{p}</p>)}
              {s.items && <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

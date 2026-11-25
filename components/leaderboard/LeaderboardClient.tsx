'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, DEFAULT_AVATAR, authorHref } from '@/lib/mehfil';
import { frameClassName } from '@/lib/recognition';
import './leaderboard.css';

interface BoardWriter {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePic: string;
  city: string;
  profileFrame: string;
}
interface BoardEntry {
  rank: number;
  writer: BoardWriter;
  streakWeeks: number;
  tags: string[];
}
interface Board {
  weekStart: string;
  weekEnd: string;
  topWriters: BoardEntry[];
  risingWriters: BoardEntry[];
}

type WeekKey = 'current' | 'last';

const fmt = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' });
};

function Entry({ e, rising }: { e: BoardEntry; rising?: boolean }) {
  const w = e.writer;
  const name = `${w.firstName} ${w.lastName}`.trim() || 'मेहफ़िल रचनाकार';
  return (
    <li className={`lb-row${!rising && e.rank <= 3 ? ` lb-top-${e.rank}` : ''}`}>
      <span className="lb-rank" aria-label={`स्थान ${e.rank}`}>{rising ? <i className="fas fa-arrow-up" aria-hidden="true" /> : e.rank}</span>
      <Link href={authorHref(w)} className={`lb-avatar${frameClassName(w.profileFrame)}`}>
        <img src={w.profilePic || DEFAULT_AVATAR} alt="" width={48} height={48} loading="lazy" decoding="async" />
      </Link>
      <div className="lb-info">
        <Link href={authorHref(w)} className="lb-name">{name}</Link>
        <div className="lb-meta">
          {w.username && <span>@{w.username}</span>}
          {w.city && <span><i className="fas fa-map-marker-alt" aria-hidden="true" /> {w.city}</span>}
        </div>
        {e.tags.length > 0 && <div className="lb-tags">{e.tags.map((t) => <span key={t}>{t}</span>)}</div>}
      </div>
      {e.streakWeeks > 0 && (
        <span className="lb-streak" title={`${e.streakWeeks} हफ़्तों की लगातार स्ट्रीक`}>
          <i className="fas fa-fire" aria-hidden="true" /> {e.streakWeeks}
        </span>
      )}
    </li>
  );
}

export function LeaderboardClient() {
  const [week, setWeek] = useState<WeekKey>('current');
  const [board, setBoard] = useState<Board | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    fetch(`${API_BASE_URL}/api/leaderboard/weekly?week=${week}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.success) throw new Error('bad');
        setBoard({ weekStart: data.weekStart, weekEnd: data.weekEnd, topWriters: data.topWriters || [], risingWriters: data.risingWriters || [] });
        setState('ok');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setState('error');
      });
    return () => controller.abort();
  }, [week]);

  return (
    <main className="mehfil-container lb-page">
      <header className="lb-head">
        <span className="lb-kicker">हर सोमवार नया हफ़्ता</span>
        <h1>साप्ताहिक लीडरबोर्ड</h1>
        <p>हर हफ़्ते के शीर्ष और उभरते रचनाकार — लिखने की निरंतरता, पाठकों के जुड़ाव और सराहना को मिलाकर चुने गए। लाइक की गिनती कहीं नहीं दिखाई जाती।</p>
        <div className="lb-tabs" role="tablist" aria-label="सप्ताह चुनिए">
          <button role="tab" aria-selected={week === 'current'} className={week === 'current' ? 'is-active' : ''} onClick={() => setWeek('current')}>इस हफ़्ते</button>
          <button role="tab" aria-selected={week === 'last'} className={week === 'last' ? 'is-active' : ''} onClick={() => setWeek('last')}>पिछले हफ़्ते</button>
        </div>
        {board && state === 'ok' && <div className="lb-range">{fmt(board.weekStart)} – {fmt(board.weekEnd)}</div>}
      </header>

      {state === 'loading' && <p className="lb-note" role="status">लोड हो रहा है…</p>}
      {state === 'error' && <p className="lb-note" role="alert">लीडरबोर्ड अभी नहीं खुल सका। कृपया थोड़ी देर बाद फिर कोशिश कीजिए।</p>}

      {state === 'ok' && board && (
        <div className="lb-grid">
          <section className="lb-card" aria-labelledby="lb-top">
            <h2 id="lb-top"><i className="fas fa-crown" aria-hidden="true" /> शीर्ष रचनाकार</h2>
            {board.topWriters.length ? (
              <ol className="lb-list">{board.topWriters.map((e) => <Entry key={e.writer._id} e={e} />)}</ol>
            ) : (
              <p className="lb-empty">{week === 'current' ? 'इस हफ़्ते की सूची बन रही है। एक रचना लिखिए और जगह बनाइए!' : 'उस हफ़्ते की सूची उपलब्ध नहीं है।'}</p>
            )}
          </section>
          <section className="lb-card" aria-labelledby="lb-rising">
            <h2 id="lb-rising"><i className="fas fa-seedling" aria-hidden="true" /> उभरते रचनाकार</h2>
            <p className="lb-sub">जिनका यह हफ़्ता पिछले हफ़्ते से कहीं बेहतर रहा।</p>
            {board.risingWriters.length ? (
              <ol className="lb-list">{board.risingWriters.map((e) => <Entry key={e.writer._id} e={e} rising />)}</ol>
            ) : (
              <p className="lb-empty">अभी कोई उभरता नाम नहीं — अगला नाम आपका हो सकता है।</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default LeaderboardClient;

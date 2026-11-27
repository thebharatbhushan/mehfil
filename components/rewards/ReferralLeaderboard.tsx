'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_AVATAR, authorHref } from '@/lib/mehfil';
import { frameClassName } from '@/lib/recognition';
import { BoardRow, rewardsApi } from '@/lib/referral';
import { RewardBadgeIcon } from './RewardBadgeIcon';

type Period = 'monthly' | 'all';

export function ReferralLeaderboard() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [pages, setPages] = useState(1);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    rewardsApi<{ items: BoardRow[]; totalPages: number }>(`/referral/leaderboard?period=${period}&page=${page}&limit=20`, {}, false).then((r) => {
      if (!alive) return;
      if (r.ok && r.data) { setRows(r.data.items); setPages(r.data.totalPages); setState('ok'); } else setState('error');
    });
    return () => { alive = false; };
  }, [period, page]);

  return (
    <div className="rw-card">
      <div className="rw-tabs rw-tabs-sm" role="tablist" aria-label="अवधि">
        <button role="tab" aria-selected={period === 'monthly'} className={period === 'monthly' ? 'is-active' : ''} onClick={() => { setPeriod('monthly'); setPage(1); }}>इस महीने</button>
        <button role="tab" aria-selected={period === 'all'} className={period === 'all' ? 'is-active' : ''} onClick={() => { setPeriod('all'); setPage(1); }}>सर्वकालिक</button>
      </div>
      {state === 'loading' && <p className="rw-note" role="status">लोड हो रहा है…</p>}
      {state === 'error' && <p className="rw-note" role="alert">लीडरबोर्ड नहीं खुल सका। कृपया बाद में कोशिश कीजिए।</p>}
      {state === 'ok' && !rows.length && <p className="rw-empty">{period === 'monthly' ? 'इस महीने अभी कोई सफल रेफ़रल नहीं — पहला नाम आपका हो सकता है!' : 'अभी सूची खाली है।'}</p>}
      {state === 'ok' && rows.length > 0 && (
        <ol className="rw-board">
          {rows.map((r) => {
            const w = r.writer;
            const name = `${w.firstName} ${w.lastName}`.trim() || 'मेहफ़िल रचनाकार';
            return (
              <li key={w._id} className={r.rank <= 3 && page === 1 ? `top-${r.rank}` : ''}>
                <span className="rw-rank" aria-label={`स्थान ${r.rank}`}>{r.rank}</span>
                <Link href={authorHref(w)} className={`rw-avatar rw-avatar-xs${frameClassName(w.profileFrame)}`}>
                  <img src={w.profilePic || DEFAULT_AVATAR} alt="" width={44} height={44} loading="lazy" decoding="async" />
                </Link>
                <div className="rw-board-info">
                  <Link href={authorHref(w)}>{name}</Link>
                  <small>{r.successfulReferrals} सफल रेफ़रल · {r.xpFromReferrals} XP</small>
                </div>
                {r.badge && <RewardBadgeIcon badgeKey={r.badge.key} icon={r.badge.icon} name={r.badge.name} />}
              </li>
            );
          })}
        </ol>
      )}
      {pages > 1 && (
        <div className="rw-pager">
          <button className="rw-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>पिछला</button>
          <span>{page} / {pages}</span>
          <button className="rw-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>अगला</button>
        </div>
      )}
    </div>
  );
}

export default ReferralLeaderboard;

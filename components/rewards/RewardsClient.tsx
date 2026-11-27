'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getActiveToken, loginUrlWithNext } from '@/lib/auth';
import { ReferEarn } from './ReferEarn';
import { MyBadges } from './MyBadges';
import { MyFrames } from './MyFrames';
import { ReferralLeaderboard } from './ReferralLeaderboard';
import { DailyStreak } from './DailyStreak';
import './rewards.css';

type Tab = 'streak' | 'refer' | 'badges' | 'frames' | 'board';
const TABS: { id: Tab; label: string; icon: string; members: boolean }[] = [
  { id: 'streak', label: 'Daily Streak', icon: 'fa-fire', members: true },
  { id: 'refer', label: 'Refer & Earn', icon: 'fa-user-plus', members: true },
  { id: 'badges', label: 'My Badges', icon: 'fa-medal', members: true },
  { id: 'frames', label: 'My Frames', icon: 'fa-circle-notch', members: true },
  { id: 'board', label: 'Referral Leaderboard', icon: 'fa-trophy', members: false },
];

export function RewardsClient() {
  const [tab, setTab] = useState<Tab>('streak');
  const [member, setMember] = useState<boolean | null>(null);

  useEffect(() => {
    setMember(!!getActiveToken());
    const hash = window.location.hash.replace('#', '') as Tab;
    if (TABS.some((t) => t.id === hash)) setTab(hash);
  }, []);

  const select = (t: Tab) => {
    setTab(t);
    try { window.history.replaceState(null, '', `#${t}`); } catch { /* ignore */ }
  };
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <main className="mehfil-container rw-page">
      <header className="rw-head">
        <span className="rw-kicker">मेहफ़िल का इनाम-घर</span>
        <h1>Mehfil Rewards</h1>
        <p>दोस्तों को जोड़िए, लिखते रहिए — और XP, बैज व प्रोफ़ाइल फ़्रेम कमाइए।</p>
      </header>

      <div className="rw-tabs" role="tablist" aria-label="Mehfil Rewards">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => select(t.id)}>
            <i className={`fas ${t.icon}`} aria-hidden="true" /> <span>{t.label}</span>
          </button>
        ))}
      </div>

      {member === null && <p className="rw-note" role="status">लोड हो रहा है…</p>}
      {member === false && current.members && (
        <div className="rw-card rw-center">
          <h2>पहले प्रवेश कीजिए</h2>
          <p>अपना रेफ़रल लिंक, बैज और फ़्रेम देखने के लिए लॉगिन ज़रूरी है।</p>
          <Link className="rw-btn rw-btn-primary" href={loginUrlWithNext('/rewards')}>प्रवेश करें</Link>
        </div>
      )}
      {member !== null && (member || !current.members) && (
        <section aria-live="polite">
          {tab === 'streak' && <DailyStreak />}
          {tab === 'refer' && <ReferEarn />}
          {tab === 'badges' && <MyBadges />}
          {tab === 'frames' && <MyFrames />}
          {tab === 'board' && <ReferralLeaderboard />}
        </section>
      )}
    </main>
  );
}

export default RewardsClient;

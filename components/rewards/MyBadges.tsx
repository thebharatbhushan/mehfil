'use client';

import { useEffect, useState } from 'react';
import { RewardBadge, rewardsApi } from '@/lib/referral';
import { RewardBadgeIcon } from './RewardBadgeIcon';

/** Human-readable unlock condition for the member's OWN badge view. */
export function conditionText(b: RewardBadge): string {
  const t = b.condition.threshold;
  switch (b.condition.type) {
    case 'referral_count': return `${t} सफल रेफ़रल`;
    case 'xp_threshold': return `${t} XP अर्जित करें`;
    case 'poem_count':
    case 'eligible_poem_count': return `${t} रचनाएँ प्रकाशित करें`;
    case 'poem_streak_weeks': return `${t} हफ़्ते लगातार लिखें`;
    case 'eligible_poem_days': return `${t} अलग-अलग दिन रचनाएँ प्रकाशित करें`;
    case 'distinct_readers': return `${t} अलग पाठक आपकी रचनाएँ पढ़ें`;
    case 'reading_days': return `${t} दिन मन लगाकर पढ़ें`;
    case 'poems_read': return `${t} रचनाएँ पढ़ें`;
    case 'poems_bookmarked': return `${t} रचनाएँ सहेजें`;
    case 'poems_appreciated': return `${t} रचनाएँ पसंद करें`;
    case 'verified_suggestions': return 'उपयोगी सुझाव दें, जिसे टीम स्वीकार करे';
    case 'verified_contributions': return `${t} सत्यापित योगदान`;
    case 'verified_bugs': return `${t} सत्यापित बग रिपोर्ट`;
    case 'early_supporter': return 'मेहफ़िल के शुरुआती दौर में जुड़ें';
    default: return 'मेहफ़िल टीम द्वारा विशेष रूप से प्रदान किया जाता है';
  }
}

export function MyBadges() {
  const [badges, setBadges] = useState<RewardBadge[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [open, setOpen] = useState<string | null>(null);

  const load = () => {
    setState('loading');
    rewardsApi<{ badges: RewardBadge[] }>('/badges').then((r) => {
      if (r.ok && r.data) { setBadges(r.data.badges); setState('ok'); } else setState('error');
    });
  };
  useEffect(load, []);

  if (state === 'loading') return <p className="rw-note" role="status">लोड हो रहा है…</p>;
  if (state === 'error') return <div className="rw-card rw-center" role="alert"><p>बैज नहीं खुल सके।</p><button className="rw-btn" onClick={load}>दोबारा कोशिश करें</button></div>;
  if (!badges.length) return <p className="rw-empty">अभी कोई बैज उपलब्ध नहीं है।</p>;

  const group = (g: 'referral' | 'general', title: string) => {
    const list = badges.filter((b) => b.group === g);
    if (!list.length) return null;
    return (
      <div className="rw-card">
        <h2>{title} <small>{list.filter((b) => b.unlocked).length}/{list.length}</small></h2>
        <ul className="rw-badge-grid">
          {list.map((b) => (
            <li key={b.key} className={b.unlocked ? 'is-unlocked' : 'is-locked'}>
              <button type="button" onClick={() => setOpen(open === b.key ? null : b.key)} aria-expanded={open === b.key}>
                <RewardBadgeIcon badgeKey={b.key} icon={b.icon} name={b.name} unlocked={b.unlocked} />
                <b>{b.name}</b>
                <span className="rw-pill">{b.unlocked ? 'प्राप्त' : 'लॉक्ड'}</span>
              </button>
              {open === b.key && (
                <div className="rw-detail">
                  {b.description && <p>{b.description}</p>}
                  <p><i className="fas fa-key" aria-hidden="true" /> {conditionText(b)}</p>
                  {b.progress && !b.unlocked && <p className="rw-note">{b.progress.current} / {b.progress.required}</p>}
                  {b.unlocked && b.unlockedAt && <p className="rw-note">प्राप्त: {new Date(b.unlockedAt).toLocaleDateString('hi-IN')}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return <div className="rw-stack">{group('referral', 'रेफ़रल बैज')}{group('general', 'अन्य उपलब्धियाँ')}<p className="rw-note">प्राप्त बैज आपकी सार्वजनिक प्रोफ़ाइल पर अपने-आप दिखते हैं।</p></div>;
}

export default MyBadges;

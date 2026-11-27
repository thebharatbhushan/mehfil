'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/site/ToastProvider';
import { ReferralHistoryItem, ReferralSummary, referralUrl, rewardsApi } from '@/lib/referral';
import { RewardBadgeIcon } from './RewardBadgeIcon';

const Stat = ({ label, value, icon }: { label: string; value: number | string; icon: string }) => (
  <div className="rw-stat"><i className={`fas ${icon}`} aria-hidden="true" /><b>{value}</b><span>{label}</span></div>
);

export function ReferEarn() {
  const { showToast } = useToast();
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [histState, setHistState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [busyPrivacy, setBusyPrivacy] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    const r = await rewardsApi<{ referral: ReferralSummary }>('/referral/me');
    if (r.ok && r.data) { setData(r.data.referral); setState('ok'); } else setState('error');
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let alive = true;
    setHistState('loading');
    rewardsApi<{ items: ReferralHistoryItem[]; totalPages: number }>(`/referral/history?page=${page}&limit=8`).then((r) => {
      if (!alive) return;
      if (r.ok && r.data) { setHistory(r.data.items); setPages(r.data.totalPages); setHistState('ok'); } else setHistState('error');
    });
    return () => { alive = false; };
  }, [page]);

  if (state === 'loading') return <p className="rw-note" role="status">लोड हो रहा है…</p>;
  if (state === 'error' || !data) {
    return <div className="rw-card rw-center" role="alert"><p>रेफ़रल जानकारी नहीं खुल सकी।</p><button className="rw-btn" onClick={load}>दोबारा कोशिश करें</button></div>;
  }

  const link = referralUrl(data.code);
  const text = `मेहफ़िल से जुड़िए — हिन्दी, उर्दू और अंग्रेज़ी साहित्य का घर। मेरे लिंक से जुड़ें: ${link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); showToast('✅ रेफ़रल लिंक कॉपी हो गया'); }
    catch { showToast('❌ कॉपी नहीं हो सका — लिंक को दबाकर कॉपी कीजिए', true); }
  };
  const native = async () => {
    try { await navigator.share({ title: 'Mehfil', text: 'मेहफ़िल से जुड़िए', url: link }); } catch { /* cancelled */ }
  };
  const e = encodeURIComponent;
  const shares = [
    { label: 'WhatsApp', icon: 'fa-whatsapp', brand: true, href: `https://wa.me/?text=${e(text)}` },
    { label: 'Telegram', icon: 'fa-telegram', brand: true, href: `https://t.me/share/url?url=${e(link)}&text=${e('मेहफ़िल से जुड़िए')}` },
    { label: 'Facebook', icon: 'fa-facebook-f', brand: true, href: `https://www.facebook.com/sharer/sharer.php?u=${e(link)}` },
    { label: 'X', icon: 'fa-twitter', brand: true, href: `https://twitter.com/intent/tweet?text=${e('मेहफ़िल से जुड़िए')}&url=${e(link)}` },
  ];
  const s = data.stats;
  const togglePrivacy = async () => {
    setBusyPrivacy(true);
    const r = await rewardsApi<{ showOnLeaderboard: boolean }>('/privacy', { method: 'PUT', body: JSON.stringify({ showOnLeaderboard: !data.showOnLeaderboard }) });
    setBusyPrivacy(false);
    if (r.ok && r.data) { setData({ ...data, showOnLeaderboard: r.data.showOnLeaderboard }); showToast('✅ सेटिंग सहेजी गई'); }
    else showToast(`❌ ${r.message}`, true);
  };

  return (
    <div className="rw-stack">
      <div className="rw-card rw-link-card">
        <h2>आपका रेफ़रल लिंक</h2>
        <div className="rw-code">कोड: <b>{data.code}</b></div>
        <div className="rw-linkbox">
          <input readOnly value={link} aria-label="रेफ़रल लिंक" onFocus={(ev) => ev.currentTarget.select()} />
          <button className="rw-btn rw-btn-primary" onClick={copy}><i className="fas fa-copy" aria-hidden="true" /> कॉपी</button>
        </div>
        <div className="rw-shares">
          {shares.map((x) => (
            <a key={x.label} className="rw-btn rw-share" href={x.href} target="_blank" rel="noopener noreferrer">
              <i className={`${x.brand ? 'fab' : 'fas'} ${x.icon}`} aria-hidden="true" /> {x.label}
            </a>
          ))}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button className="rw-btn rw-share" onClick={native}><i className="fas fa-share-alt" aria-hidden="true" /> और</button>
          )}
        </div>
        <p className="rw-note">रेफ़रल तब सफल गिना जाता है जब आपका साथी रजिस्टर करे, ईमेल सत्यापित करे, प्रोफ़ाइल पूरी करे और अपनी पहली मौलिक रचना प्रकाशित करे।</p>
      </div>

      <div className="rw-stats">
        <Stat icon="fa-paper-plane" label="कुल आमंत्रण" value={s.totalInvited} />
        <Stat icon="fa-user-check" label="रजिस्टर्ड" value={s.registered} />
        <Stat icon="fa-hourglass-half" label="पेंडिंग" value={s.pending} />
        <Stat icon="fa-circle-check" label="सफल" value={s.successful} />
        <Stat icon="fa-pen-nib" label="सक्रिय रचनाकार" value={s.activeReferredWriters} />
        <Stat icon="fa-star" label="रेफ़रल से XP" value={s.xpEarned} />
      </div>

      <div className="rw-card">
        <h2>अगला मील का पत्थर</h2>
        {data.next ? (
          <>
            <p className="rw-next"><b>{data.next.title}</b> — {data.next.count} सफल रेफ़रल पर <b>+{data.next.xp} XP</b>{data.next.badge ? ` और ${data.next.badge.name} बैज` : ''}</p>
            <div className="rw-progress" role="progressbar" aria-valuemin={0} aria-valuemax={data.progress.target} aria-valuenow={data.progress.current}>
              <span style={{ width: `${Math.round(data.progress.fraction * 100)}%` }} />
            </div>
            <p className="rw-note">{data.progress.current} / {data.next.count} — अब बस {data.next.remaining} और!</p>
          </>
        ) : (
          <p className="rw-note">🎉 आपने सारे मील के पत्थर पूरे कर लिए हैं। शुक्रिया!</p>
        )}
        <ul className="rw-miles">
          {data.milestones.map((m) => (
            <li key={m.count} className={m.reached ? 'is-done' : ''}>
              <i className={`fas ${m.reached ? 'fa-circle-check' : 'fa-circle'}`} aria-hidden="true" />
              <span><b>{m.count}</b> रेफ़रल · {m.title}</span><em>+{m.xp} XP</em>
            </li>
          ))}
        </ul>
      </div>

      <div className="rw-card">
        <h2>अनलॉक किए गए रेफ़रल बैज</h2>
        {data.badges.length ? (
          <ul className="rw-badge-row">
            {data.badges.map((b) => (
              <li key={b.key}><RewardBadgeIcon badgeKey={b.key} icon={b.icon} name={b.name} unlocked /><span>{b.name}</span></li>
            ))}
          </ul>
        ) : <p className="rw-empty">अभी कोई रेफ़रल बैज नहीं मिला। पहला सफल रेफ़रल आपको “First Invite” दिलाएगा।</p>}
      </div>

      <div className="rw-card">
        <h2>आपके आमंत्रित साथी</h2>
        {histState === 'loading' && <p className="rw-note" role="status">लोड हो रहा है…</p>}
        {histState === 'error' && <p className="rw-note" role="alert">सूची नहीं खुल सकी।</p>}
        {histState === 'ok' && !history.length && <p className="rw-empty">अभी किसी ने आपके लिंक से रजिस्टर नहीं किया। लिंक साझा कीजिए!</p>}
        {histState === 'ok' && history.length > 0 && (
          <ul className="rw-history">
            {history.map((h) => (
              <li key={h.id}>
                <div><b>{h.name}</b><small>{new Date(h.registeredAt).toLocaleDateString('hi-IN')}</small></div>
                <span className={`rw-pill ${h.status === 'successful' ? 'is-ok' : ''}`}>{h.status === 'successful' ? 'सफल' : 'पेंडिंग'}</span>
                <div className="rw-steps" aria-label="शर्तें">
                  <i className={h.conditions.emailVerified ? 'on' : ''} title="ईमेल सत्यापित">✉</i>
                  <i className={h.conditions.profileCompleted ? 'on' : ''} title="प्रोफ़ाइल पूरी">👤</i>
                  <i className={h.conditions.poemPublished ? 'on' : ''} title="पहली रचना प्रकाशित">✍</i>
                </div>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <div className="rw-pager">
            <button className="rw-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>पिछला</button>
            <span>{page} / {pages}</span>
            <button className="rw-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>अगला</button>
          </div>
        )}
      </div>

      <label className="rw-privacy">
        <input type="checkbox" checked={data.showOnLeaderboard} disabled={busyPrivacy} onChange={togglePrivacy} />
        <span>मुझे सार्वजनिक रेफ़रल लीडरबोर्ड पर दिखाएँ</span>
      </label>
    </div>
  );
}

export default ReferEarn;

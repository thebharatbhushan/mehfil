'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/site/ToastProvider';
import { StreakData, rewardsApi } from '@/lib/referral';

const DAY_LABELS = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

/** The current IST week, Monday to Sunday. A day is "done" when it falls inside the current streak run; later days are future. */
function weekStrip(s: StreakData) {
  const out: { key: string; label: string; done: boolean; today: boolean; future: boolean }[] = [];
  const base = Date.parse(`${s.today}T12:00:00Z`);
  const last = s.lastDay ? Date.parse(`${s.lastDay}T12:00:00Z`) : NaN;
  const sinceMonday = (new Date(base).getUTCDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  for (let i = 0; i < 7; i++) {
    const t = base + (i - sinceMonday) * 86400000;
    const d = new Date(t);
    const diffFromLast = Number.isNaN(last) ? Infinity : Math.round((last - t) / 86400000);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: DAY_LABELS[d.getUTCDay()],
      done: s.current > 0 && diffFromLast >= 0 && diffFromLast < s.current,
      today: i === sinceMonday,
      future: i > sinceMonday,
    });
  }
  return out;
}

export function DailyStreak() {
  const { showToast } = useToast();
  const [data, setData] = useState<StreakData | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    const r = await rewardsApi<{ streak: StreakData }>('/streak');
    if (r.ok && r.data) { setData(r.data.streak); setState('ok'); } else setState('error');
  }, []);
  useEffect(() => { load(); }, [load]);

  const checkIn = async () => {
    if (busy) return;
    setBusy(true);
    const r = await rewardsApi<{ streak: StreakData }>('/streak/checkin', { method: 'POST' });
    setBusy(false);
    if (!r.ok || !r.data) { showToast(`❌ ${r.message}`, true); return; }
    const s = r.data.streak;
    setData(s);
    const total = (s.awarded || []).reduce((n, a) => n + a.xp, 0);
    const bonus = (s.awarded || []).find((a) => a.type === 'milestone');
    showToast(s.already ? 'आज की हाज़िरी पहले ही लग चुकी है' : bonus ? `🔥 ${bonus.days} दिन की स्ट्रीक! कुल +${total} XP` : `🔥 हाज़िरी लग गई! +${total} XP`);
    try { window.dispatchEvent(new Event('mehfil-xp-change')); } catch { /* ignore */ }
  };

  if (state === 'loading') return <p className="rw-note" role="status">लोड हो रहा है…</p>;
  if (state === 'error' || !data) return <div className="rw-card rw-center" role="alert"><p>स्ट्रीक नहीं खुल सकी।</p><button className="rw-btn" onClick={load}>दोबारा कोशिश करें</button></div>;

  const lv = data.level;
  const week = weekStrip(data);
  return (
    <div className="rw-stack">
      <div className="rw-card rw-streak-card">
        <div className="rw-flame" aria-hidden="true"><i className="fas fa-fire" /></div>
        <div className="rw-streak-num"><b>{data.current}</b> <span>दिन की स्ट्रीक</span></div>
        <ul className="rw-week" aria-label="इस हफ़्ते के दिन (सोमवार से रविवार)">
          {week.map((d) => (
            <li key={d.key} className={`${d.done ? 'is-done' : ''}${d.today ? ' is-today' : ''}${d.future ? ' is-future' : ''}`}>
              <span>{d.label}</span>
              <i className={`fas ${d.done ? 'fa-fire' : 'fa-circle'}`} aria-hidden="true" />
            </li>
          ))}
        </ul>
        <button className="rw-btn rw-btn-primary rw-checkin" onClick={checkIn} disabled={busy || data.checkedToday}>
          {data.checkedToday ? <><i className="fas fa-check" aria-hidden="true" /> आज की हाज़िरी लग चुकी है</> : <><i className="fas fa-hand-point-up" aria-hidden="true" /> आज की हाज़िरी लगाइए (+{data.dailyXp} XP)</>}
        </button>
        <p className="rw-note">रोज़ एक बार हाज़िरी लगाइए। एक दिन छूटा तो स्ट्रीक फिर 1 से शुरू होगी। दिन भारतीय समय (IST) से गिना जाता है।</p>
      </div>

      <div className="rw-stats">
        <div className="rw-stat"><i className="fas fa-fire" aria-hidden="true" /><b>{data.current}</b><span>मौजूदा स्ट्रीक</span></div>
        <div className="rw-stat"><i className="fas fa-trophy" aria-hidden="true" /><b>{data.longest}</b><span>सबसे लंबी स्ट्रीक</span></div>
        <div className="rw-stat"><i className="fas fa-calendar-check" aria-hidden="true" /><b>{data.totalDays}</b><span>कुल हाज़िरी</span></div>
      </div>

      <div className="rw-card">
        <h2>आपका XP <small>लेवल {lv.level} · {lv.title}</small></h2>
        <p className="rw-next"><b>{data.xp} XP</b>{lv.nextMin ? <> — अगला लेवल <b>{lv.nextTitle}</b> {lv.nextMin} XP पर</> : ' — सर्वोच्च लेवल 🎉'}</p>
        <div className="rw-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lv.fraction * 100)}>
          <span style={{ width: `${Math.round(lv.fraction * 100)}%` }} />
        </div>
        <p className="rw-note">आपका XP और लेवल आपकी सार्वजनिक प्रोफ़ाइल पर दिखता है।</p>
      </div>

      <div className="rw-card">
        <h2>स्ट्रीक से बोनस XP</h2>
        {data.next && <p className="rw-next">अगला बोनस: <b>{data.next.days} दिन</b> पर <b>+{data.next.xp} XP</b> — बस {data.next.remaining} दिन और!</p>}
        <ul className="rw-miles">
          {data.milestones.map((m) => (
            <li key={m.days} className={m.reached ? 'is-done' : ''}>
              <i className={`fas ${m.reached ? 'fa-circle-check' : 'fa-circle'}`} aria-hidden="true" />
              <span><b>{m.days}</b> दिन की स्ट्रीक</span><em>+{m.xp} XP</em>
            </li>
          ))}
        </ul>
      </div>

      <div className="rw-card">
        <h2>XP से क्या मिलता है?</h2>
        <ul className="rw-benefits">
          <li><i className="fas fa-medal" aria-hidden="true" /><span><b>बैज</b> — XP और स्ट्रीक के बैज अपने-आप अनलॉक होकर प्रोफ़ाइल पर दिखते हैं।</span></li>
          <li><i className="fas fa-circle-notch" aria-hidden="true" /><span><b>प्रोफ़ाइल फ़्रेम</b> — ब्रॉन्ज़ (200 XP), सिल्वर (600 XP), गोल्ड (1500 XP) जैसे फ़्रेम XP से खुलते हैं।</span></li>
          <li><i className="fas fa-level-up-alt" aria-hidden="true" /><span><b>लेवल</b> — जितना XP, उतना ऊँचा लेवल और ख़िताब, जो आपकी प्रोफ़ाइल पर दिखता है।</span></li>
        </ul>
        <p className="rw-note">XP कमाने के तरीके: रोज़ की हाज़िरी, रचनाएँ प्रकाशित करना, प्रोफ़ाइल पूरी करना और रेफ़रल।</p>
      </div>
    </div>
  );
}

export default DailyStreak;

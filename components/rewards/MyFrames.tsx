'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/site/ToastProvider';
import { getStoredUser, updateStoredUser } from '@/lib/auth';
import { DEFAULT_AVATAR } from '@/lib/mehfil';
import { frameClassName } from '@/lib/recognition';
import { FrameItem, FrameRequirement, rewardsApi } from '@/lib/referral';

function reqText(r: FrameRequirement): string {
  switch (r.type) {
    case 'referral_count': return `${r.threshold} सफल रेफ़रल`;
    case 'poem_count': return `${r.threshold} मौलिक रचनाएँ प्रकाशित करें`;
    case 'poem_streak_weeks': return `${r.threshold} हफ़्ते की लेखन स्ट्रीक`;
    case 'badge': return 'विशेष प्रतियोगिता / योगदान बैज';
    case 'manual': return 'मेहफ़िल टीम की विशेष मान्यता';
    default: return '';
  }
}

export function MyFrames() {
  const { showToast } = useToast();
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pic, setPic] = useState(DEFAULT_AVATAR);

  const load = () => {
    setState('loading');
    rewardsApi<{ frames: FrameItem[]; selected: string }>('/frames').then((r) => {
      if (r.ok && r.data) { setFrames(r.data.frames); setPreview((p) => p || r.data!.selected); setState('ok'); } else setState('error');
    });
  };
  useEffect(() => { setPic(getStoredUser()?.profilePic || DEFAULT_AVATAR); load(); }, []);

  if (state === 'loading') return <p className="rw-note" role="status">लोड हो रहा है…</p>;
  if (state === 'error') return <div className="rw-card rw-center" role="alert"><p>फ़्रेम नहीं खुल सके।</p><button className="rw-btn" onClick={load}>दोबारा कोशिश करें</button></div>;

  const shown = frames.find((f) => f.key === preview) || frames[0];
  const choose = async (f: FrameItem) => {
    setBusy(true);
    const r = await rewardsApi<{ selected: string }>('/frames/select', { method: 'PUT', body: JSON.stringify({ frameKey: f.key }) });
    setBusy(false);
    if (r.ok && r.data) {
      setFrames((list) => list.map((x) => ({ ...x, selected: x.key === r.data!.selected })));
      updateStoredUser({ profileFrame: { key: r.data.selected, name: f.name } });
      showToast(`✅ ${f.nameHi || f.name} चुना गया`);
    } else showToast(`❌ ${r.message}`, true);
  };

  return (
    <div className="rw-stack">
      <div className="rw-card rw-center">
        <div className={`rw-avatar${frameClassName(shown?.key)}`}>
          <img src={pic} alt="फ़्रेम का प्रीव्यू" width={120} height={120} decoding="async" />
        </div>
        <h2>{shown?.nameHi || shown?.name}</h2>
        {shown && !shown.unlocked && <p className="rw-note"><i className="fas fa-lock" aria-hidden="true" /> यह फ़्रेम अभी लॉक है — नीचे देखिए इसे कैसे अनलॉक करें।</p>}
        {shown?.unlocked && !shown.selected && <button className="rw-btn rw-btn-primary" disabled={busy} onClick={() => choose(shown)}>इस फ़्रेम का उपयोग करें</button>}
        {shown?.selected && <span className="rw-pill is-ok">अभी चुना हुआ</span>}
      </div>

      <ul className="rw-frame-grid">
        {frames.map((f) => (
          <li key={f.key} className={`${f.unlocked ? 'is-unlocked' : 'is-locked'}${f.key === preview ? ' is-previewed' : ''}`}>
            <button type="button" className="rw-frame-btn" onClick={() => setPreview(f.key)} aria-pressed={f.key === preview}>
              <div className={`rw-avatar rw-avatar-sm${frameClassName(f.key)}`}><img src={pic} alt="" width={64} height={64} loading="lazy" decoding="async" /></div>
              <b>{f.nameHi || f.name}</b>
              <span className={`rw-pill${f.selected ? ' is-ok' : ''}`}>{f.selected ? 'चुना हुआ' : f.unlocked ? 'अनलॉक्ड' : 'लॉक्ड'}</span>
            </button>
            <div className="rw-frame-info">
              {f.description && <p>{f.description}</p>}
              {!f.unlocked && f.requirements.length > 0 && (
                <ul>
                  <li className="rw-note">इनमें से कोई एक:</li>
                  {f.requirements.map((r, i) => (
                    <li key={i}><i className={`fas ${r.met ? 'fa-check' : 'fa-lock'}`} aria-hidden="true" /> {reqText(r)}{typeof r.current === 'number' && r.threshold ? ` (${Math.min(r.current, r.threshold)}/${r.threshold})` : ''}</li>
                  ))}
                </ul>
              )}
              {f.unlocked && !f.selected && <button className="rw-btn" disabled={busy} onClick={() => choose(f)}>चुनें</button>}
            </div>
          </li>
        ))}
      </ul>
      <p className="rw-note">चुना हुआ फ़्रेम आपकी सार्वजनिक प्रोफ़ाइल और शेयर कार्ड पर दिखता है।</p>
    </div>
  );
}

export default MyFrames;

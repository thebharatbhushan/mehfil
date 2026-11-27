'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getActiveToken } from '@/lib/auth';
import { getStoredReferralCode, rewardsApi, storeReferralCode, trackReferralVisit } from '@/lib/referral';
import '@/components/rewards/rewards.css';

/** Landing page of a referral link: /join?ref=CODE. Keeps the code, greets the visitor and sends them to signup. */
export function JoinClient() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'valid' | 'invalid' | 'member'>('loading');
  const [inviter, setInviter] = useState('');

  useEffect(() => {
    const fromUrl = storeReferralCode(new URLSearchParams(window.location.search).get('ref'));
    const code = fromUrl || getStoredReferralCode();
    if (fromUrl) trackReferralVisit(fromUrl);
    if (getActiveToken()) { setState('member'); return; }
    if (!code) { setState('invalid'); return; }
    rewardsApi<{ valid: boolean; referrerName?: string }>(`/referral/validate?code=${encodeURIComponent(code)}`, {}, false).then((r) => {
      if (r.ok && r.data?.valid) { setInviter(r.data.referrerName || ''); setState('valid'); }
      else setState('invalid');
    });
  }, []);

  return (
    <main className="mehfil-container rw-join">
      <div className="rw-card rw-join-card">
        <span className="rw-kicker">मेहफ़िल में आपका स्वागत है</span>
        {state === 'loading' && <p className="rw-note" role="status">लोड हो रहा है…</p>}
        {state === 'valid' && (
          <>
            <h1>{inviter ? `${inviter} ने आपको मेहफ़िल पर बुलाया है` : 'आपको मेहफ़िल पर बुलाया गया है'}</h1>
            <p>हिन्दी, उर्दू और अंग्रेज़ी साहित्य का घर — अपनी रचनाएँ लिखिए, पढ़िए और साझा कीजिए।</p>
            <button type="button" className="rw-btn rw-btn-primary" onClick={() => router.push('/signup')}>मुफ़्त में जुड़िए</button>
            <p className="rw-note">पहले से सदस्य हैं? <Link href="/login">प्रवेश करें</Link></p>
          </>
        )}
        {state === 'invalid' && (
          <>
            <h1>मेहफ़िल से जुड़िए</h1>
            <p>यह रेफ़रल लिंक मान्य नहीं लगता, पर आप फिर भी जुड़ सकते हैं।</p>
            <button type="button" className="rw-btn rw-btn-primary" onClick={() => router.push('/signup')}>साइन अप करें</button>
          </>
        )}
        {state === 'member' && (
          <>
            <h1>आप पहले से मेहफ़िल के सदस्य हैं 🎉</h1>
            <p>अपना रेफ़रल लिंक साझा कीजिए और दोस्तों को जोड़कर XP, बैज और फ़्रेम कमाइए।</p>
            <Link href="/rewards" className="rw-btn rw-btn-primary">Mehfil Rewards खोलें</Link>
          </>
        )}
      </div>
    </main>
  );
}

export default JoinClient;

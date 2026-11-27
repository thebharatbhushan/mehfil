'use client';

import { useEffect } from 'react';
import { storeReferralCode, trackReferralVisit } from '@/lib/referral';

/**
 * Mounted once in the root layout. If ANY page is opened with ?ref=CODE the code is stored (30 days) so the
 * attribution survives navigation to other pages before the visitor signs up. Renders nothing.
 */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const code = storeReferralCode(new URLSearchParams(window.location.search).get('ref'));
      if (code) trackReferralVisit(code);
    } catch { /* never affects the page */ }
  }, []);
  return null;
}

export default ReferralCapture;

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';
import { deviceHeaders } from '@/lib/notifications';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

type GoogleCredentialResponse = { credential?: string };
type GoogleId = {
  initialize: (cfg: { client_id: string; callback: (r: GoogleCredentialResponse) => void; ux_mode?: string }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}

let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GSI_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { gsiPromise = null; reject(new Error('gsi load failed')); };
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

/**
 * "Continue with Google" for both login and signup. Google returns an ID token; the backend
 * (POST /api/auth/google) verifies it and either logs the member in or creates the account.
 * Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.
 */
export default function GoogleAuthButton({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const { showToast } = useToast();
  const holderRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const handlerRef = useRef<(r: GoogleCredentialResponse) => void>(() => {});

  handlerRef.current = async (response) => {
    if (!response.credential) {
      showToast('❌ गूगल से जानकारी नहीं मिल सकी।', true);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...deviceHeaders() },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.user || !data.token) {
        showToast(data.message || '❌ गूगल से प्रवेश विफल।', true);
        return;
      }

      sessionStorage.removeItem('mehfil_user');
      localStorage.setItem('mehfil_user', JSON.stringify({ ...data.user, id: data.user._id }));
      localStorage.setItem('mehfil_remember', 'true');
      localStorage.setItem('token', data.token);
      window.dispatchEvent(new Event('mehfil-auth-change'));

      if (data.isNewUser) {
        showToast('✨ गूगल से खाता बन गया! मेहफ़िल में आपका स्वागत है।');
        setTimeout(() => router.push('/profile'), 800);
      } else {
        showToast(`✨ स्वागत है ${data.user.firstName || ''}! आपकी कविता यात्रा शुरू होती है।`);
        setTimeout(() => router.push(mode === 'signup' ? '/' : '/profile'), 800);
      }
    } catch {
      showToast('❌ सर्वर से कनेक्ट नहीं हो सका।', true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        const holder = holderRef.current;
        if (cancelled || !holder || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => handlerRef.current(r),
        });
        holder.innerHTML = '';
        window.google.accounts.id.renderButton(holder, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          logo_alignment: 'left',
          width: Math.min(320, Math.max(220, (holder.parentElement?.clientWidth || 320))),
        });
      })
      .catch(() => { /* offline / blocked: email login still works */ });
    return () => { cancelled = true; };
  }, [mode]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <div className="auth-divider">
        <span></span> या <span></span>
      </div>
      <div className="auth-google-wrap" aria-busy={busy}>
        <div ref={holderRef} className="auth-google-btn" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? 'none' : 'auto' }} />
      </div>
    </>
  );
}

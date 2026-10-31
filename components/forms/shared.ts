'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/mehfil';
import { getStoredUser, getToken } from '@/lib/auth';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Name/email of the logged-in user (from the existing auth storage), or empty strings for guests. */
export function useAccountPrefill() {
  const [prefill, setPrefill] = useState({ name: '', email: '', loggedIn: false });
  useEffect(() => {
    const read = () => {
      const user = getToken() ? getStoredUser() : null;
      if (!user) return setPrefill({ name: '', email: '', loggedIn: false });
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      setPrefill({ name, email: typeof user.email === 'string' ? user.email : '', loggedIn: true });
    };
    read();
    window.addEventListener('mehfil-auth-change', read);
    return () => window.removeEventListener('mehfil-auth-change', read);
  }, []);
  return prefill;
}

/** POST JSON to the Mehfil API. Sends the token when logged in so the backend can link the account. */
export async function postJson(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success !== false) return { ok: true, message: data.message || '' };
    if (res.status === 429) return { ok: false, message: 'बहुत जल्दी-जल्दी अनुरोध हुए। कृपया थोड़ी देर बाद पुनः प्रयास करें।' };
    return { ok: false, message: data.message || 'कुछ गड़बड़ हो गई। कृपया पुनः प्रयास करें।' };
  } catch {
    return { ok: false, message: 'सर्वर से कनेक्ट नहीं हो सका। कृपया इंटरनेट जाँचें।' };
  }
}

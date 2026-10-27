'use client';

import { useState } from 'react';
import { API_BASE_URL } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';

export function NewsletterForm() {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: real users never see or fill this
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      showToast('❌ कृपया सही ईमेल लिखें।', true);
      return;
    }
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_BASE_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email: value, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(`❌ ${data.message || 'सब्सक्राइब नहीं हो सका। कृपया दोबारा प्रयास करें।'}`, true);
        return;
      }
      setEmail('');
      showToast(`✨ ${data.message || 'सब्सक्राइब करने के लिए धन्यवाद!'}`);
    } catch {
      showToast('❌ सर्वर से कनेक्ट नहीं हो सका।', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="newsletter-form" onSubmit={submit} noValidate>
      <input
        type="email"
        placeholder="your@email.com"
        aria-label="Email address"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
      <button type="submit" disabled={loading}>
        <i className={loading ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'} /> {loading ? 'Sending…' : 'Subscribe'}
      </button>
    </form>
  );
}

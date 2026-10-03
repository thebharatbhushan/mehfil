'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -5;
    const ry = ((x - cx) / cx) * 5;
    card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  };

  const resetTilt = () => {
    if (cardRef.current) cardRef.current.style.transform = '';
  };

  useEffect(() => {
    if (localStorage.getItem('mehfil_remember') !== 'true') return;
    const storedUser = localStorage.getItem('mehfil_user');
    if (!storedUser) return;
    try {
      const savedUser = JSON.parse(storedUser) as { email?: string };
      if (savedUser.email) {
        setEmail(savedUser.email);
        setRemember(true);
      }
    } catch {
      localStorage.removeItem('mehfil_user');
      localStorage.removeItem('mehfil_remember');
    }
  }, []);

  const handleForgotPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    showToast('🕊️ पासवर्ड पुनर्प्राप्ति सुविधा जल्द उपलब्ध होगी।');
  };

  const handleSocialLogin = (provider: string) => {
    showToast(`${provider} से जुड़ने की सुविधा जल्द आ रही है।`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.user || !data.token) {
        showToast(data.message || '❌ लॉगिन विफल।', true);
        return;
      }

      const userData = {
        ...data.user,
        id: data.user._id,
      };
      sessionStorage.removeItem('mehfil_user');
      localStorage.removeItem('mehfil_user');
      if (remember) {
        localStorage.setItem('mehfil_user', JSON.stringify(userData));
        localStorage.setItem('mehfil_remember', 'true');
      } else {
        sessionStorage.setItem('mehfil_user', JSON.stringify(userData));
        localStorage.removeItem('mehfil_remember');
      }
      localStorage.setItem('token', data.token);
      window.dispatchEvent(new Event('mehfil-auth-change'));
      showToast(`✨ स्वागत है ${data.user.firstName}! आपकी कविता यात्रा शुरू होती है।`);
      setTimeout(() => router.push('/profile'), 800);
    } catch {
      showToast('❌ सर्वर से कनेक्ट नहीं हो सका।', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrap">
      <div className="auth-orb orb-1" />
      <div className="auth-orb orb-2" />
      <div className="auth-orb orb-3" />

      <Link href="/" className="auth-back-link">
        <i className="fas fa-feather-alt" /> वापस मेहफ़िल
      </Link>

      <div
        ref={cardRef}
        className="glass-card auth-card"
        onMouseMove={handleMouseMove}
        onMouseLeave={resetTilt}
      >
        <div className="auth-grid">
          <div className="auth-art">
            <div className="auth-art-content">
              <i className="fas fa-feather-alt auth-art-icon" />
              <h2 className="auth-art-title">अल्फ़ाज़ की महफ़िल</h2>
              <p className="auth-art-quote">
                &ldquo;हर लफ्ज़ एक एहसास है, हर शे&rsquo;र एक दास्ताँ।&rdquo;
              </p>
              <div className="auth-art-urdu">
                <i className="fas fa-moon" /> जहाँ अल्फ़ाज़ महसूसात बन जाते हैं
              </div>
              <div className="auth-art-footer">
                <i className="fas fa-quote-left" /> साहित्य का सच्चा सफर
              </div>
            </div>
            <div className="auth-art-ink">🪶</div>
          </div>

          <div className="auth-form-side">
            <div className="auth-brand-tag">
              <i className="fas fa-feather-alt" />
            </div>
            <h2 className="auth-form-title">स्वागत है</h2>
            <p className="auth-form-sub">
              अपने खाते में प्रवेश करें और रचनात्मकता में डूब जाएँ।
            </p>

            <form onSubmit={handleLogin}>
              <div className="auth-input-group">
                <i className="fas fa-envelope auth-input-icon" />
                <input
                  className="auth-input"
                  type="email"
                  placeholder="ईमेल / Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="auth-input-group">
                <i className="fas fa-lock auth-input-icon" />
                <input
                  className="auth-input"
                  type="password"
                  placeholder="पासवर्ड / Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="auth-options-row">
                <label className="auth-checkbox">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>मुझे याद रखें</span>
                </label>
                <button type="button" onClick={handleForgotPassword} className="auth-forgot-link">
                  पासवर्ड भूल गए?
                </button>
              </div>
              <button className="primary-btn auth-submit-btn" type="submit" disabled={loading}>
                {loading ? <><div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> कृपया प्रतीक्षा करें...</> : <><i className="fas fa-pen-fancy" /> प्रवेश करें</>}
              </button>

              <div className="auth-divider">
                <span></span> या <span></span>
              </div>

              <div className="auth-social-row">
                <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin('गूगल')}>
                  <i className="fab fa-google" />
                </button>
                <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin('गिटहब')}>
                  <i className="fab fa-github" />
                </button>
                <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin('ट्विटर')}>
                  <i className="fab fa-twitter" />
                </button>
              </div>
            </form>

            <div className="auth-signup-prompt">
              क्या आप नए सदस्य हैं? <Link href="/signup">नई रचना शुरू करें →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

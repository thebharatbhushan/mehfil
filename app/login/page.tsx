'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';

type RecoveryStep = 'email' | 'otp' | 'password';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('email');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

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

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const resetRecovery = () => {
    setRecoveryStep('email');
    setRecoveryEmail('');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResendSeconds(0);
    setLoading(false);
    setShowRecovery(false);
  };

  const handleForgotPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setRecoveryEmail(email.trim());
    setShowRecovery(true);
    setRecoveryStep('email');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSendRecoveryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || '❌ OTP भेजा नहीं जा सका।', true);
        return;
      }

      setRecoveryStep('otp');
      setResendSeconds(Number(data.resendAfter || 60));
      showToast('📩 OTP भेज दिया गया है। अपना inbox और spam folder check करें।');
    } catch {
      showToast('❌ सर्वर से कनेक्ट नहीं हो सका।', true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecoveryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      showToast('कृपया 6 अंकों का OTP दर्ज करें।', true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail, otp }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.resetToken) {
        showToast(data.message || '❌ OTP सत्यापित नहीं हो सका।', true);
        return;
      }

      setResetToken(data.resetToken);
      setRecoveryStep('password');
      setOtp('');
      showToast('✓ OTP सत्यापित हो गया। अब नया पासवर्ड सेट करें।');
    } catch {
      showToast('❌ सर्वर से कनेक्ट नहीं हो सका।', true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      showToast('पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।', true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('दोनों पासवर्ड एक जैसे होने चाहिए।', true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail,
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || '❌ पासवर्ड रीसेट नहीं हो सका।', true);
        return;
      }

      showToast('🔐 पासवर्ड सफलतापूर्वक बदल दिया गया। अब लॉगिन करें।');
      setEmail(recoveryEmail);
      resetRecovery();
    } catch {
      showToast('❌ सर्वर से कनेक्ट नहीं हो सका।', true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendRecoveryOtp = async () => {
    if (resendSeconds > 0 || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || '❌ OTP दोबारा नहीं भेजा जा सका।', true);
        if (data.retryAfterSeconds) setResendSeconds(Number(data.retryAfterSeconds));
        return;
      }

      setOtp('');
      setResendSeconds(Number(data.resendAfter || 60));
      showToast('📩 नया OTP भेज दिया गया है।');
    } catch {
      showToast('❌ सर्वर से कनेक्ट नहीं हो सका।', true);
    } finally {
      setLoading(false);
    }
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

  const renderRecoveryForm = () => {
    if (recoveryStep === 'email') {
      return (
        <form onSubmit={handleSendRecoveryOtp}>
          <h2 className="auth-form-title">पासवर्ड भूल गए?</h2>
          <p className="auth-form-sub">
            अपने registered email पर OTP प्राप्त करके पासवर्ड रीसेट करें।
          </p>

          <div className="auth-input-group">
            <i className="fas fa-envelope auth-input-icon" />
            <input
              className="auth-input"
              type="email"
              placeholder="ईमेल / Email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <button className="primary-btn auth-submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <><div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> कृपया प्रतीक्षा करें...</>
            ) : (
              <><i className="fas fa-paper-plane" /> OTP भेजें</>
            )}
          </button>

          <button type="button" className="auth-recovery-back" onClick={resetRecovery} disabled={loading}>
            <i className="fas fa-arrow-left" /> लॉगिन पर वापस जाएँ
          </button>
        </form>
      );
    }

    if (recoveryStep === 'otp') {
      return (
        <form onSubmit={handleVerifyRecoveryOtp}>
          <h2 className="auth-form-title">OTP सत्यापित करें</h2>
          <p className="auth-form-sub">
            <strong>{recoveryEmail}</strong> पर भेजा गया 6 अंकों का OTP दर्ज करें।
          </p>

          <div className="auth-input-group">
            <i className="fas fa-key auth-input-icon" />
            <input
              className="auth-input auth-otp-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              placeholder="6 अंकों का OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>

          <button className="primary-btn auth-submit-btn" type="submit" disabled={loading || otp.length !== 6}>
            {loading ? (
              <><div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> सत्यापित हो रहा है...</>
            ) : (
              <><i className="fas fa-check-circle" /> OTP सत्यापित करें</>
            )}
          </button>

          <div className="auth-recovery-resend">
            {resendSeconds > 0 ? (
              <span>नया OTP भेजने के लिए {resendSeconds}s प्रतीक्षा करें</span>
            ) : (
              <button type="button" onClick={handleResendRecoveryOtp} disabled={loading}>
                OTP दोबारा भेजें
              </button>
            )}
          </div>

          <button type="button" className="auth-recovery-back" onClick={resetRecovery} disabled={loading}>
            <i className="fas fa-arrow-left" /> ईमेल बदलें
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handleResetPassword}>
        <h2 className="auth-form-title">नया पासवर्ड सेट करें</h2>
        <p className="auth-form-sub">
          अपने खाते के लिए एक नया सुरक्षित पासवर्ड चुनें।
        </p>

        <div className="auth-input-group">
          <i className="fas fa-lock auth-input-icon" />
          <input
            className="auth-input"
            type="password"
            placeholder="नया पासवर्ड / New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="auth-input-group">
          <i className="fas fa-shield-alt auth-input-icon" />
          <input
            className="auth-input"
            type="password"
            placeholder="पासवर्ड दोबारा दर्ज करें"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </div>

        <button className="primary-btn auth-submit-btn" type="submit" disabled={loading}>
          {loading ? (
            <><div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> पासवर्ड बदल रहा है...</>
          ) : (
            <><i className="fas fa-lock-open" /> पासवर्ड बदलें</>
          )}
        </button>

        <button type="button" className="auth-recovery-back" onClick={resetRecovery} disabled={loading}>
          <i className="fas fa-arrow-left" /> लॉगिन पर वापस जाएँ
        </button>
      </form>
    );
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
            {!recoveryStep ? null : recoveryStep === 'email' || recoveryStep === 'otp' || recoveryStep === 'password' ? (
              recoveryStep === 'email' && recoveryEmail === '' && false ? null : null
            ) : null}

            {recoveryStep === 'email' && !recoveryEmail && false ? null : null}

            {recoveryStep === 'email' && recoveryEmail === '' && false ? null : null}

            {showRecovery ? (
              <>
                {renderRecoveryForm()}
                {recoveryStep === 'email' && (
                  <div className="auth-signup-prompt">
                    अपना पासवर्ड याद है?{' '}
                    <button type="button" className="auth-inline-link" onClick={resetRecovery}>
                      लॉगिन करें
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


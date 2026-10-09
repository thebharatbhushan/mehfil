'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';

export default function SignupPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    username: '', firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    gender: 'male', dob: '', languagePref: 'hi',
  });
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [usernameStatus, setUsernameStatus] = useState<{ state: 'idle' | 'checking' | 'ok' | 'bad'; msg: string }>({ state: 'idle', msg: '' });

  // Resend countdown for email OTP. The backend independently enforces the cooldown.
  useEffect(() => {
    if (!otpSent || resendSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpSent, resendSeconds]);

  // Live username availability check (debounced).
  useEffect(() => {
    const u = formData.username;
    if (!u) { setUsernameStatus({ state: 'idle', msg: '' }); return; }
    if (!/^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/.test(u) || u.includes('..')) {
      setUsernameStatus({ state: 'bad', msg: '3-20 अक्षर: a-z, 0-9, _ या . (शुरू/अंत अक्षर या अंक से)' });
      return;
    }
    setUsernameStatus({ state: 'checking', msg: 'जाँच हो रही है…' });
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/auth/username-available?username=${encodeURIComponent(u)}`, { signal: controller.signal });
        const d = await r.json();
        setUsernameStatus(d.available ? { state: 'ok', msg: 'यह यूज़रनेम उपलब्ध है ✓' } : { state: 'bad', msg: d.message === 'Username already taken' ? 'यह यूज़रनेम पहले से लिया जा चुका है' : 'अमान्य यूज़रनेम' });
      } catch { /* aborted or offline: server re-validates on submit */ }
    }, 400);
    return () => { clearTimeout(t); controller.abort(); };
  }, [formData.username]);

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

  const checkStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    setStrength(s);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setProfileFile(null);
      setProfilePic(null);
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('❌ केवल JPG, PNG या WebP फ़ोटो चुनें।', true);
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('❌ फ़ोटो 5 MB या उससे छोटी होनी चाहिए।', true);
      e.target.value = '';
      return;
    }
    setProfileFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfilePic(reader.result as string);
    reader.readAsDataURL(file);
  };

  const requestSignupOtp = async () => {
    const payload = {
      username: formData.username.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      gender: formData.gender,
      dob: formData.dob,
      languagePref: formData.languagePref,
    };
    const res = await fetch(`${API_BASE_URL}/api/auth/send-signup-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      if (Number(data.retryAfterSeconds) > 0) setResendSeconds(Number(data.retryAfterSeconds));
      throw new Error(data.message || 'ईमेल OTP नहीं भेजा जा सका।');
    }
    return data;
  };

  const verifySignupOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      showToast('❌ कृपया ईमेल पर आया 6 अंकों का OTP दर्ज करें।', true);
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('email', formData.email.trim().toLowerCase());
      fd.append('otp', otpCode.trim());
      if (profileFile) fd.append('profilePic', profileFile);

      const res = await fetch(`${API_BASE_URL}/api/auth/verify-signup-otp`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.message || '❌ OTP सत्यापित नहीं हो सका।', true);
        return;
      }

      localStorage.setItem('mehfil_user', JSON.stringify({ ...data.user, id: data.user?._id ?? data.user?.id }));
      localStorage.setItem('token', data.token);
      window.dispatchEvent(new Event('mehfil-auth-change'));
      showToast('✨ ईमेल सत्यापित! मेहफ़िल में आपका स्वागत है।');
      setTimeout(() => router.push('/'), 800);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '❌ सर्वर से कनेक्ट नहीं हो सका।', true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading || resendSeconds > 0) return;
    setLoading(true);
    try {
      const data = await requestSignupOtp();
      setOtpCode('');
      setResendSeconds(Number(data.resendAfter) || 60);
      showToast('✉️ नया OTP भेज दिया गया है। अपना inbox और spam folder देखें।');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '❌ OTP दोबारा नहीं भेजा जा सका।', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpSent) {
      await verifySignupOtp();
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast('❌ पासवर्ड मेल नहीं खाते।', true);
      return;
    }
    if (formData.password.length < 6) {
      showToast('❌ पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।', true);
      return;
    }
    if (usernameStatus.state === 'bad' || !formData.username) {
      showToast('❌ कृपया सही और उपलब्ध यूज़रनेम चुनें।', true);
      return;
    }
    const birthDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
    if (!formData.dob || Number.isNaN(birthDate.getTime()) || age < 13) {
      showToast('❌ सही जन्मतिथि दर्ज करें। आपकी आयु कम से कम 13 वर्ष होनी चाहिए।', true);
      return;
    }

    setLoading(true);
    try {
      const data = await requestSignupOtp();
      setOtpSent(true);
      setOtpCode('');
      setResendSeconds(Number(data.resendAfter) || 60);
      showToast('✉️ आपके ईमेल पर OTP भेज दिया गया है। कृपया 5 मिनट में सत्यापित करें।');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '❌ OTP भेजने में समस्या आई।', true);
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
              <h2 className="auth-art-title">काव्य यात्रा शुरू करें</h2>
              <p className="auth-art-quote">
                अपनी रचनाओं को दुनिया तक पहुँचाइए
              </p>
              <div className="auth-art-urdu">
                <i className="fas fa-star" /> जहाँ हर शब्द एक कहानी कहता है
              </div>
              <div className="auth-art-footer">
                <i className="fas fa-quote-left" /> नया साहित्य, नई शुरुआत
              </div>
            </div>
            <div className="auth-art-ink">🪶</div>
          </div>

          <div className="auth-form-side">
            <div className="auth-brand-tag">
              <i className="fas fa-feather-alt" />
            </div>
            <h2 className="auth-form-title">पंजीकरण करें</h2>
            <p className="auth-form-sub">
              मेहफ़िल के साथ अपनी साहित्यिक यात्रा आरंभ करें।
            </p>

            <form onSubmit={handleSubmit}>
              {!otpSent ? (
                <>
              <div className="signup-pic-wrap">
                <label style={{ cursor: 'pointer' }}>
                  <img
                    className="profile-preview"
                    src={profilePic || `https://ui-avatars.com/api/?name=U&background=C16A4B&color=fff&size=90&rounded=true`}
                    alt="Profile"
                    width={90}
                    height={90}
                    decoding="async"
                  />
                  <div className="signup-pic-hint">
                    <i className="fas fa-camera" /> फ़ोटो चुनें
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              </div>

              <div className="signup-field-grid">
                <div className="auth-input-group">
                  <i className="fas fa-user auth-input-icon" />
                  <input className="auth-input" placeholder="पहला नाम" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                </div>
                <div className="auth-input-group">
                  <i className="fas fa-user auth-input-icon" />
                  <input className="auth-input" placeholder="अंतिम नाम" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>

              <div className="auth-input-group">
                <i className="fas fa-at auth-input-icon" />
                <input
                  className="auth-input"
                  placeholder="यूज़रनेम (जैसे rahul_sharma)"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20) })}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>
              {usernameStatus.msg && (
                <small style={{ display: 'block', marginTop: -6, marginBottom: 10, color: usernameStatus.state === 'ok' ? '#2e7d32' : usernameStatus.state === 'bad' ? '#c62828' : 'var(--text-muted)' }}>
                  {usernameStatus.msg}
                </small>
              )}

              <div className="signup-field-grid">
                <div className="auth-input-group">
                  <i className="fas fa-venus-mars auth-input-icon" />
                  <select className="auth-input" style={{ appearance: 'none' }} value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="male">पुरुष</option>
                    <option value="female">महिला</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not">बताना नहीं चाहते</option>
                  </select>
                </div>
                <div className="auth-input-group">
                  <i className="fas fa-calendar auth-input-icon" />
                  <input className="auth-input" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} required />
                </div>
              </div>

              <div className="auth-input-group">
                <i className="fas fa-envelope auth-input-icon" />
                <input className="auth-input" type="email" placeholder="ईमेल" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>

              <div className="auth-input-group">
                <i className="fas fa-lock auth-input-icon" />
                <input className="auth-input" type="password" placeholder="पासवर्ड" value={formData.password} onChange={(e) => { setFormData({ ...formData, password: e.target.value }); checkStrength(e.target.value); }} required />
              </div>
              {strength > 0 && (
                <div className="strength-meter">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`strength-bar ${strength >= i ? 'active ' + (strength === 1 ? 'weak' : strength === 2 ? 'medium' : 'strong') : ''}`} />
                  ))}
                </div>
              )}

              <div className="auth-input-group">
                <i className="fas fa-lock auth-input-icon" />
                <input className="auth-input" type="password" placeholder="पासवर्ड पुष्टि करें" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
              </div>

              <div className="auth-input-group">
                <i className="fas fa-language auth-input-icon" />
                <select className="auth-input" style={{ appearance: 'none' }} value={formData.languagePref} onChange={(e) => setFormData({ ...formData, languagePref: e.target.value })}>
                  <option value="hi">हिंदी</option>
                  <option value="ur">उर्दू</option>
                  <option value="en">English</option>
                  <option value="bilingual">Bilingual</option>
                </select>
              </div>

              <button className="primary-btn auth-submit-btn" type="submit" disabled={loading}>
                {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><i className="fas fa-envelope" /> ईमेल OTP भेजें</>}
              </button>
                </>
              ) : (
                <div className="signup-otp-step">
                  <div style={{ textAlign: 'center', padding: '10px 0 18px' }}>
                    <div style={{ fontSize: 38, marginBottom: 8, color: 'var(--accent, #C16A4B)' }}>
                      <i className="fas fa-envelope-open-text" />
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: 22 }}>ईमेल सत्यापित करें</h3>
                    <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--text-muted, #766d66)' }}>
                      हमने <strong>{formData.email.trim()}</strong> पर 6 अंकों का OTP भेजा है। यह 5 मिनट में समाप्त हो जाएगा।
                    </p>
                  </div>
                  <div className="auth-input-group">
                    <i className="fas fa-shield-alt auth-input-icon" />
                    <input
                      className="auth-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="6 अंकों का OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                    />
                  </div>
                  <button className="primary-btn auth-submit-btn" type="submit" disabled={loading}>
                    {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><i className="fas fa-check-circle" /> OTP सत्यापित करें और अकाउंट बनाएँ</>}
                  </button>
                  <button
                    type="button"
                    className="primary-btn auth-submit-btn"
                    style={{ marginTop: 10, background: 'transparent', color: 'var(--text-primary, #382b24)', border: '1px solid rgba(193,106,75,0.35)' }}
                    onClick={handleResendOtp}
                    disabled={loading || resendSeconds > 0}
                  >
                    {resendSeconds > 0 ? `नया OTP ${resendSeconds} सेकंड बाद भेजें` : 'OTP दोबारा भेजें'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    disabled={loading}
                    style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 0, color: 'var(--text-muted, #766d66)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    साइनअप विवरण पर वापस जाएँ
                  </button>
                </div>
              )}
            </form>

            <div className="auth-signup-prompt">
              पहले से सदस्य? <Link href="/login">प्रवेश करें</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

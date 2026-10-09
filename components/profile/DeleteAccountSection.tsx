'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/mehfil';
import { useToast } from '@/components/site/ToastProvider';

export function DeleteAccountSection() {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setPassword('');
    setConfirmText('');
    setError('');
  };

  const handleDelete = async () => {
    setError('');
    if (!password) return setError('कृपया अपना पासवर्ड दर्ज करें।');
    if (confirmText.trim().toUpperCase() !== 'DELETE') return setError('पुष्टि के लिए DELETE टाइप करें।');
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');

    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || 'अकाउंट हटाने में विफल।');
        setDeleting(false);
        return;
      }
      localStorage.removeItem('mehfil_user');
      localStorage.removeItem('mehfil_remember');
      localStorage.removeItem('token');
      sessionStorage.removeItem('mehfil_user');
      window.dispatchEvent(new Event('mehfil-auth-change'));
      showToast('आपका अकाउंट हटा दिया गया है।');
      router.push('/');
    } catch {
      setError('नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।');
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="delete-account-zone">
        <div>
          <strong>अकाउंट हटाएँ</strong>
          <p>आपका अकाउंट, आपकी सभी रचनाएँ और प्रोफ़ाइल जानकारी हमेशा के लिए हट जाएँगी। इसे वापस नहीं किया जा सकता।</p>
        </div>
        <button type="button" className="delete-account-btn" onClick={() => setOpen(true)}>अकाउंट हटाएँ</button>
      </div>

      {open && (
        <div className="modal-mask profile-modal-mask" onClick={close}>
          <div className="modal-dialog profile-edit-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row"><h2 className="modal-title">क्या आप अकाउंट हटाना चाहते हैं?</h2></div>
            <div className="profile-modal-fields">
              <div className="profile-security-callout">
                <i className="fas fa-exclamation-triangle" />
                <div><strong>यह स्थायी है</strong><p>आपकी सभी कविताएँ और प्रोफ़ाइल हमेशा के लिए हटा दी जाएँगी।</p></div>
              </div>
              <label className="modal-field"><span className="modal-label">पासवर्ड</span><input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
              <label className="modal-field"><span className="modal-label">पुष्टि के लिए <b>DELETE</b> टाइप करें</span><input className="form-input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoCapitalize="characters" spellCheck={false} /></label>
              {error && <p className="delete-account-error" role="alert">{error}</p>}
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={close} disabled={deleting}>रद्द करें</button>
              <button className="delete-account-btn solid" onClick={handleDelete} disabled={deleting}>{deleting ? 'हटाया जा रहा है...' : 'हमेशा के लिए हटाएँ'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

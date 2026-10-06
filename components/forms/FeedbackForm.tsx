'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useToast } from '@/components/site/ToastProvider';
import { EMAIL_RE, postJson, useAccountPrefill } from './shared';

export const FEEDBACK_TYPES = [
  { value: 'general', label: 'General Feedback' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'bug', label: 'Bug / Issue' },
  { value: 'content', label: 'Content Feedback' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'other', label: 'Other' },
];

type Errors = Partial<Record<'name' | 'email' | 'message', string>>;

export function FeedbackForm() {
  const { showToast } = useToast();
  const account = useAccountPrefill();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('general');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [website, setWebsite] = useState(''); // honeypot — real users never fill this
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const lock = useRef(false);

  // Prefill from the logged-in account, without clobbering what the user already typed.
  useEffect(() => {
    setName((cur) => cur || account.name);
    setEmail((cur) => cur || account.email);
  }, [account.name, account.email]);

  const emailLocked = account.loggedIn && !!account.email;

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'कृपया अपना नाम लिखें।';
    if (!EMAIL_RE.test(email.trim())) next.email = 'कृपया सही ईमेल लिखें।';
    if (message.trim().length < 10) next.message = 'कृपया कम से कम 10 अक्षरों में अपनी राय लिखें।';
    else if (message.length > 2000) next.message = 'संदेश 2000 अक्षरों तक रखें।';
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current || submitting) return; // blocks double-clicks / double-Enter
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      showToast('कृपया चिह्नित जानकारी ठीक करें।', true);
      return;
    }
    lock.current = true;
    setSubmitting(true);
    const result = await postJson('/api/feedback', {
      name: name.trim(), email: email.trim(), feedbackType: type, message: message.trim(),
      rating: rating || undefined, website,
    });
    setSubmitting(false);
    if (result.ok) {
      showToast('🙏 धन्यवाद! आपकी राय हम तक पहुँच गई।');
      setDone(true);
      setMessage(''); setRating(0); setType('general');
      if (!account.loggedIn) { setName(''); setEmail(''); }
      // keep the lock for a few seconds so an accidental second submit can't slip through
      setTimeout(() => { lock.current = false; }, 4000);
    } else {
      showToast(result.message, true);
      lock.current = false;
    }
  };

  if (done) {
    return (
      <div className="mf-success" role="status">
        <div className="mf-success-icon"><i className="fas fa-check" /></div>
        <h2>धन्यवाद!</h2>
        <p>आपकी राय हमारे लिए बहुत मायने रखती है। हम इसे ध्यान से पढ़ेंगे।</p>
        <button type="button" className="secondary-btn" onClick={() => setDone(false)}>एक और राय दें</button>
      </div>
    );
  }

  return (
    <form className="mf-form" onSubmit={onSubmit} noValidate>
      <div className="mf-row">
        <div className="mf-field">
          <label htmlFor="fb-name">नाम</label>
          <input id="fb-name" className={`form-input${errors.name ? ' is-invalid' : ''}`} value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
          {errors.name && <span className="mf-error" role="alert">{errors.name}</span>}
        </div>
        <div className="mf-field">
          <label htmlFor="fb-email">ईमेल</label>
          <input id="fb-email" type="email" inputMode="email" className={`form-input${errors.email ? ' is-invalid' : ''}`} value={email} readOnly={emailLocked} maxLength={120} autoComplete="email" onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
          {errors.email && <span className="mf-error" role="alert">{errors.email}</span>}
        </div>
      </div>

      <div className="mf-field">
        <label htmlFor="fb-type">Feedback Type</label>
        <select id="fb-type" className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
          {FEEDBACK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="mf-field">
        <label htmlFor="fb-message">आपकी राय <small>{message.length}/2000</small></label>
        <textarea id="fb-message" className={`form-input mf-textarea${errors.message ? ' is-invalid' : ''}`} value={message} maxLength={2000} placeholder="अपने सुझाव, समस्या या विचार यहाँ लिखें…" onChange={(e) => setMessage(e.target.value)} aria-invalid={!!errors.message} />
        {errors.message && <span className="mf-error" role="alert">{errors.message}</span>}
      </div>

      <div className="mf-field">
        <span className="mf-label">रेटिंग <small>(वैकल्पिक)</small></span>
        <div className="mf-stars" role="radiogroup" aria-label="रेटिंग" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} स्टार`}
              className={`mf-star${(hover || rating) >= n ? ' on' : ''}`}
              onMouseEnter={() => setHover(n)} onClick={() => setRating(rating === n ? 0 : n)}>
              <i className="fas fa-star" />
            </button>
          ))}
        </div>
      </div>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="mf-hp" value={website} onChange={(e) => setWebsite(e.target.value)} />

      <button className="primary-btn mf-submit" type="submit" disabled={submitting}>
        {submitting ? <><i className="fas fa-spinner fa-spin" /> भेजा जा रहा है…</> : <><i className="fas fa-paper-plane" /> Feedback भेजें</>}
      </button>
    </form>
  );
}

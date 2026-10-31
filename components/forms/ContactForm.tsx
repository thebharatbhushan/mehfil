'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useToast } from '@/components/site/ToastProvider';
import { EMAIL_RE, postJson, useAccountPrefill } from './shared';

type Errors = Partial<Record<'name' | 'email' | 'subject' | 'message', string>>;

export function ContactForm() {
  const { showToast } = useToast();
  const account = useAccountPrefill();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    setName((cur) => cur || account.name);
    setEmail((cur) => cur || account.email);
  }, [account.name, account.email]);

  const emailLocked = account.loggedIn && !!account.email;

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'कृपया अपना नाम लिखें।';
    if (!EMAIL_RE.test(email.trim())) next.email = 'कृपया सही ईमेल लिखें।';
    if (subject.trim().length < 3) next.subject = 'कृपया विषय लिखें।';
    if (message.trim().length < 10) next.message = 'कृपया कम से कम 10 अक्षरों में संदेश लिखें।';
    else if (message.length > 2000) next.message = 'संदेश 2000 अक्षरों तक रखें।';
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current || submitting) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      showToast('कृपया चिह्नित जानकारी ठीक करें।', true);
      return;
    }
    lock.current = true;
    setSubmitting(true);
    const result = await postJson('/api/contact', {
      name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(), website,
    });
    setSubmitting(false);
    if (result.ok) {
      showToast('✉️ आपका संदेश भेज दिया गया है। हम जल्द उत्तर देंगे।');
      setDone(true);
      setSubject(''); setMessage('');
      if (!account.loggedIn) { setName(''); setEmail(''); }
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
        <h3>संदेश मिल गया</h3>
        <p>आपके संपर्क के लिए धन्यवाद। हम जल्द ही आपसे जुड़ेंगे।</p>
        <button type="button" className="secondary-btn" onClick={() => setDone(false)}>नया संदेश भेजें</button>
      </div>
    );
  }

  return (
    <form className="mf-form" onSubmit={onSubmit} noValidate>
      <div className="mf-row">
        <div className="mf-field">
          <label htmlFor="ct-name">नाम</label>
          <input id="ct-name" className={`form-input${errors.name ? ' is-invalid' : ''}`} value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
          {errors.name && <span className="mf-error" role="alert">{errors.name}</span>}
        </div>
        <div className="mf-field">
          <label htmlFor="ct-email">ईमेल</label>
          <input id="ct-email" type="email" inputMode="email" className={`form-input${errors.email ? ' is-invalid' : ''}`} value={email} readOnly={emailLocked} maxLength={120} autoComplete="email" onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
          {errors.email && <span className="mf-error" role="alert">{errors.email}</span>}
        </div>
      </div>
      <div className="mf-field">
        <label htmlFor="ct-subject">विषय</label>
        <input id="ct-subject" className={`form-input${errors.subject ? ' is-invalid' : ''}`} value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} aria-invalid={!!errors.subject} />
        {errors.subject && <span className="mf-error" role="alert">{errors.subject}</span>}
      </div>
      <div className="mf-field">
        <label htmlFor="ct-message">संदेश <small>{message.length}/2000</small></label>
        <textarea id="ct-message" className={`form-input mf-textarea${errors.message ? ' is-invalid' : ''}`} value={message} maxLength={2000} placeholder="अपना संदेश यहाँ लिखें…" onChange={(e) => setMessage(e.target.value)} aria-invalid={!!errors.message} />
        {errors.message && <span className="mf-error" role="alert">{errors.message}</span>}
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="mf-hp" value={website} onChange={(e) => setWebsite(e.target.value)} />
      <button className="primary-btn mf-submit" type="submit" disabled={submitting}>
        {submitting ? <><i className="fas fa-spinner fa-spin" /> भेजा जा रहा है…</> : <><i className="fas fa-paper-plane" /> संदेश भेजें</>}
      </button>
    </form>
  );
}

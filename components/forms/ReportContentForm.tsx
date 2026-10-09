'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useToast } from '@/components/site/ToastProvider';
import { EMAIL_RE, postJson, useAccountPrefill } from './shared';

const REASONS = ['कॉपीराइट उल्लंघन / चोरी की रचना', 'उत्पीड़न या धमकी', 'घृणा फैलाने वाली सामग्री', 'अश्लील या अवैध सामग्री', 'स्पैम', 'किसी का रूप धरना', 'अन्य'];

type Errors = Partial<Record<'name' | 'email' | 'link' | 'details', string>>;

/** Sends through the existing contact endpoint (/api/contact); no new backend is needed. */
export function ReportContentForm() {
  const { showToast } = useToast();
  const account = useAccountPrefill();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
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
    if (link.trim().length < 3) next.link = 'कृपया उस रचना या प्रोफ़ाइल का लिंक लिखें।';
    if (details.trim().length < 10) next.details = 'कृपया कम से कम 10 अक्षरों में विवरण लिखें।';
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
    const message = `सामग्री का लिंक: ${link.trim().slice(0, 300)}\nकारण: ${reason}\n\n${details.trim()}`.slice(0, 2000);
    const result = await postJson('/api/contact', {
      name: name.trim(), email: email.trim(), subject: `Content report: ${reason}`.slice(0, 150), message, website,
    });
    setSubmitting(false);
    if (result.ok) {
      showToast('रिपोर्ट भेज दी गई है। हम इसकी समीक्षा करेंगे।');
      setDone(true);
      setLink(''); setDetails('');
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
        <h3>रिपोर्ट मिल गई</h3>
        <p>धन्यवाद। हम इसकी समीक्षा करके उचित कार्रवाई करेंगे।</p>
        <button type="button" className="secondary-btn" onClick={() => setDone(false)}>एक और रिपोर्ट भेजें</button>
      </div>
    );
  }

  return (
    <form className="mf-form" onSubmit={onSubmit} noValidate>
      <div className="mf-row">
        <div className="mf-field">
          <label htmlFor="rp-name">आपका नाम</label>
          <input id="rp-name" className={`form-input${errors.name ? ' is-invalid' : ''}`} value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
          {errors.name && <span className="mf-error" role="alert">{errors.name}</span>}
        </div>
        <div className="mf-field">
          <label htmlFor="rp-email">आपका ईमेल</label>
          <input id="rp-email" type="email" inputMode="email" className={`form-input${errors.email ? ' is-invalid' : ''}`} value={email} readOnly={emailLocked} maxLength={120} autoComplete="email" onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
          {errors.email && <span className="mf-error" role="alert">{errors.email}</span>}
        </div>
      </div>
      <div className="mf-field">
        <label htmlFor="rp-link">रचना / प्रोफ़ाइल का लिंक</label>
        <input id="rp-link" className={`form-input${errors.link ? ' is-invalid' : ''}`} value={link} maxLength={300} placeholder="https://…" onChange={(e) => setLink(e.target.value)} aria-invalid={!!errors.link} />
        {errors.link && <span className="mf-error" role="alert">{errors.link}</span>}
      </div>
      <div className="mf-field">
        <label htmlFor="rp-reason">कारण</label>
        <select id="rp-reason" className="form-input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="mf-field">
        <label htmlFor="rp-details">विवरण <small>{details.length}/1500</small></label>
        <textarea id="rp-details" className={`form-input mf-textarea${errors.details ? ' is-invalid' : ''}`} value={details} maxLength={1500} placeholder="समस्या के बारे में बताएँ। कॉपीराइट मामले में अपनी मूल रचना का प्रमाण या लिंक भी दें।" onChange={(e) => setDetails(e.target.value)} aria-invalid={!!errors.details} />
        {errors.details && <span className="mf-error" role="alert">{errors.details}</span>}
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="mf-hp" value={website} onChange={(e) => setWebsite(e.target.value)} />
      <button className="primary-btn mf-submit" type="submit" disabled={submitting}>
        {submitting ? <><i className="fas fa-spinner fa-spin" /> भेजा जा रहा है…</> : <><i className="fas fa-flag" /> रिपोर्ट भेजें</>}
      </button>
    </form>
  );
}

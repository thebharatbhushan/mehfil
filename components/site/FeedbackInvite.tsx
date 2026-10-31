import { FEEDBACK_INVITE, SUPPORT_EMAIL } from '@/lib/contact';

/**
 * Bilingual (Hindi + English) invitation to share suggestions / complaints / ideas by email.
 * variant "footer" — dark footer band; "card" — full card for pages; "inline" — one compact line.
 */
export function FeedbackInvite({ variant = 'card' }: { variant?: 'footer' | 'card' | 'inline' }) {
  const mail = (
    <a className="fbi-mail" href={`mailto:${SUPPORT_EMAIL}?subject=Mehfil%20Feedback`}>
      <i className="fas fa-envelope" aria-hidden="true" /> {SUPPORT_EMAIL}
    </a>
  );

  if (variant === 'inline') {
    return (
      <p className="fbi-inline">
        मेहफ़िल को बेहतर बनाने में सहयोग करें — सुझाव, शिकायत या विचार भेजें / Share your suggestions &amp; complaints:{' '}
        {mail}
      </p>
    );
  }

  return (
    <aside className={`fbi fbi-${variant}`} aria-label="Feedback / सुझाव">
      <span className="fbi-icon" aria-hidden="true"><i className="fas fa-hand-holding-heart" /></span>
      <div className="fbi-body">
        <div className="fbi-lang" lang="hi">
          <h3>{FEEDBACK_INVITE.hi.title}</h3>
          <p>{FEEDBACK_INVITE.hi.text}</p>
        </div>
        <div className="fbi-lang" lang="en">
          <h3>{FEEDBACK_INVITE.en.title}</h3>
          <p>{FEEDBACK_INVITE.en.text}</p>
        </div>
        {mail}
      </div>
    </aside>
  );
}

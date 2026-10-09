import Link from 'next/link';
import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import { LegalBody } from '@/components/legal/LegalBody';
import type { LegalSection } from '@/components/legal/LegalBody';

export type { LegalSection };

export const LEGAL_UPDATED = '9 अक्टूबर 2026';

const RELATED = [
  { href: '/privacy-policy', icon: 'fa-user-shield', label: 'गोपनीयता नीति', desc: 'आपकी जानकारी कैसे सुरक्षित रहती है' },
  { href: '/terms-and-conditions', icon: 'fa-file-signature', label: 'नियम एवं शर्तें', desc: 'मेहफ़िल के उपयोग के नियम' },
  { href: '/disclaimer', icon: 'fa-info-circle', label: 'अस्वीकरण', desc: 'सामग्री और सेवा की सीमाएँ' },
  { href: '/copyright-policy', icon: 'fa-copyright', label: 'कॉपीराइट नीति', desc: 'रचनाकारों के अधिकार और शिकायत' },
  { href: '/community-guidelines', icon: 'fa-handshake', label: 'समुदाय दिशानिर्देश', desc: 'सम्मानजनक महफ़िल के नियम' },
  { href: '/cookie-policy', icon: 'fa-cookie-bite', label: 'कुकी नीति', desc: 'ब्राउज़र स्टोरेज का उपयोग' },
  { href: '/submission-guidelines', icon: 'fa-pen-fancy', label: 'रचना प्रकाशन दिशानिर्देश', desc: 'रचना प्रकाशित करने से पहले' },
  { href: '/faq', icon: 'fa-question-circle', label: 'अक्सर पूछे जाने वाले प्रश्न', desc: 'आम सवालों के जवाब' },
  { href: '/report-content', icon: 'fa-flag', label: 'सामग्री की रिपोर्ट करें', desc: 'आपत्तिजनक सामग्री की शिकायत' },
];

/** Same metadata shape the existing static pages (e.g. /about-contact) use. */
export function legalMetadata(title: string, description: string, path: string, noindex = false): Metadata {
  const full = `${title} | Mehfil`;
  return {
    title: { absolute: full },
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: full, description, url: path, type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: full, description, images: [DEFAULT_OG_IMAGE.url] },
  };
}

export function LegalHero({ icon, title, intro, chips = [] }: { icon: string; title: string; intro: string; chips?: Array<{ icon: string; text: string }> }) {
  return (
    <header className="lg-hero glass-panel">
      <span className="lg-hero-orn lg-hero-orn-a" aria-hidden="true">❦</span>
      <span className="lg-hero-orn lg-hero-orn-b" aria-hidden="true">✿</span>
      <div className="lg-badge" aria-hidden="true"><i className={`fas ${icon}`} /></div>
      <h1>{title}</h1>
      <p>{intro}</p>
      {chips.length > 0 && (
        <div className="lg-chips">
          {chips.map((c) => <span key={c.text}><i className={`far ${c.icon}`} /> {c.text}</span>)}
        </div>
      )}
    </header>
  );
}

export function LegalCta() {
  return (
    <div className="lg-cta">
      <div>
        <h3>कोई सवाल या शिकायत है?</h3>
        <p>हमें बताइए, हम आपकी बात ध्यान से पढ़ेंगे।</p>
      </div>
      <div className="lg-cta-actions">
        <Link href="/about-contact#contact" className="lg-cta-btn solid"><i className="fas fa-envelope" /> संपर्क करें</Link>
        <Link href="/report-content" className="lg-cta-btn"><i className="fas fa-flag" /> रिपोर्ट करें</Link>
      </div>
    </div>
  );
}

export function LegalRelated({ current }: { current: string }) {
  const at = RELATED.findIndex((r) => r.href === current);
  const ordered = [...RELATED.slice(at + 1), ...RELATED.slice(0, Math.max(at, 0))].filter((r) => r.href !== current).slice(0, 6);
  return (
    <section className="lg-related" aria-label="अन्य पृष्ठ">
      <h2>ये भी पढ़ें</h2>
      <div className="lg-related-grid">
        {ordered.map((r) => (
          <Link key={r.href} href={r.href} className="lg-rel-card">
            <span className="lg-rel-icon"><i className={`fas ${r.icon}`} /></span>
            <span className="lg-rel-text"><strong>{r.label}</strong><small>{r.desc}</small></span>
            <i className="fas fa-arrow-right lg-rel-arrow" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function LegalPage({
  title, intro, sections, current, icon = 'fa-file-alt', highlights = [],
}: {
  title: string; intro: string; sections: LegalSection[]; current: string; icon?: string;
  highlights?: Array<{ icon: string; title: string; text: string }>;
}) {
  const words = sections.reduce((n, s) => n + [...(s.paras || []), ...(s.items || []), s.heading].join(' ').split(/\s+/).length, 0);
  const minutes = Math.max(1, Math.round(words / 160));
  return (
    <section className="mf-page lg-page">
      <div className="mehfil-container">
        <LegalHero
          icon={icon}
          title={title}
          intro={intro}
          chips={[{ icon: 'fa-calendar-alt', text: `अंतिम अपडेट: ${LEGAL_UPDATED}` }, { icon: 'fa-clock', text: `लगभग ${minutes} मिनट में पढ़ें` }]}
        />

        {highlights.length > 0 && (
          <div className="lg-highlights">
            {highlights.map((h) => (
              <div key={h.title} className="lg-hl">
                <span className="lg-hl-icon"><i className={`fas ${h.icon}`} /></span>
                <strong>{h.title}</strong>
                <p>{h.text}</p>
              </div>
            ))}
          </div>
        )}

        <LegalBody sections={sections} />
        <LegalCta />
        <LegalRelated current={current} />
      </div>
    </section>
  );
}

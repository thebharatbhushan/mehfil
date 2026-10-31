import Link from 'next/link';
import { BrandLogo } from '@/components/site/BrandLogo';
import { NewsletterForm } from '@/components/site/NewsletterForm';
import { BecomeMemberLink } from '@/components/site/BecomeMemberLink';
import { FeedbackInvite } from '@/components/site/FeedbackInvite';

export function Footer() {
  return (
    <footer>
      <div className="mehfil-container footer-main">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo footer-logo-img">
              <BrandLogo tone="light" alt="मेहफ़िल — Mehfil" />
            </div>
            <p className="footer-desc">
              A sanctuary for Hindi &amp; Urdu poetry — where words find wings
              and emotions echo timelessly. Join a community of passionate
              storytellers.
            </p>
            <div className="social-icons">
              <a href="#" aria-label="Instagram"><i className="fab fa-instagram" /></a>
            </div>
            {/* Android app: official APKPure listing for in.mehfil.app (opens in a new tab, current session untouched). */}
            <a
              className="app-download"
              href="https://apkpure.net/mehfil-poetry/in.mehfil.app"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download the Mehfil Poetry Android app from APKPure (opens in a new tab)"
            >
              <img src="/mehfil-app-icon.png" alt="Mehfil Android app icon" width={44} height={44} loading="lazy" decoding="async" />
              <span className="app-download-text">
                <small>APKPure पर उपलब्ध</small>
                <strong>Download Android App</strong>
              </span>
              <i className="fab fa-android app-download-android" aria-hidden="true" />
            </a>
          </div>

          <div className="footer-col">
            <h4>Explore</h4>
            <div className="footer-links">
              <Link href="/"><i className="fas fa-chevron-right" /> विशेष रचनाएँ</Link>
              <Link href="/poets"><i className="fas fa-chevron-right" /> लोकप्रिय रचनाकार</Link>
              <Link href="/category"><i className="fas fa-chevron-right" /> Poetry Moods</Link>
              <Link href="/dictionary"><i className="fas fa-chevron-right" /> शब्दकोश</Link>
              <Link href="/poems"><i className="fas fa-chevron-right" /> Community Hub</Link>
            </div>
          </div>

          <div className="footer-col">
            <h4>Community</h4>
            <div className="footer-links">
              <Link href="/publish"><i className="fas fa-chevron-right" /> Write a Poem</Link>
              <Link href="/about-contact"><i className="fas fa-chevron-right" /> About Us / Contact Us</Link>
              <Link href="/feedback"><i className="fas fa-chevron-right" /> Feedback</Link>
              <Link href="/faq"><i className="fas fa-chevron-right" /> FAQ</Link>
              <Link href="/submission-guidelines"><i className="fas fa-chevron-right" /> Submission Guidelines</Link>
              <BecomeMemberLink><i className="fas fa-chevron-right" /> Become a Member</BecomeMemberLink>
            </div>
          </div>

          <div className="footer-col">
            <h4>पत्रिका</h4>
            <p className="newsletter-text">
              Subscribe to receive poetic musings &amp; latest verses in your
              inbox.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <FeedbackInvite variant="footer" />

        <div className="footer-bottom">
          <span>
            © 2026 Mehfil — Crafted with <span className="heart-beat">❤️</span> for
            poetry lovers.
          </span>
          <div className="footer-bottom-links">
            <Link href="/privacy-policy">गोपनीयता नीति</Link>
            <Link href="/terms-and-conditions">नियम एवं शर्तें</Link>
            <Link href="/disclaimer">अस्वीकरण</Link>
            <Link href="/copyright-policy">कॉपीराइट नीति</Link>
            <Link href="/community-guidelines">समुदाय दिशानिर्देश</Link>
            <Link href="/cookie-policy">कुकी नीति</Link>
            <Link href="/report-content">रिपोर्ट करें</Link>
            <Link href="/about-contact">संपर्क</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

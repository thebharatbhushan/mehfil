import Link from 'next/link';

export function Footer() {
  return (
    <footer>
      <div className="mehfil-container footer-main">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <i className="fas fa-feather-alt" /> मेहफ़िल
            </div>
            <p className="footer-desc">
              A sanctuary for Hindi &amp; Urdu poetry — where words find wings
              and emotions echo timelessly. Join a community of passionate
              storytellers.
            </p>
            <div className="social-icons">
              <a href="#" aria-label="Instagram"><i className="fab fa-instagram" /></a>
              <a href="#" aria-label="Twitter"><i className="fab fa-twitter" /></a>
              <a href="#" aria-label="YouTube"><i className="fab fa-youtube" /></a>
              <a href="#" aria-label="GitHub"><i className="fab fa-github" /></a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Explore</h4>
            <div className="footer-links">
              <Link href="/"><i className="fas fa-chevron-right" /> विशेष रचनाएँ</Link>
              <Link href="/poets"><i className="fas fa-chevron-right" /> लोकप्रिय रचनाकार</Link>
              <Link href="/category"><i className="fas fa-chevron-right" /> Poetry Moods</Link>
              <Link href="/poems"><i className="fas fa-chevron-right" /> Community Hub</Link>
            </div>
          </div>

          <div className="footer-col">
            <h4>Community</h4>
            <div className="footer-links">
              <Link href="/publish"><i className="fas fa-chevron-right" /> Write a Poem</Link>
              <a href="#"><i className="fas fa-chevron-right" /> Join Events</a>
              <a href="#"><i className="fas fa-chevron-right" /> Feedback</a>
              <Link href="/signup"><i className="fas fa-chevron-right" /> Become a Member</Link>
            </div>
          </div>

          <div className="footer-col">
            <h4>पत्रिका</h4>
            <p className="newsletter-text">
              Subscribe to receive poetic musings &amp; latest verses in your
              inbox.
            </p>
            <div className="newsletter-form">
              <input type="email" placeholder="your@email.com" />
              <button><i className="fas fa-paper-plane" /> Subscribe</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © 2026 Mehfil — Crafted with <span className="heart-beat">❤️</span> for
            poetry lovers.
          </span>
          <div className="footer-bottom-links">
            <a href="#">गोपनीयता नीति</a>
            <a href="#">नियम एवं शर्तें</a>
            <a href="#">संपर्क</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

import type { Book } from '@/lib/mehfil';
import './books.css';

/**
 * Public "किताबें" shelf on a writer's profile: cover + title, each linking out to where the book can be read or bought.
 * The API only ever sends books an admin has approved. Links are https-only (validated by the server) and open in a new tab.
 */
export function BooksShowcase({ books }: { books?: Book[] }) {
  const list = (books || []).filter((b) => b && b._id && b.title && b.coverUrl && /^https:\/\//i.test(b.link || ''));
  if (!list.length) return null;
  return (
    <section className="ap-section bk-section fade-up" aria-labelledby="bk-title">
      <h2 className="ap-section-title" id="bk-title">
        <span className="ap-section-kicker">पुस्तकें</span>किताबें
      </h2>
      <ul className="bk-grid" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {list.map((b) => (
          <li key={b._id}>
            <a className="bk-card" href={b.link} target="_blank" rel="noopener noreferrer nofollow ugc" aria-label={`${b.title} — किताब देखें`}>
              <img className="bk-cover" src={b.coverUrl} alt={`${b.title} का कवर`} loading="lazy" decoding="async" />
              <span className="bk-title">{b.title}</span>
              <span className="bk-cta">
                किताब देखें <i className="fas fa-external-link-alt" aria-hidden="true" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default BooksShowcase;

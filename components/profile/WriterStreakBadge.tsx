import { sanitizeStreak } from '@/lib/streak';
import './streak.css';

/**
 * Profile badge for the weekly writing streak: +1 for every week (Mon–Sun) with at least one published poem.
 * Hidden when there is no active streak. On the member's own profile (isOwner) it also nudges them to keep it alive.
 */
export function WriterStreakBadge({ streak, isOwner = false }: { streak?: unknown; isOwner?: boolean }) {
  const s = sanitizeStreak(streak);
  if (!s || s.current < 1) return null;
  const hint = isOwner
    ? s.atRisk
      ? 'इस हफ़्ते (रविवार तक) एक रचना लिखिए, स्ट्रीक बनी रहेगी।'
      : s.wroteThisWeek
        ? 'इस हफ़्ते की रचना दर्ज हो गई — अगले हफ़्ते फिर मिलिए।'
        : ''
    : '';
  const title = [`${s.current} हफ़्तों से लगातार लेखन`, s.milestone?.label, s.longest > s.current ? `सबसे लंबी स्ट्रीक: ${s.longest} हफ़्ते` : ''].filter(Boolean).join(' · ');
  return (
    <div className="mf-streak-wrap">
      <span className={`mf-streak${s.atRisk && isOwner ? ' is-at-risk' : ''}`} title={title} role="img" aria-label={title} data-tier={s.milestone?.weeks ?? 1}>
        <i className="fas fa-fire" aria-hidden="true" />
        <strong>{s.current}</strong>
        <span>हफ़्ते की स्ट्रीक</span>
        {s.milestone && <em>{s.milestone.label}</em>}
      </span>
      {hint && <p className="mf-streak-hint">{hint}</p>}
    </div>
  );
}

export default WriterStreakBadge;

import { ProfileBadge, sanitizeBadges, badgeTone } from '@/lib/recognition';

const FA_ICON = /^fa-[a-z0-9-]{1,40}$/;
const HTTPS_URL = /^https:\/\/[^\s"'<>]{1,300}$/;

function BadgeIcon({ icon, name }: { icon?: string; name: string }) {
  const value = (icon || '').trim();
  if (FA_ICON.test(value)) return <i className={`fas ${value}`} aria-hidden="true" />;
  if (HTTPS_URL.test(value)) return <img src={value} alt="" width={28} height={28} loading="lazy" decoding="async" />;
  return <span aria-hidden="true">{value.slice(0, 4) || name.slice(0, 1)}</span>;
}

/**
 * Round medals for the badges a writer has earned, shown under the name like the social icons.
 * Only unlocked badges appear, each with its name underneath. With onShare (own profile) a medal opens the share card.
 */
export function BadgeMedals({ badges, onShare }: { badges?: ProfileBadge[]; onShare?: (badge: ProfileBadge) => void }) {
  const earned = sanitizeBadges(badges).filter((b) => b.unlocked);
  if (!earned.length) return null;
  return (
    <ul className="mf-medals" aria-label="प्राप्त बैज">
      {earned.map((b) => (
        <li key={b.key}>
          {onShare ? (
            <button type="button" className="mf-medal" data-tone={badgeTone(b.key)} title={`${b.name} — साझा करें`} aria-label={`${b.name} साझा करें`} onClick={() => onShare(b)}>
              <BadgeIcon icon={b.icon} name={b.name} />
            </button>
          ) : (
            <span className="mf-medal" data-tone={badgeTone(b.key)} title={b.description ? `${b.name} — ${b.description}` : b.name} role="img" aria-label={b.name}>
              <BadgeIcon icon={b.icon} name={b.name} />
            </span>
          )}
          <span className="mf-medal-name">{b.name}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Collapsible badge shelf. Earned badges are full colour, locked ones grayscale. Only earned badges get
 * a share button (when onShare is given). Names/icons/descriptions only — never XP, thresholds or progress.
 */
export function ProfileBadges({ badges, title = 'उपलब्धियाँ', kicker = 'बैज', onShare, defaultOpen = false }: { badges?: ProfileBadge[]; title?: string; kicker?: string; onShare?: (badge: ProfileBadge) => void; defaultOpen?: boolean }) {
  const list = sanitizeBadges(badges);
  if (!list.length) return null;
  const earned = list.filter((b) => b.unlocked).length;

  return (
    <details className="mf-badges-dd" open={defaultOpen}>
      <summary>
        <span className="mf-dd-title"><span className="ap-section-kicker">{kicker}</span>{title}</span>
        <span className="mf-dd-count">{earned}/{list.length} प्राप्त</span>
        <i className="fas fa-chevron-down mf-dd-chev" aria-hidden="true" />
      </summary>
      <ul className="mf-badge-grid">
        {list.map((b) => (
          <li key={b.key} className={`mf-badge ${b.unlocked ? 'is-unlocked' : 'is-locked'}`} title={b.description || b.name} data-tone={badgeTone(b.key)}>
            <span className="mf-badge-icon" data-tone={badgeTone(b.key)}><BadgeIcon icon={b.icon} name={b.name} /></span>
            <span className="mf-badge-name">{b.name}</span>
            {b.description && <span className="mf-badge-desc">{b.description}</span>}
            {b.unlocked && onShare ? (
              <button type="button" className="mf-badge-share" onClick={() => onShare(b)} aria-label={`${b.name} साझा करें`}>
                <i className="fas fa-share-alt" aria-hidden="true" /> साझा करें
              </button>
            ) : (
              <span className="mf-badge-state">{b.unlocked ? 'प्राप्त' : 'लॉक्ड'}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default ProfileBadges;

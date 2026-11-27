import { badgeTone } from '@/lib/recognition';

const FA_ICON = /^fa-[a-z0-9-]{1,40}$/;
const HTTPS_URL = /^https:\/\/[^\s"'<>]{1,300}$/;

/** Reuses the existing medal look (mf-badge-icon + data-tone) so referral badges match the rest of the site. */
export function RewardBadgeIcon({ badgeKey, icon, name, unlocked = true }: { badgeKey: string; icon?: string; name: string; unlocked?: boolean }) {
  const v = (icon || '').trim();
  return (
    <span className={`mf-badge-icon rw-medal${unlocked ? '' : ' is-locked'}`} data-tone={badgeTone(badgeKey)} role="img" aria-label={name}>
      {FA_ICON.test(v) ? <i className={`fas ${v}`} aria-hidden="true" />
        : HTTPS_URL.test(v) ? <img src={v} alt="" width={28} height={28} loading="lazy" decoding="async" />
        : <span aria-hidden="true">{v.slice(0, 4) || name.slice(0, 1)}</span>}
    </span>
  );
}

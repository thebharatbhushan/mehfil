import { getVisibleSocialLinks, SocialKey } from '@/lib/socialLinks';

/**
 * The one place social icons are rendered.
 *
 *   <ProfileSocialLinks socialLinks={user.socialLinks} />                      compact icon row (cards)
 *   <ProfileSocialLinks socialLinks={user.socialLinks} variant="connect" />    "Connect with me" list
 *
 * Renders nothing when the user has no valid links, so there are never empty/broken icons.
 * Every URL is re-validated (http/https only) before it reaches an href.
 * Icons use the project's existing Font Awesome stylesheet; X gets an inline SVG because the
 * bundled Font Awesome version predates the X logo.
 */

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const ICON_CLASS: Record<Exclude<SocialKey, 'x'>, string> = {
  instagram: 'fab fa-instagram',
  facebook: 'fab fa-facebook-f',
  youtube: 'fab fa-youtube',
  linkedin: 'fab fa-linkedin-in',
  goodreads: 'fab fa-goodreads-g',
  website: 'fas fa-globe',
};

export function SocialIcon({ platform }: { platform: SocialKey }) {
  if (platform === 'x') return <XIcon />;
  return <i className={ICON_CLASS[platform]} aria-hidden="true" />;
}

interface Props {
  socialLinks: unknown;
  variant?: 'icons' | 'connect' | 'chips';
  /** Extra class for the wrapper (layout tweaks per card). */
  className?: string;
  /** Person's display name — used only to make aria-labels more helpful. */
  ownerName?: string;
}

export function ProfileSocialLinks({ socialLinks, variant = 'icons', className = '', ownerName }: Props) {
  const links = getVisibleSocialLinks(socialLinks);
  if (links.length === 0) return null;

  if (variant === 'connect') {
    return (
      <section className={`ps-connect ${className}`.trim()} aria-labelledby="ps-connect-title">
        <h2 id="ps-connect-title" className="ps-connect-title">
          <span className="ps-connect-orn" aria-hidden="true">❦</span> Connect with me
          <span className="ps-connect-hindi">जुड़िए मेरे साथ</span>
        </h2>
        <ul className="ps-connect-list">
          {links.map((link) => (
            <li key={link.key}>
              <a
                className={`ps-connect-item ps-${link.key}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                aria-label={`${link.label}${ownerName ? ` — ${ownerName}` : ''} (नए टैब में खुलेगा)`}
              >
                <span className="ps-connect-icon"><SocialIcon platform={link.key} /></span>
                <span className="ps-connect-text">
                  <strong>{link.label}</strong>
                  {link.handle && <small>{link.handle}</small>}
                </span>
                <i className="fas fa-external-link-alt ps-connect-arrow" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (variant === 'chips') {
    // Labelled pills for the settings page (re-uses the existing .profile-social-list look).
    return (
      <div className={`profile-social-list ${className}`.trim()}>
        {links.map((link) => (
          <a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            aria-label={`${link.label} (नए टैब में खुलेगा)`}
          >
            <SocialIcon platform={link.key} /> {link.label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <ul className={`ps-icons ${className}`.trim()} aria-label="सोशल लिंक">
      {links.map((link) => (
        <li key={link.key}>
          <a
            className={`ps-icon ps-${link.key}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            aria-label={`${link.label}${ownerName ? ` — ${ownerName}` : ''} (नए टैब में खुलेगा)`}
            title={link.label}
          >
            <SocialIcon platform={link.key} />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default ProfileSocialLinks;

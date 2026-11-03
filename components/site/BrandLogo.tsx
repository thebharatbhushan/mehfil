/**
 * Official Mehfil logo.
 *  - variant "full": feather pen + "mehfil" wordmark + "मेहफ़िल" (public/mehfil-logo*.png, 1718 x 768)
 *  - variant "mark": the feather pen alone (public/mehfil-mark.png, 586 x 643) for tight spots
 *  - tone "dark" (default): maroon + gold, for light backgrounds
 *  - tone "light": cream + gold, for dark backgrounds (footer, loader)
 * Plain <img> with explicit width/height so the layout never shifts while it loads.
 */
const SRC = {
  full: { dark: '/mehfil-logo.png', light: '/mehfil-logo-light.png', w: 1718, h: 768 },
  mark: { dark: '/mehfil-mark.png', light: '/mehfil-mark.png', w: 586, h: 643 },
} as const;

interface BrandLogoProps {
  variant?: 'full' | 'mark';
  tone?: 'dark' | 'light';
  className?: string;
  /** Set when the logo is the only thing naming a link/button; otherwise it is treated as decorative. */
  alt?: string;
  priority?: boolean;
}

export function BrandLogo({ variant = 'full', tone = 'dark', className = '', alt = 'मेहफ़िल', priority = false }: BrandLogoProps) {
  const s = SRC[variant];
  const img = (src: string, extra: string, lazy: boolean, decorative = false) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={s.w}
      height={s.h}
      alt={decorative ? '' : alt}
      aria-hidden={decorative || undefined}
      className={`brand-logo brand-logo-${variant} ${extra} ${className}`.trim()}
      decoding="async"
      loading={lazy ? 'lazy' : 'eager'}
      draggable={false}
    />
  );
  // On a light background the full logo has a cream "dark mode" twin (shown only when the site theme is dark).
  if (variant === 'full' && tone === 'dark') {
    return (
      <>
        {img(s.dark, 'brand-logo-on-light', !priority)}
        {img(s.light, 'brand-logo-on-dark', true, true)}
      </>
    );
  }
  return img(s[tone], '', !priority);
}

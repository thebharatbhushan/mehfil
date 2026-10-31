/** @type {import('next').NextConfig} */
// Content-Security-Policy. 'unsafe-inline' is required by Next.js inline bootstrap scripts, JSON-LD and the site's
// inline styles. Remote hosts used by the site: Font Awesome (cdnjs), Google Sign-In (accounts.google.com),
// YouTube embeds, Cloudinary / Google / ui-avatars images, and the backend API (connect-src https:).
// 'unsafe-eval' is added ONLY in `next dev` (React/webpack dev tooling uses eval); production stays strict.
const isDev = process.env.NODE_ENV !== 'production';
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://accounts.google.com`,
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://accounts.google.com",
  "font-src 'self' data: https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://accounts.google.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Invisible hardening headers (no effect on rendering).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
          // Deprecated header; "0" is the value current guidance recommends (the legacy XSS auditor itself had bugs).
          { key: 'X-XSS-Protection', value: '0' },
          // same-origin-allow-popups keeps the Google sign-in popup working (plain same-origin would break it).
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        ],
      },
    ];
  },
  // Old static-site links (author.html?id=...) keep working; the query string is preserved.
  async redirects() {
    return [{ source: '/author.html', destination: '/author', permanent: true }];
  },
};

module.exports = nextConfig;

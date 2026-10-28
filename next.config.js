/** @type {import('next').NextConfig} */
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

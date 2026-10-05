/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Old static-site links (author.html?id=...) keep working; the query string is preserved.
  async redirects() {
    return [{ source: '/author.html', destination: '/author', permanent: true }];
  },
};

module.exports = nextConfig;

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/profile', '/publish'] },
    sitemap: 'https://mehfil.vercel.app/sitemap.xml',
  };
}

import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private / account pages only. Public content (/poem, /u, /category, /poems, /poets) and the assets under /_next stay crawlable.
      // (The legacy /author?id= redirector is deliberately NOT listed: it is noindex, which Google can only honour if it may crawl it.)
      disallow: ['/login', '/signup', '/profile', '/publish', '/admin'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

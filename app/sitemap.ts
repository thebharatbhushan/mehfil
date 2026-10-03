import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://mehfil.vercel.app';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/poems`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/poets`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/category`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];
}

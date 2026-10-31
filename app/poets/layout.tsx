import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';

export const metadata: Metadata = {
  title: { absolute: 'हिंदी कवि और शायर — रचनाकारों की सूची | Mehfil' },
  description: 'मेहफ़िल के कवियों और शायरों से मिलिए — उनकी प्रोफ़ाइल, परिचय और रचनाएँ पढ़ें।',
  alternates: { canonical: '/poets' },
  openGraph: { title: 'हिंदी कवि और शायर | Mehfil', description: 'मेहफ़िल के कवियों और शायरों से मिलिए और उनकी रचनाएँ पढ़ें।', url: '/poets', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: 'हिंदी कवि और शायर | Mehfil', description: 'मेहफ़िल के कवियों और शायरों से मिलिए और उनकी रचनाएँ पढ़ें।', images: [DEFAULT_OG_IMAGE.url] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

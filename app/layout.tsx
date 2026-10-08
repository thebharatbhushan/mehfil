import './globals.css';
import type { Metadata } from 'next';
import './fonts';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Orbs } from '@/components/site/Orbs';
import { ScrollIndicator } from '@/components/site/ScrollIndicator';
import { ToastProvider } from '@/components/site/ToastProvider';
import { BottomNav } from '@/components/site/BottomNav';
import { BirthdayCard } from '@/components/birthday/BirthdayCard';
import { JsonLd } from '@/components/site/JsonLd';
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/seo';
import { API_BASE_URL } from '@/lib/mehfil';
import { DeferredStylesheet } from '@/components/site/DeferredStylesheet';

const SITE_DESCRIPTION =
  'मेहफ़िल — हिंदी और उर्दू कविता, शायरी और साहित्य का मंच। दिल को छू लेने वाली कविताएँ पढ़ें, रचनाकारों से मिलें और अपनी रचनाएँ साझा करें। Hindi & Urdu poetry community.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Mehfil — हिंदी कविता, शायरी और साहित्य',
    template: '%s | Mehfil',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'Hindi poetry',
    'Urdu poetry',
    'shayari',
    'kavita',
    'Mehfil',
    'poetry community',
    'Hindi kavita',
    'Urdu shayari',
    'poems',
    'poets',
    'literature',
    'creative writing',
  ],
  authors: [{ name: 'Mehfil' }],
  openGraph: {
    title: 'Mehfil — हिंदी कविता, शायरी और साहित्य',
    description: SITE_DESCRIPTION,
    url: '/',
    type: 'website',
    locale: 'hi_IN',
    siteName: 'Mehfil',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mehfil — हिंदी कविता, शायरी और साहित्य',
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
  // viewport-fit=cover lets the mobile bottom navigation respect device safe areas.
  viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover' },
  themeColor: '#C16A4B',
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href={API_BASE_URL} crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <DeferredStylesheet href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
      </head>
      <body>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Mehfil',
            alternateName: 'मेहफ़िल',
            url: SITE_URL,
            inLanguage: ['hi', 'ur'],
            description: SITE_DESCRIPTION,
          }}
        />
        <ToastProvider>
          <Orbs />
          <ScrollIndicator />
          <Header />
          {children}
          <Footer />
          <BottomNav />
          <BirthdayCard />
        </ToastProvider>
      </body>
    </html>
  );
}

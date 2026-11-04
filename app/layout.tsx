import './globals.css';
import './dark-theme.css';
import './site-controls.css';
import type { Metadata } from 'next';
import './fonts';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Orbs } from '@/components/site/Orbs';
import { ScrollIndicator } from '@/components/site/ScrollIndicator';
import { ToastProvider } from '@/components/site/ToastProvider';
import { BottomNav } from '@/components/site/BottomNav';
import { BirthdayCard } from '@/components/birthday/BirthdayCard';
import { SpotlightPopup } from '@/components/spotlight/SpotlightPopup';
import { JsonLd } from '@/components/site/JsonLd';
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/seo';
import { API_BASE_URL } from '@/lib/mehfil';
import { DeferredStylesheet } from '@/components/site/DeferredStylesheet';
import { MehfilLoader } from '@/components/site/MehfilLoader';
import { RouteLoader } from '@/components/site/RouteLoader';

const SITE_DESCRIPTION =
  'मेहफ़िल — हिंदी और उर्दू कविता, शायरी और साहित्य का मंच। दिल को छू लेने वाली कविताएँ पढ़ें, रचनाकारों से मिलें और अपनी रचनाएँ साझा करें।';

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
    <html lang="hi" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint (no light flash). Default stays light. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('mehfil_theme');if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)){var r=document.documentElement;r.setAttribute('data-theme','dark');r.style.colorScheme='dark';}}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href={API_BASE_URL} crossOrigin="anonymous" />
        <DeferredStylesheet href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">मुख्य सामग्री पर जाएँ</a>
        <MehfilLoader />
        <RouteLoader />
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
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: 'Mehfil',
            alternateName: 'मेहफ़िल',
            url: SITE_URL,
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/mehfil-logo.png`, width: 1200, height: 536 },
          }}
        />
        <ToastProvider>
          <Orbs />
          <ScrollIndicator />
          <Header />
          <main id="main-content" tabIndex={-1}>{children}</main>
          <Footer />
          <BottomNav />
          <BirthdayCard />
          <SpotlightPopup />
        </ToastProvider>
      </body>
    </html>
  );
}

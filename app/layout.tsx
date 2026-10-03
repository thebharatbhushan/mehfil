import './globals.css';
import type { Metadata } from 'next';
import './fonts';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Orbs } from '@/components/site/Orbs';
import { ScrollIndicator } from '@/components/site/ScrollIndicator';
import { ToastProvider } from '@/components/site/ToastProvider';
import { BottomNav } from '@/components/site/BottomNav';

export const metadata: Metadata = {
  title: {
    default: 'Mehfil — Immersive Poetry Sanctuary | Hindi Urdu Community',
    template: '%s — Mehfil Poetry Sanctuary',
  },
  description:
    'A premium Hindi & Urdu poetry sanctuary where unspoken silence flows into verses. Discover soulful poems, meet authentic voices, and let your emotions bloom.',
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
    title: 'Mehfil — Immersive Poetry Sanctuary',
    description:
      'A premium Hindi & Urdu poetry sanctuary where unspoken silence flows into verses. Discover soulful poems, meet authentic voices, and let your emotions bloom.',
    type: 'website',
    locale: 'hi_IN',
    siteName: 'Mehfil',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Mehfil Poetry Sanctuary' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mehfil — Immersive Poetry Sanctuary',
    description: 'A premium Hindi & Urdu poetry sanctuary where words find wings.',
    images: ['/og-image.png'],
  },
  // viewport-fit=cover lets the mobile bottom navigation respect device safe areas.
  viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover' },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
      </head>
      <body>
        <ToastProvider>
          <Orbs />
          <ScrollIndicator />
          <Header />
          {children}
          <Footer />
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}

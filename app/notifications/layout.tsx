import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'सूचनाएँ',
  alternates: { canonical: '/notifications' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

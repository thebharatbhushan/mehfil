import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'नई रचना प्रकाशित करें', alternates: { canonical: '/publish' }, robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from 'next';

const TITLE = 'Mehfil Rewards — Refer & Earn, बैज, फ़्रेम और लीडरबोर्ड | Mehfil';
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: 'दोस्तों को मेहफ़िल से जोड़िए और XP, बैज और प्रोफ़ाइल फ़्रेम कमाइए।',
  robots: { index: false, follow: false }, // private member area
  alternates: { canonical: '/rewards' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

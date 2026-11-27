import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'मेहफ़िल से जुड़िए | Mehfil' },
  description: 'मेहफ़िल — हिन्दी, उर्दू और अंग्रेज़ी साहित्य का घर। एक दोस्त के बुलावे पर जुड़िए।',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

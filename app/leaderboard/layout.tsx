import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';

const TITLE = 'साप्ताहिक लीडरबोर्ड — इस हफ़्ते के शीर्ष और उभरते रचनाकार | Mehfil';
const DESCRIPTION = 'इस हफ़्ते के शीर्ष रचनाकार और तेज़ी से उभरते नए स्वर — लिखने की निरंतरता, पाठकों के जुड़ाव और सराहना के आधार पर।';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/leaderboard' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/leaderboard', type: 'website', siteName: 'Mehfil', locale: 'hi_IN', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

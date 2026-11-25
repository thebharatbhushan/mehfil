import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';

export default function LeaderboardPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: 'होम', path: '/' }, { name: 'साप्ताहिक लीडरबोर्ड', path: '/leaderboard' }]} />
      <LeaderboardClient />
    </>
  );
}

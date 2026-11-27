import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { RewardsClient } from '@/components/rewards/RewardsClient';

export default function RewardsPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: 'होम', path: '/' }, { name: 'Mehfil Rewards', path: '/rewards' }]} />
      <RewardsClient />
    </>
  );
}

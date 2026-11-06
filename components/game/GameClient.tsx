'use client';

import dynamic from 'next/dynamic';

// Phaser needs `window`, so it is loaded in the browser only (no SSR, and the Phaser bundle stays out of every other page).
const PhaserGame = dynamic(() => import('./PhaserGame'), {
  ssr: false,
  loading: () => (
    <div className="sg-wrap" lang="hi">
      <div className="sg-status" role="status">
        <span className="sg-spin" aria-hidden="true" />
        खेल तैयार हो रहा है…
      </div>
    </div>
  ),
});

export function GameClient() {
  return <PhaserGame />;
}

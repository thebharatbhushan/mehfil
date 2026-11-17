'use client';

import { SherGame } from './SherGame';

// "शेर पूरा कीजिए" is now plain React + CSS (no Phaser), so the page ships a much smaller bundle and starts faster.
export function GameClient() {
  return <SherGame />;
}

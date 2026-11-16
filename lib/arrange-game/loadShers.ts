import bundled from './shers.json';
import { sanitizeShers, type Sher } from './engine';

/**
 * The single place the shers come from. Today it is the maintained JSON file (lib/arrange-game/shers.json).
 * The Mehfil API is a separate service that is not part of this repo, so there is no endpoint to call yet; when one
 * exists, fetch it here and keep `sanitizeShers` in front of it. The component never needs to change.
 */
export async function loadShers(): Promise<Sher[]> {
  return sanitizeShers(bundled);
}

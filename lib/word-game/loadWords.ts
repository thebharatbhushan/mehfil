import bundled from './words.json';
import { sanitizeWords, type Word } from './engine';

/**
 * The single place the words come from. Today it is the maintained JSON file (lib/word-game/words.json).
 * The Mehfil API is a separate service that is not part of this repo, so there is no endpoint to call yet; when one
 * exists, fetch it here and keep `sanitizeWords` in front of it. The component never needs to change.
 */
export async function loadWords(): Promise<Word[]> {
  return sanitizeWords(bundled);
}

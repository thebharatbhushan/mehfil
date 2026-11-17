import bundled from './questions.json';
import { sanitizeQuestions, type Question } from './engine';

/**
 * The single place the compositions come from. Today it is the maintained JSON file (lib/form-game/questions.json).
 * The Mehfil API/admin is a separate service that is not part of this repo; when an endpoint exists, fetch it here and
 * keep `sanitizeQuestions` in front of it. The component never needs to change.
 */
export async function loadQuestions(): Promise<Question[]> {
  return sanitizeQuestions(bundled);
}

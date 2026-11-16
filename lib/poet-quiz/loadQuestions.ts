import bundled from './questions.json';
import { sanitizeQuestions, type Question } from './engine';

/**
 * The single place the questions come from. Today it is the maintained JSON file (lib/poet-quiz/questions.json).
 * The Mehfil API is a separate service that is not part of this repo, so there is no endpoint to call yet; when one
 * exists, fetch it here and keep `sanitizeQuestions` in front of it. The component never needs to change.
 */
export async function loadQuestions(): Promise<Question[]> {
  return sanitizeQuestions(bundled);
}

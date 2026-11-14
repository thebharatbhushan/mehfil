import bundled from './questions.json';
import { sanitizeBank, type QuestionBank } from './engine';

/**
 * The single place the question bank comes from. Today it is the maintained JSON file (lib/poet-game/questions.json).
 * The Mehfil API is a separate service that is not part of this repo, so there is no endpoint to call yet; when one
 * exists, fetch it here and keep `sanitizeBank` in front of it. The component never needs to change.
 */
export async function loadQuestionBank(): Promise<QuestionBank> {
  return sanitizeBank(bundled);
}

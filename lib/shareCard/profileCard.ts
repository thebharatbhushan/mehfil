/**
 * Builds the data for a writer-profile share card. The card is drawn by the same engine as the poem card
 * (same themes, fonts, decorations, editor, download and share), so Hindi / Urdu text shaping is identical.
 *
 *   name        -> author name line
 *   title       -> "@username · N रचनाएँ" (plain, no curly quotes)
 *   body        -> short bio, then a blank line, then the first two lines of the writer's latest poem (a "sher")
 */
import type { SharePoemData } from './types';

export interface ProfileCardInput {
  /** Used in the file name. */
  id: string;
  name: string;
  username?: string;
  bio?: string;
  profilePic?: string;
  poemsCount?: number;
  /** Full text of the writer's latest published poem; its first two lines are shown on the card. */
  latestPoemBody?: string;
  /** Absolute public profile URL. */
  url?: string;
}

const BIO_MAX = 140;
const LINE_MAX = 90;

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  const cut = chars.slice(0, max - 1).join('');
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\-–—\s]+$/, '')}…`;
}

/** First two non-empty lines of a poem, each capped so they fit the card without shrinking the text. */
export function firstSherLines(body?: string): string {
  return (body || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((l) => clip(l, LINE_MAX))
    .join('\n');
}

export function buildProfileCardData(input: ProfileCardInput): SharePoemData {
  const bio = input.bio ? clip(input.bio, BIO_MAX) : '';
  const sher = firstSherLines(input.latestPoemBody);
  const body = [bio, sher].filter(Boolean).join('\n\n') || 'मेहफ़िल पर मेरी रचनाएँ पढ़ें';
  const count = Number(input.poemsCount) || 0;
  const handle = input.username ? `@${input.username}` : '';
  const title = [handle, count > 0 ? `${count} रचनाएँ` : ''].filter(Boolean).join(' · ');
  return {
    id: input.id,
    authorName: input.name,
    title: title || undefined,
    titlePlain: true,
    fileKind: 'writer',
    body,
    authorImage: input.profilePic,
    url: input.url,
  };
}

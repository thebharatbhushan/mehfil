/**
 * Share-card data for the daily homepage cards (आज का काव्य, आज का अधूरा काव्य).
 * They reuse the existing poem share card (editor, fonts, themes, PNG export, mehfilpoetry.in footer),
 * so nothing new is rendered - these helpers only shape the data the card already understands.
 */
import type { Sher } from '@/lib/daily';
import type { SharePoemData } from './types';

/** Origin of the running site; empty during SSR (the button is only ever rendered after data loads on the client). */
const siteOrigin = (): string => (typeof window !== 'undefined' ? window.location.origin : '');

/** आज का काव्य -> card. The poet is shown as the card's author; links to the full poem when it is a Mehfil poem. */
export function sherShareData(sher: Sher, dateKey: string): SharePoemData {
  return {
    id: `sher-${dateKey}`,
    title: 'आज का काव्य',
    authorName: sher.poet,
    body: `${sher.lines[0]}\n${sher.lines[1]}`,
    url: `${siteOrigin()}${sher.href || '/'}`,
  };
}

interface AdhuraShareInput {
  dateKey: string;
  firstLine: string;
  secondLine: string;
  /** Display name of the writer of the selected (second) line, if known. */
  writerName?: string;
  writerImage?: string;
}

/**
 * आज का अधूरा काव्य winner -> card. Only the second line is the writer's, so the name is labelled
 * "दूसरी पंक्ति: <name>" instead of crediting the whole couplet to them.
 */
export function adhuraShareData(input: AdhuraShareInput): SharePoemData {
  const name = (input.writerName || '').trim();
  return {
    id: `adhura-${input.dateKey}`,
    title: 'आज का अधूरा काव्य',
    authorName: name ? `दूसरी पंक्ति: ${name}` : 'मेहफ़िल',
    authorImage: name ? input.writerImage : undefined,
    body: `${input.firstLine}\n${input.secondLine}`,
    url: `${siteOrigin()}/`,
  };
}

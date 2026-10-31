/**
 * Public recognition data (badges + profile frame) returned by the Mehfil API.
 * Deliberately contains NO numeric XP, requirements or progress — the backend never sends them.
 */
export interface ProfileBadge {
  key: string;
  name: string;
  description?: string;
  icon?: string;
  unlocked: boolean;
  unlockedAt?: string | null;
}

export interface ProfileFrameInfo {
  key: string;
  name?: string;
}

export const FRAME_KEYS = ['default', 'bronze', 'silver', 'gold', 'special'] as const;
export type FrameKey = (typeof FRAME_KEYS)[number];

/** Only known frame keys ever reach a className. */
export function normalizeFrameKey(frame?: ProfileFrameInfo | string | null): FrameKey {
  const key = typeof frame === 'string' ? frame : frame?.key;
  return (FRAME_KEYS as readonly string[]).includes(key || '') ? (key as FrameKey) : 'default';
}

/** Extra class names for an existing avatar ring. Empty for the default frame, so nothing changes for it. */
export function frameClassName(frame?: ProfileFrameInfo | string | null): string {
  const key = normalizeFrameKey(frame);
  return key === 'default' ? '' : ` mf-frame mf-frame-${key}`;
}

export function frameLabel(frame?: ProfileFrameInfo | string | null): string {
  const labels: Record<FrameKey, string> = { default: '', bronze: 'ब्रॉन्ज़ फ़्रेम', silver: 'सिल्वर फ़्रेम', gold: 'गोल्ड फ़्रेम', special: 'विशेष फ़्रेम' };
  return labels[normalizeFrameKey(frame)];
}

export function sanitizeBadges(input: unknown): ProfileBadge[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
    .map((b) => ({
      key: String(b.key ?? ''),
      name: String(b.name ?? ''),
      description: typeof b.description === 'string' ? b.description : '',
      icon: typeof b.icon === 'string' ? b.icon : '',
      unlocked: b.unlocked === true,
      unlockedAt: typeof b.unlockedAt === 'string' ? b.unlockedAt : null,
    }))
    .filter((b) => b.key && b.name);
}

/** Premium metallic tones for badges. Single source of truth: used by the site (data-tone) and the share image. */
export const BADGE_TONES = [
  { name: 'gold',     light: '#fff3c4', mid: '#e8b93c', dark: '#a8741a', glow: '212,160,40' },
  { name: 'emerald',  light: '#b8f5d6', mid: '#18b57a', dark: '#0a6b48', glow: '16,150,100' },
  { name: 'sapphire', light: '#c4dcff', mid: '#3f7be0', dark: '#1c3f96', glow: '50,100,210' },
  { name: 'amethyst', light: '#e6ccff', mid: '#9b5de5', dark: '#5a2a9e', glow: '140,80,220' },
  { name: 'ruby',     light: '#ffc9d1', mid: '#e0385a', dark: '#8f1230', glow: '210,50,80' },
  { name: 'rosegold', light: '#ffe0d2', mid: '#e8957a', dark: '#a85a44', glow: '220,140,115' },
  { name: 'teal',     light: '#bff3f0', mid: '#1fb5ae', dark: '#0c6a73', glow: '30,170,165' },
  { name: 'onyx',     light: '#d9d6e8', mid: '#5b5877', dark: '#1f1d33', glow: '70,68,100' },
] as const;

/** Stable tone index (0-7) for a badge key. */
export function badgeTone(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % BADGE_TONES.length;
}
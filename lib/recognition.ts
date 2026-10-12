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

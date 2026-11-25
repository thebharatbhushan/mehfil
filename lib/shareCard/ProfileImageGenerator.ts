/**
 * ProfileImageGenerator - the premium writer-profile share card (1080 x 1350).
 *
 * Profile information only: photo (with the member's frame), name, @username, short bio, location / language,
 * a stats row and the badges the member has earned. No poems or couplets. The Mehfil logo, a faint feather
 * watermark and mehfilpoetry.in are always drawn.
 *
 * One function, `renderProfileCard`, paints the card; the live preview and the exported PNG both call it.
 */
import { loadAuthorImage } from './avatar';
import { drawBrandLockup, drawFeather, preloadBrandLogo } from './logo';
import { BRAND_DEVA_FONT } from './fonts';
import { resolveIcon } from './BadgeImageGenerator';
import type { IconSpec } from './BadgeImageGenerator';
import { BADGE_TONES, badgeTone, normalizeFrameKey } from '../recognition';
import type { FrameKey } from '../recognition';
import type { CardTheme } from './themes';

export const PROFILE_CARD_W = 1080;
export const PROFILE_CARD_H = 1350;
export const PROFILE_EXPORT_SCALE = 2;

export type ProfileThemeId = 'ivory' | 'midnight' | 'terracotta';

export interface ProfileCardBadge {
  key: string;
  name: string;
  icon?: string;
}

export interface ProfileCardData {
  /** Used for the file name. */
  id: string;
  name: string;
  username?: string;
  bio?: string;
  profilePic?: string;
  city?: string;
  language?: string;
  poemsCount?: number;
  /** Approved books on the profile; the stat is only shown when this is above 0. */
  booksCount?: number;
  /** Already formatted, e.g. "2024". */
  memberSince?: string;
  /** Earned (unlocked) badges only. */
  badges?: ProfileCardBadge[];
  frame?: string;
  /** Absolute public profile URL (used in the share text only). */
  url?: string;
}

interface Palette {
  id: ProfileThemeId;
  label: string;
  hint: string;
  isDark: boolean;
  bg: [string, string, string];
  vignette: string;
  ink: string;
  sub: string;
  accent: string;
  accentSoft: string;
  gold: [string, string, string];
  panel: string;
  panelLine: string;
  swatch: [string, string];
  /** Theme object handed to the shared logo helper. */
  logoTheme: CardTheme;
}

const logoTheme = (isDark: boolean, logo: [string, string]) => ({ isDark, logo }) as unknown as CardTheme;

export const PROFILE_THEMES: Record<ProfileThemeId, Palette> = {
  ivory: {
    id: 'ivory', label: 'Ivory', hint: 'आइवरी', isDark: false,
    bg: ['#fffdf8', '#fbf3e6', '#f4e6d2'], vignette: '150,100,60',
    ink: '#2e2018', sub: '#8a6d5a', accent: '#b4573a', accentSoft: 'rgba(180,87,58,0.28)',
    gold: ['#f3dc9a', '#c9a24a', '#8f6a21'],
    panel: 'rgba(255,255,255,0.62)', panelLine: 'rgba(180,87,58,0.18)',
    swatch: ['#fffdf8', '#f1dfc5'],
    logoTheme: logoTheme(false, ['#c16a4b', '#a84c2e']),
  },
  midnight: {
    id: 'midnight', label: 'Midnight', hint: 'मिडनाइट', isDark: true,
    bg: ['#1d1b22', '#131217', '#0c0b0f'], vignette: '0,0,0',
    ink: '#f4ebdc', sub: '#a99d8a', accent: '#d9b565', accentSoft: 'rgba(217,181,101,0.32)',
    gold: ['#f6e3a6', '#d9b565', '#a67c28'],
    panel: 'rgba(255,255,255,0.05)', panelLine: 'rgba(217,181,101,0.25)',
    swatch: ['#2a2830', '#0c0b0f'],
    logoTheme: logoTheme(true, ['#e0b86c', '#c4923f']),
  },
  terracotta: {
    id: 'terracotta', label: 'Terracotta', hint: 'टेराकोटा', isDark: true,
    bg: ['#b95c3d', '#9a4529', '#6f2e18'], vignette: '40,10,0',
    ink: '#fff6ea', sub: '#f1cdb8', accent: '#ffe2b0', accentSoft: 'rgba(255,226,176,0.35)',
    gold: ['#fff0c4', '#f2cf86', '#c99a3e'],
    panel: 'rgba(255,255,255,0.09)', panelLine: 'rgba(255,226,176,0.32)',
    swatch: ['#c0643f', '#6f2e18'],
    logoTheme: logoTheme(true, ['#ffe2b0', '#f2cf86']),
  },
};

export const PROFILE_THEME_LIST = Object.values(PROFILE_THEMES);

const W = PROFILE_CARD_W;
const H = PROFILE_CARD_H;
const CX = W / 2;
const DEVA = '"Noto Serif Devanagari", "Tiro Devanagari Hindi"';
const LATIN = '"Cormorant Garamond"';
const stack = (px: number, weight = 700) => `${weight} ${px}px ${DEVA}, ${LATIN}, serif`;
const sans = (px: number, weight = 600) => `${weight} ${px}px "Inter", ${LATIN}, sans-serif`;


/** Metal ring colours for the member's profile frame; the default frame uses the theme gold. */
const FRAME_METAL: Record<Exclude<FrameKey, 'default'>, [string, string, string]> = {
  bronze: ['#f0c4a0', '#c07a44', '#7c4520'],
  silver: ['#ffffff', '#c3c8d2', '#7d8594'],
  gold: ['#fff1b8', '#e5b93c', '#9a6a12'],
  special: ['#f7d6ff', '#b57bf0', '#5d2fa3'],
};

export interface PreparedProfile {
  avatar: HTMLImageElement | null;
  icons: Map<string, IconSpec>;
}

const clean = (s?: string) => (s || '').replace(/\s+/g, ' ').trim();

function clip(text: string, max: number): string {
  const chars = Array.from(clean(text));
  if (chars.length <= max) return chars.join('');
  const cut = chars.slice(0, max - 1).join('');
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\-–—\s]+$/, '')}…`;
}

function shownBadges(d: ProfileCardData): ProfileCardBadge[] {
  return (d.badges || []).filter((b) => b.key && b.name);
}

/** Loads fonts, the logo, the profile photo and the badge icons. Never rejects. */
export async function prepareProfileCard(d: ProfileCardData): Promise<PreparedProfile> {
  if (typeof document !== 'undefined' && document.fonts?.load) {
    const sample = `${d.name} ${d.bio || ''} ${d.city || ''} ${d.language || ''} ${(d.badges || []).map((b) => b.name).join(' ')} रचनाएँ किताबें भाषा सदस्यता उपलब्धियाँ मेहफ़िल Mehfil mehfilpoetry.in 0123456789`;
    await Promise.race([
      Promise.all([
        document.fonts.load(stack(40), sample).catch(() => []),
        document.fonts.load(stack(40, 400), sample).catch(() => []),
        document.fonts.load(`700 40px ${LATIN}`, 'Mehfil mehfilpoetry.in @0123456789').catch(() => []),
        document.fonts.load(sans(30), 'mehfilpoetry.in 0123456789').catch(() => []),
        document.fonts.load(BRAND_DEVA_FONT, 'मेहफ़िल').catch(() => []),
        preloadBrandLogo(),
      ]),
      new Promise((r) => setTimeout(r, 6000)),
    ]);
  }
  const badges = shownBadges(d);
  const [avatar, ...icons] = await Promise.all([
    loadAuthorImage(d.profilePic),
    ...badges.map((b) => resolveIcon(b.icon)),
  ]);
  const map = new Map<string, IconSpec>();
  badges.forEach((b, i) => map.set(b.key, icons[i] as IconSpec));
  return { avatar, icons: map };
}

function fit(ctx: CanvasRenderingContext2D, text: string, fontAt: (px: number) => string, start: number, min: number, maxW: number): string {
  let size = start;
  ctx.font = fontAt(size);
  while (ctx.measureText(text).width > maxW && size > min) {
    size -= 2;
    ctx.font = fontAt(size);
  }
  if (ctx.measureText(text).width > maxW) {
    const chars = Array.from(text);
    while (chars.length > 1 && ctx.measureText(chars.join('') + '…').width > maxW) chars.pop();
    return chars.join('') + '…';
  }
  return text;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s,;:.\-–—]*\S*$/, '') + '…';
    return kept;
  }
  return lines;
}

function metalGradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, c: [string, string, string]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, c[0]);
  g.addColorStop(0.5, c[1]);
  g.addColorStop(1, c[2]);
  return g;
}

function paintBackground(ctx: CanvasRenderingContext2D, p: Palette) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, p.bg[0]);
  g.addColorStop(0.55, p.bg[1]);
  g.addColorStop(1, p.bg[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // soft light behind the photo
  const glow = ctx.createRadialGradient(CX, 330, 20, CX, 330, 520);
  glow.addColorStop(0, p.isDark ? 'rgba(255,240,210,0.10)' : 'rgba(255,255,255,0.75)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const v = ctx.createRadialGradient(CX, H / 2, H * 0.35, CX, H / 2, H * 0.82);
  v.addColorStop(0, `rgba(${p.vignette},0)`);
  v.addColorStop(1, `rgba(${p.vignette},${p.isDark ? 0.35 : 0.1})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function paintFrame(ctx: CanvasRenderingContext2D, p: Palette) {
  ctx.save();
  ctx.strokeStyle = metalGradient(ctx, 0, 0, W, H, p.gold);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(40, 40, W - 80, H - 80, 30);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(56, 56, W - 112, H - 112, 22);
  ctx.stroke();
  ctx.restore();
}

function paintFlourish(ctx: CanvasRenderingContext2D, p: Palette, y: number, half = 150) {
  ctx.save();
  ctx.strokeStyle = p.accentSoft;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CX - half, y);
  ctx.lineTo(CX - 22, y);
  ctx.moveTo(CX + 22, y);
  ctx.lineTo(CX + half, y);
  ctx.stroke();
  ctx.fillStyle = metalGradient(ctx, CX - 8, y - 8, CX + 8, y + 8, p.gold);
  ctx.translate(CX, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
}

function paintAvatar(ctx: CanvasRenderingContext2D, d: ProfileCardData, p: Palette, prep: PreparedProfile, cy: number, r: number) {
  const frameKey = normalizeFrameKey(d.frame);
  const metal = frameKey === 'default' ? p.gold : FRAME_METAL[frameKey];

  ctx.save();
  ctx.shadowColor = p.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(80,40,20,0.28)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.arc(CX, cy, r + 12, 0, Math.PI * 2);
  ctx.fillStyle = metalGradient(ctx, CX - r, cy - r, CX + r, cy + r, metal);
  ctx.fill();
  ctx.restore();

  // inner paper ring so the metal reads as a bezel
  ctx.beginPath();
  ctx.arc(CX, cy, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = p.isDark ? '#17151b' : '#fffaf2';
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const img = prep.avatar;
  if (img && img.naturalWidth > 0) {
    const s = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, CX - w / 2, cy - h / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(CX - r, cy - r, CX + r, cy + r);
    g.addColorStop(0, '#c16a4b');
    g.addColorStop(1, '#a84c2e');
    ctx.fillStyle = g;
    ctx.fillRect(CX - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#fff';
    ctx.font = stack(100);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Array.from(clean(d.name))[0]?.toUpperCase() || 'M', CX, cy + 6);
  }
  ctx.restore();

  // outer hairline
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, cy, r + 26, 0, Math.PI * 2);
  ctx.strokeStyle = p.accentSoft;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawGlyph(ctx: CanvasRenderingContext2D, icon: IconSpec, cx: number, cy: number, box: number, fallback: string) {
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  if (icon?.kind === 'glyph') {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = icon.font(100);
    const m0 = ctx.measureText(icon.char);
    const w0 = (m0.actualBoundingBoxLeft ?? 0) + (m0.actualBoundingBoxRight ?? m0.width);
    const h0 = (m0.actualBoundingBoxAscent ?? 80) + (m0.actualBoundingBoxDescent ?? 0);
    const size = Math.max(16, Math.min(100, 100 * (box / Math.max(w0, h0, 1))));
    ctx.font = icon.font(size);
    const m = ctx.measureText(icon.char);
    const left = m.actualBoundingBoxLeft ?? 0;
    const right = m.actualBoundingBoxRight ?? m.width;
    const asc = m.actualBoundingBoxAscent ?? size * 0.8;
    const desc = m.actualBoundingBoxDescent ?? 0;
    ctx.fillText(icon.char, cx - (right - left) / 2, cy + (asc - desc) / 2);
  } else if (icon?.kind === 'img') {
    ctx.beginPath();
    ctx.arc(cx, cy, box * 0.62, 0, Math.PI * 2);
    ctx.clip();
    const s = Math.min((box * 1.2) / icon.img.naturalWidth, (box * 1.2) / icon.img.naturalHeight);
    const w = icon.img.naturalWidth * s;
    const h = icon.img.naturalHeight * s;
    ctx.drawImage(icon.img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.font = stack(Math.round(box * 0.9));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Array.from(fallback)[0] || '★', cx, cy + 2);
  }
  ctx.restore();
}

function paintMedal(ctx: CanvasRenderingContext2D, b: ProfileCardBadge, icon: IconSpec, cx: number, cy: number, r: number) {
  const tone = BADGE_TONES[badgeTone(b.key)];
  ctx.save();
  ctx.shadowColor = `rgba(${tone.glow},0.5)`;
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, '#ffffff');
  ring.addColorStop(0.35, tone.light);
  ring.addColorStop(0.7, tone.mid);
  ring.addColorStop(1, tone.dark);
  ctx.beginPath();
  ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  const body = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.05, cx, cy, r * 1.1);
  body.addColorStop(0, tone.light);
  body.addColorStop(0.45, tone.mid);
  body.addColorStop(1, tone.dark);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.clip();
  const gloss = ctx.createLinearGradient(cx, cy - r, cx, cy + r * 0.2);
  gloss.addColorStop(0, 'rgba(255,255,255,0.45)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.45, r * 0.8, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.restore();

  drawGlyph(ctx, icon, cx, cy, r * 0.95, b.name);
}

/** Paints the whole card at logical 1080 x 1350, using ctx as already scaled by the caller. */
function paint(ctx: CanvasRenderingContext2D, d: ProfileCardData, p: Palette, prep: PreparedProfile) {
  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent';
  ctx.direction = 'ltr';
  (ctx as unknown as { textRendering: string }).textRendering = 'optimizeLegibility';

  const badges = shownBadges(d);
  const hasBadges = badges.length > 0;
  const bio = clip(d.bio || '', 110);
  const meta = [clean(d.city), clean(d.language)].filter(Boolean).join('   ·   ');

  paintBackground(ctx, p);
  drawFeather(ctx, CX + 30, 690, 720, p.isDark ? '#ffffff' : p.accent, { alpha: p.isDark ? 0.035 : 0.05, rotateDeg: -16 });
  paintFrame(ctx, p);

  // Brand
  drawBrandLockup(ctx, p.logoTheme, CX, 112, 84);

  // Photo
  const ar = hasBadges ? 96 : 112;
  const ay = hasBadges ? 276 : 360;
  paintAvatar(ctx, d, p, prep, ay, ar);

  // Name + @username
  let y = ay + ar + (hasBadges ? 84 : 92);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = p.ink;
  ctx.fillText(fit(ctx, clean(d.name), (s) => stack(s, 700), 68, 36, W - 220), CX, y);

  if (d.username) {
    y += 62;
    ctx.font = sans(30, 600);
    const label = `@${d.username}`;
    const tw = ctx.measureText(label).width;
    const pw = tw + 60;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(CX - pw / 2, y - 27, pw, 54, 27);
    ctx.fillStyle = p.panel;
    ctx.fill();
    ctx.strokeStyle = p.panelLine;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = p.accent;
    ctx.font = sans(30, 600);
    ctx.fillText(label, CX, y + 1);
  }

  if (meta) {
    y += 56;
    ctx.fillStyle = p.sub;
    ctx.font = stack(28, 500);
    ctx.fillText(fit(ctx, meta, (s) => stack(s, 500), 28, 20, W - 260), CX, y);
  }

  if (bio) {
    y += 54;
    ctx.fillStyle = p.ink;
    ctx.globalAlpha = 0.86;
    ctx.font = stack(30, 400);
    wrap(ctx, bio, W - 240, 2).forEach((l, i) => ctx.fillText(l, CX, y + i * 46));
    ctx.globalAlpha = 1;
    y += 46;
  }

  // Stats
  const stats: { v: string; l: string }[] = [];
  if (d.poemsCount != null) stats.push({ v: String(d.poemsCount), l: 'रचनाएँ' });
  if (d.booksCount && d.booksCount > 0) stats.push({ v: String(d.booksCount), l: 'किताबें' });
  if (d.memberSince) stats.push({ v: d.memberSince, l: 'सदस्य बने' });
  stats.push({ v: String(badges.length ? (d.badges || []).length : 0), l: 'बैज' });
  const showStats = stats.filter((s) => !(s.l === 'बैज' && s.v === '0'));

  const stTop = hasBadges ? 736 : 840;
  const stH = 130;
  const stW = W - 220;
  if (showStats.length) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(110, stTop, stW, stH, 28);
    ctx.fillStyle = p.panel;
    ctx.fill();
    ctx.strokeStyle = p.panelLine;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    const colW = stW / showStats.length;
    showStats.forEach((s, i) => {
      const x = 110 + colW * i + colW / 2;
      if (i > 0) {
        ctx.strokeStyle = p.panelLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(110 + colW * i, stTop + 26);
        ctx.lineTo(110 + colW * i, stTop + stH - 26);
        ctx.stroke();
      }
      ctx.fillStyle = metalGradient(ctx, x - 60, stTop, x + 60, stTop + 80, p.gold);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fit(ctx, s.v, (px) => `700 ${px}px "Inter", ${LATIN}, sans-serif`, 58, 32, colW - 30), x, stTop + 54);
      ctx.fillStyle = p.sub;
      ctx.font = stack(25, 500);
      ctx.fillText(s.l, x, stTop + 102);
    });
  }

  // Badges: every earned badge is shown. Few badges -> big medals with names; many -> smaller medals in rows
  // (names are dropped once the medals get too small to label legibly).
  if (hasBadges) {
    const by = stTop + stH + 54;
    ctx.fillStyle = p.accent;
    ctx.font = sans(22, 600);
    ctx.save();
    if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '5px';
    ctx.textAlign = 'center';
    ctx.fillText(`✦  उपलब्धियाँ  ✦`, CX, by);
    ctx.restore();

    const n = badges.length;
    const areaTop = by + 30;
    const areaH = 1152 - areaTop;
    const maxW = W - 180;
    type Tier = { r: number; named: boolean; slot: number; perRow: number; rows: number; rowH: number; font: number };
    const mkTier = (r: number, named: boolean): Tier & { score: number } => {
      const font = Math.max(16, Math.min(26, Math.round(r * 0.5)));
      const slot = named ? 2 * r + 44 : 2 * r + 14;
      const perRow = Math.max(1, Math.floor(maxW / slot));
      const rows = Math.ceil(n / perRow);
      const rowH = named ? 2 * r + 12 + font + 12 : 2 * r + 18;
      return { r, named, slot, perRow, rows, rowH, font, score: r + (named ? 10 : 0) };
    };
    const tiers = [
      ...[58, 50, 44, 38, 32].map((r) => mkTier(r, true)),
      ...[50, 44, 38, 32, 28, 24, 20, 17, 14].map((r) => mkTier(r, false)),
    ].sort((x, y) => y.score - x.score);
    const t = tiers.find((x) => x.rows * x.rowH <= areaH) ?? tiers[tiers.length - 1];
    const total = t.rows * t.rowH;
    let top = areaTop + Math.max(0, (areaH - total) / 2) * 0.6;

    for (let row = 0; row < t.rows; row++) {
      const inRow = Math.min(t.perRow, n - row * t.perRow);
      // spread the last (shorter) row evenly so a lone badge is centred
      const startX = CX - (t.slot * (inRow - 1)) / 2;
      const my = top + row * t.rowH + t.r + 8;
      for (let i = 0; i < inRow; i++) {
        const b = badges[row * t.perRow + i];
        const bx = startX + t.slot * i;
        paintMedal(ctx, b, prep.icons.get(b.key) ?? null, bx, my, t.r);
        if (t.named) {
          ctx.fillStyle = p.ink;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fit(ctx, b.name, (sz) => stack(sz, 500), t.font, 14, t.slot - 10), bx, my + t.r + 14 + t.font * 0.8);
        }
      }
    }
  }

  // Footer
  paintFlourish(ctx, p, 1170, 150);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = p.sub;
  ctx.font = stack(26, 400);
  ctx.fillText('जहाँ अल्फ़ाज़ एहसास बनते हैं', CX, 1214);
  ctx.fillStyle = p.accent;
  ctx.font = sans(32, 600);
  ctx.save();
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '3px';
  ctx.fillText('mehfilpoetry.in', CX, 1262);
  ctx.restore();
}

/** Paints the card on `canvas`. `scale` multiplies the logical size (use ~0.5 for preview, 2 for export). */
export function renderProfileCard(
  canvas: HTMLCanvasElement,
  data: ProfileCardData,
  themeId: ProfileThemeId,
  prep: PreparedProfile,
  scale = 1,
) {
  const width = Math.round(W * scale);
  const height = Math.round(H * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paint(ctx, data, PROFILE_THEMES[themeId] ?? PROFILE_THEMES.ivory, prep);
}

export async function renderProfileCardToBlob(data: ProfileCardData, themeId: ProfileThemeId): Promise<Blob> {
  const prep = await prepareProfileCard(data);
  const canvas = document.createElement('canvas');
  renderProfileCard(canvas, data, themeId, prep, PROFILE_EXPORT_SCALE);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
  );
}

export function profileFileName(data: ProfileCardData): string {
  const safe = String(data.id || 'writer').replace(/[^A-Za-z0-9_-]+/g, '') || 'writer';
  return `mehfil-profile-${safe}.png`;
}

/**
 * Share card for an ACTIVE (unlocked) badge: profile picture, name, badge, Mehfil branding, link and a
 * subtle watermark. Reuses the poem share card's building blocks (avatar loader, feather logo, fonts,
 * export/share helpers) and the site's terracotta palette — no new design system.
 * Only presentation lives here: whether a badge is unlocked always comes from the backend.
 */
import { loadAuthorImage } from './avatar';
import { drawBrandLockup, drawFeather, preloadBrandLogo } from './logo';
import { BRAND_DEVA_FONT } from './fonts';
import { THEMES } from './themes';
import { BADGE_TONES, badgeTone } from '../recognition';

export const BADGE_CARD_W = 1080;
export const BADGE_CARD_H = 1350;
export const BADGE_SITE_LABEL = 'mehfil.in';
export const BADGE_SITE_URL = 'https://mehfil.in';

export interface ShareBadgeData {
  badgeKey: string;
  badgeName: string;
  badgeDescription?: string;
  badgeIcon?: string;
  userName: string;
  username?: string;
  profilePic?: string;
}

const W = BADGE_CARD_W;
const H = BADGE_CARD_H;
const DEVA = '"Noto Serif Devanagari", "Tiro Devanagari Hindi"';
const LATIN = '"Cormorant Garamond"';
const stack = (px: number, weight = 700) => `${weight} ${px}px ${DEVA}, ${LATIN}, serif`;

const FA_ICON = /^fa-[a-z0-9-]{1,40}$/;
const HTTPS_URL = /^https:\/\/[^\s"'<>]{1,300}$/;

type IconSpec = { kind: 'glyph'; char: string; font: (px: number) => string } | { kind: 'img'; img: HTMLImageElement } | null;

function loadPlainImage(url: string, timeoutMs = 6000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => resolve(null), timeoutMs);
    img.onload = () => { clearTimeout(t); resolve(img.naturalWidth > 0 ? img : null); };
    img.onerror = () => { clearTimeout(t); resolve(null); };
    img.src = url;
  });
}

/** The badge icon exactly as the site shows it: Font Awesome glyph (read from the loaded stylesheet) or an https image. */
async function resolveIcon(icon?: string): Promise<IconSpec> {
  const v = (icon || '').trim();
  if (HTTPS_URL.test(v)) {
    const img = await loadPlainImage(v);
    return img ? { kind: 'img', img } : null;
  }
  if (FA_ICON.test(v) && typeof document !== 'undefined') {
    const el = document.createElement('i');
    el.className = `fas ${v}`;
    el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden';
    document.body.appendChild(el);
    try {
      const cs = getComputedStyle(el, '::before');
      const raw = (cs.content || '').replace(/^["']|["']$/g, '');
      const family = cs.fontFamily;
      const weight = cs.fontWeight || '900';
      if (raw && raw !== 'none' && raw !== 'normal' && family) {
        const font = `${weight} 150px ${family}`;
        try { await document.fonts.load(font, raw); } catch { /* use whatever is loaded */ }
        return { kind: 'glyph', char: raw, font: (px: number) => `${weight} ${px}px ${family}` };
      }
    } finally {
      el.remove();
    }
  }
  return null;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return kept;
  }
  return lines;
}

function fit(ctx: CanvasRenderingContext2D, text: string, start: number, min: number, maxW: number, weight = 700): string {
  let size = start;
  ctx.font = stack(size, weight);
  while (ctx.measureText(text).width > maxW && size > min) { size -= 2; ctx.font = stack(size, weight); }
  if (ctx.measureText(text).width > maxW) {
    const chars = Array.from(text);
    while (chars.length > 1 && ctx.measureText(chars.join('') + '…').width > maxW) chars.pop();
    return chars.join('') + '…';
  }
  return text;
}

export async function prepareBadgeCard(d: ShareBadgeData) {
  if (typeof document !== 'undefined' && document.fonts?.load) {
    const sample = `${d.userName} ${d.badgeName} ${d.badgeDescription || ''} मेहफ़िल Mehfil mehfil.in`;
    await Promise.race([
      Promise.all([
        document.fonts.load(stack(40), sample).catch(() => []),
        document.fonts.load(`700 40px ${LATIN}`, 'Mehfil mehfil.in').catch(() => []),
        document.fonts.load(BRAND_DEVA_FONT, 'मेहफ़िल').catch(() => []),
        preloadBrandLogo(),
      ]),
      new Promise((r) => setTimeout(r, 6000)),
    ]);
  }
  const [avatar, icon] = await Promise.all([loadAuthorImage(d.profilePic), resolveIcon(d.badgeIcon)]);
  return { avatar, icon };
}

export async function renderBadgeCardToBlob(d: ShareBadgeData): Promise<Blob> {
  const { avatar, icon } = await prepareBadgeCard(d);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const theme = THEMES.classic;
  const cx = W / 2;
  const tone = BADGE_TONES[badgeTone(d.badgeKey)];

  // Paper background (same warm palette as the poem card)
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, '#fffcf8');
  bg.addColorStop(0.55, '#fff6ee');
  bg.addColorStop(1, '#fbeadc');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle watermark: big feather behind everything + tiled small ones (kept very faint)
  drawFeather(ctx, cx, H * 0.52, 760, '#C16A4B', { alpha: 0.04, rotateDeg: -12 });

  // Frame
  ctx.strokeStyle = 'rgba(193,106,75,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(40, 40, W - 80, H - 80, 36); ctx.stroke();
  ctx.strokeStyle = 'rgba(193,106,75,0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(58, 58, W - 116, H - 116, 28); ctx.stroke();

  // Brand lock-up (top)
  drawBrandLockup(ctx, theme, cx, 144, 124);

  // Avatar
  const ay = 330, ar = 92;
  ctx.save();
  ctx.shadowColor = 'rgba(80,40,20,0.25)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  ctx.beginPath(); ctx.arc(cx, ay, ar, 0, Math.PI * 2); ctx.fillStyle = '#efe0d2'; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, ay, ar, 0, Math.PI * 2); ctx.clip();
  if (avatar) {
    const s = Math.max((ar * 2) / avatar.naturalWidth, (ar * 2) / avatar.naturalHeight);
    const w = avatar.naturalWidth * s, h = avatar.naturalHeight * s;
    ctx.drawImage(avatar, cx - w / 2, ay - h / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(cx - ar, ay - ar, cx + ar, ay + ar);
    g.addColorStop(0, '#C16A4B'); g.addColorStop(1, '#A84C2E');
    ctx.fillStyle = g; ctx.fillRect(cx - ar, ay - ar, ar * 2, ar * 2);
    ctx.fillStyle = '#fff'; ctx.font = stack(84); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Array.from(d.userName.trim())[0]?.toUpperCase() || 'M', cx, ay + 4);
  }
  ctx.restore();
  ctx.strokeStyle = '#C16A4B'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, ay, ar + 6, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(193,106,75,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, ay, ar + 16, 0, Math.PI * 2); ctx.stroke();

  // Name + username
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#6a3f2a';
  ctx.fillText(fit(ctx, d.userName, 56, 32, W - 220), cx, 490);
  if (d.username) {
    ctx.fillStyle = '#b08970'; ctx.font = `500 32px ${LATIN}, serif`;
    ctx.fillText(`@${d.username}`, cx, 540);
  }

  // Badge medallion — same per-badge metallic tone as on the site
  const my = 760, mr = 140;
  ctx.save();
  ctx.shadowColor = `rgba(${tone.glow},0.55)`; ctx.shadowBlur = 50; ctx.shadowOffsetY = 14;
  const ring = ctx.createLinearGradient(cx - mr, my - mr, cx + mr, my + mr);
  ring.addColorStop(0, '#ffffff'); ring.addColorStop(0.35, tone.light); ring.addColorStop(0.7, tone.mid); ring.addColorStop(1, tone.dark);
  ctx.beginPath(); ctx.arc(cx, my, mr + 16, 0, Math.PI * 2); ctx.fillStyle = ring; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, my, mr + 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  const body = ctx.createRadialGradient(cx - mr * 0.4, my - mr * 0.5, mr * 0.05, cx, my, mr * 1.1);
  body.addColorStop(0, tone.light); body.addColorStop(0.45, tone.mid); body.addColorStop(1, tone.dark);
  ctx.beginPath(); ctx.arc(cx, my, mr - 4, 0, Math.PI * 2); ctx.fillStyle = body; ctx.fill();
  // glossy highlight
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, my, mr - 4, 0, Math.PI * 2); ctx.clip();
  const gloss = ctx.createLinearGradient(cx, my - mr, cx, my + mr * 0.2);
  gloss.addColorStop(0, 'rgba(255,255,255,0.45)'); gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.ellipse(cx, my - mr * 0.45, mr * 0.8, mr * 0.5, 0, 0, Math.PI * 2); ctx.fillStyle = gloss; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, my, mr - 22, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  if (icon?.kind === 'glyph') {
    // Measure and draw with the SAME alphabetic baseline. (The old code measured while the baseline was "middle",
    // where ascent ~= descent, so the vertical correction came out as ~0 and the glyph was drawn with its bottom on the
    // medallion's centre line, i.e. shifted up.) The glyph's real ink box is centred both ways and scaled to fit.
    const box = (mr - 30) * 2 * 0.62; // ink area available inside the inner ring
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = icon.font(150);
    const m0 = ctx.measureText(icon.char);
    const w0 = (m0.actualBoundingBoxLeft ?? 0) + (m0.actualBoundingBoxRight ?? m0.width);
    const h0 = (m0.actualBoundingBoxAscent ?? 120) + (m0.actualBoundingBoxDescent ?? 0);
    const size = Math.max(40, Math.min(150, 150 * (box / Math.max(w0, h0, 1))));
    ctx.font = icon.font(size);
    const m = ctx.measureText(icon.char);
    const left = m.actualBoundingBoxLeft ?? 0;
    const right = m.actualBoundingBoxRight ?? m.width;
    const asc = m.actualBoundingBoxAscent ?? size * 0.8;
    const desc = m.actualBoundingBoxDescent ?? 0;
    ctx.fillText(icon.char, cx - (right - left) / 2, my + (asc - desc) / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  } else if (icon?.kind === 'img') {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, my, mr - 36, 0, Math.PI * 2); ctx.clip();
    const s = Math.min((mr * 2 - 72) / icon.img.naturalWidth, (mr * 2 - 72) / icon.img.naturalHeight);
    ctx.drawImage(icon.img, cx - (icon.img.naturalWidth * s) / 2, my - (icon.img.naturalHeight * s) / 2, icon.img.naturalWidth * s, icon.img.naturalHeight * s);
    ctx.restore();
  } else {
    ctx.font = stack(130); ctx.fillText(Array.from(d.badgeName)[0] || '★', cx, my + 6);
  }

  // Badge name + description
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = tone.dark;
  ctx.fillText(fit(ctx, d.badgeName, 76, 40, W - 200), cx, 985);
  ctx.fillStyle = tone.mid; ctx.font = `600 26px ${LATIN}, serif`;
  ctx.fillText('✦  BADGE EARNED ON MEHFIL  ✦', cx, 1042);
  if (d.badgeDescription) {
    ctx.fillStyle = '#6a3f2a'; ctx.font = stack(32, 400);
    wrap(ctx, d.badgeDescription, W - 260, 2).forEach((l, i) => ctx.fillText(l, cx, 1100 + i * 46));
  }

  // Footer: divider, tagline, link
  ctx.strokeStyle = 'rgba(193,106,75,0.25)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(150, 1176); ctx.lineTo(W - 150, 1176); ctx.stroke();
  ctx.fillStyle = '#b08970'; ctx.font = stack(28, 400);
  ctx.fillText('जहाँ अल्फ़ाज़ एहसास बनते हैं', cx, 1212);
  ctx.fillStyle = '#C16A4B'; ctx.font = `600 34px "Inter", ${LATIN}, sans-serif`;
  ctx.fillText(BADGE_SITE_LABEL, cx, 1256);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png'),
  );
}

export const badgeFileName = (key: string) => `mehfil-badge-${key.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'badge'}.png`;
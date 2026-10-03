interface SharePoemData {
  title: string;
  body: string;
  authorName: string;
  username?: string;
  profilePic?: string;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    lines.push(current);
  }
  return lines;
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateShareImage(data: SharePoemData): Promise<Blob | null> {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fffcf8');
  bg.addColorStop(0.5, '#fff7f0');
  bg.addColorStop(1, '#fdf0e8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative circles
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#c16a4b';
  ctx.beginPath();
  ctx.arc(W - 120, 200, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, H - 200, 160, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Inner border
  const pad = 44;
  ctx.strokeStyle = 'rgba(193, 106, 75, 0.25)';
  ctx.lineWidth = 2;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 32);
  ctx.stroke();

  // Logo top-left
  ctx.font = 'bold 32px Georgia, "Cormorant Garamond", serif';
  ctx.fillStyle = '#C16A4B';
  ctx.textBaseline = 'middle';
  ctx.fillText('Mehfil', pad + 30, pad + 38);
  // Small ornament next to logo
  ctx.font = '28px serif';
  ctx.fillText('❦', pad + 30 + ctx.measureText('Mehfil').width + 14, pad + 38);

  // Divider line under logo
  ctx.strokeStyle = 'rgba(193, 106, 75, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad + 30, pad + 72);
  ctx.lineTo(W - pad - 30, pad + 72);
  ctx.stroke();

  // Profile section
  const profileY = pad + 110;
  const picSize = 72;
  const picX = pad + 30;

  // Profile pic circle
  ctx.save();
  roundRect(ctx, picX, profileY, picSize, picSize, picSize / 2);
  ctx.clip();
  if (data.profilePic) {
    const img = await loadImage(data.profilePic);
    if (img) {
      ctx.drawImage(img, picX, profileY, picSize, picSize);
    } else {
      ctx.fillStyle = '#c78d72';
      ctx.fillRect(picX, profileY, picSize, picSize);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.authorName.charAt(0) || '?', picX + picSize / 2, profileY + picSize / 2);
    }
  } else {
    const grad = ctx.createLinearGradient(picX, profileY, picX + picSize, profileY + picSize);
    grad.addColorStop(0, '#C16A4B');
    grad.addColorStop(1, '#A84C2E');
    ctx.fillStyle = grad;
    ctx.fillRect(picX, profileY, picSize, picSize);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.authorName.charAt(0) || '?', picX + picSize / 2, profileY + picSize / 2);
  }
  ctx.restore();

  // Profile pic ring
  ctx.strokeStyle = '#c16a4b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(picX + picSize / 2, profileY + picSize / 2, picSize / 2 + 2, 0, Math.PI * 2);
  ctx.stroke();

  // Author name
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6a3f2a';
  ctx.font = 'bold 26px Georgia, "Cormorant Garamond", serif';
  ctx.fillText(data.authorName, picX + picSize + 18, profileY + 26);

  // Username
  if (data.username) {
    ctx.fillStyle = '#b08970';
    ctx.font = '20px Georgia, serif';
    ctx.fillText(`@${data.username}`, picX + picSize + 18, profileY + 54);
  }

  // Poem title
  const contentX = pad + 30;
  const contentW = W - pad * 2 - 60;
  let y = profileY + picSize + 60;

  ctx.fillStyle = '#6a3f2a';
  ctx.font = 'bold 42px Georgia, "Cormorant Garamond", serif';
  ctx.textBaseline = 'top';
  const titleLines = wrapText(ctx, data.title || 'बेनाम कविता', contentW);
  for (const line of titleLines.slice(0, 3)) {
    ctx.fillText(line, contentX, y);
    y += 52;
  }

  // Title underline
  y += 8;
  ctx.strokeStyle = '#c16a4b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contentX, y);
  ctx.lineTo(contentX + 80, y);
  ctx.stroke();
  y += 30;

  // Poem body
  ctx.fillStyle = '#4a3d35';
  ctx.font = '24px Georgia, "Noto Serif Devanagari", serif';
  const bodyText = (data.body || '').substring(0, 600);
  const bodyLines = wrapText(ctx, bodyText, contentW);
  const maxLines = Math.floor((H - pad - 180 - y) / 38);
  for (const line of bodyLines.slice(0, maxLines)) {
    ctx.fillText(line, contentX, y);
    y += 38;
  }
  if (bodyLines.length > maxLines) {
    ctx.fillStyle = '#b08970';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('...', contentX, y);
  }

  // Bottom branding
  const bottomY = H - pad - 70;
  ctx.strokeStyle = 'rgba(193, 106, 75, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, bottomY);
  ctx.lineTo(W - pad - 30, bottomY);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#C16A4B';
  ctx.font = 'bold 24px Georgia, "Cormorant Garamond", serif';
  ctx.fillText('❦  Mehfil  ❦', W / 2, bottomY + 38);
  ctx.fillStyle = '#b08970';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('जहाँ अल्फ़ाज़ एहसास बनते हैं', W / 2, bottomY + 62);
  ctx.fillStyle = '#9e7a64';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('www.mehfil.in', W / 2, bottomY + 88);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
}

export async function sharePoemImage(data: SharePoemData, fallbackUrl: string): Promise<void> {
  const blob = await generateShareImage(data);
  if (!blob) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title || 'कविता',
          text: `${(data.body || '').substring(0, 100)}\n\nwww.mehfil.in`,
          url: fallbackUrl,
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(fallbackUrl);
    }
    return;
  }

  const file = new File([blob], 'mehfil-poem.png', { type: 'image/png' });
  const shareText = `${data.title || 'कविता'}\n${(data.body || '').substring(0, 100)}\n\nwww.mehfil.in`;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: data.title || 'कविता',
        text: shareText,
        files: [file],
      });
    } catch {
      // user cancelled — no action needed
    }
  } else if (navigator.share) {
    // Fallback: share text + URL (no image support)
    try {
      await navigator.share({
        title: data.title || 'कविता',
        text: shareText,
        url: fallbackUrl,
      });
    } catch {}
  } else {
    // Last resort: download the image and copy URL
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mehfil-poem.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    navigator.clipboard?.writeText(`${shareText}\n${fallbackUrl}`);
  }
}

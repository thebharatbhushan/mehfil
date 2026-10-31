'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/site/ToastProvider';
import { renderBadgeCardToBlob, badgeFileName, BADGE_SITE_URL } from '@/lib/shareCard/BadgeImageGenerator';
import type { ShareBadgeData } from '@/lib/shareCard/BadgeImageGenerator';
import { canShareFiles, downloadBlob, shareFiles } from '@/lib/shareCard/export';

/** Preview + share/download/copy for one active badge. Web Share (with the image) when the device supports it. */
export default function ShareBadgeModal({ data, onClose }: { data: ShareBadgeData; onClose: () => void }) {
  const { showToast } = useToast();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const text = `मैंने मेहफ़िल पर “${data.badgeName}” बैज अर्जित किया है! 🏅\n${BADGE_SITE_URL}`;

  const dataKey = JSON.stringify(data);

  useEffect(() => {
    let alive = true;
    let url = '';
    renderBadgeCardToBlob(data)
      .then((b) => {
        if (!alive) return;
        url = URL.createObjectURL(b);
        setBlob(b);
        setPreviewUrl(url);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const file = blob ? new File([blob], badgeFileName(data.badgeKey), { type: 'image/png' }) : null;
  const nativeShare = !!file && canShareFiles([file]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('लिंक कॉपी हो गया।');
    } catch {
      showToast('कॉपी नहीं हो सका।', true);
    }
  };

  const doShare = async () => {
    if (!file) return;
    setBusy(true);
    const outcome = await shareFiles([file], text, data.badgeName);
    setBusy(false);
    if (outcome === 'failed') showToast('शेयर नहीं हो सका। कृपया इमेज डाउनलोड करें।', true);
    if (outcome === 'unsupported') downloadBlob(file, file.name);
  };

  return (
    <div className="modal-mask profile-modal-mask" onClick={onClose} role="presentation">
      <div className="modal-dialog mf-badge-share-dialog" role="dialog" aria-modal="true" aria-label="बैज साझा करें" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h2 className="modal-title">बैज साझा करें</h2>
          <button type="button" className="modal-close-x" onClick={onClose} aria-label="बंद करें"><i className="fas fa-times" /></button>
        </div>
        <div className="mf-badge-share-preview">
          {previewUrl ? <img src={previewUrl} alt={`${data.userName} — ${data.badgeName}`} /> : failed ? <p>कार्ड नहीं बन सका। कृपया पुनः प्रयास करें।</p> : <p>कार्ड बन रहा है…</p>}
        </div>
        <div className="mf-badge-share-actions">
          {nativeShare && <button type="button" className="primary-btn" onClick={doShare} disabled={!blob || busy}><i className="fas fa-share-alt" /> शेयर करें</button>}
          <button type="button" className={nativeShare ? 'secondary-btn' : 'primary-btn'} onClick={() => file && downloadBlob(file, file.name)} disabled={!blob}><i className="fas fa-download" /> डाउनलोड</button>
          <button type="button" className="secondary-btn" onClick={copyText}><i className="fas fa-link" /> लिंक कॉपी</button>
        </div>
      </div>
    </div>
  );
}

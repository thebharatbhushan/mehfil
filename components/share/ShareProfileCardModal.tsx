'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useToast } from '@/components/site/ToastProvider';
import {
  PROFILE_THEME_LIST,
  prepareProfileCard,
  profileFileName,
  renderProfileCard,
  renderProfileCardToBlob,
} from '@/lib/shareCard/ProfileImageGenerator';
import type { PreparedProfile, ProfileCardData, ProfileThemeId } from '@/lib/shareCard/ProfileImageGenerator';
import { downloadFiles, shareFiles } from '@/lib/shareCard/export';

const STORAGE_KEY = 'mehfil_profile_card_theme_v1';

function loadTheme(): ProfileThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return PROFILE_THEME_LIST.some((t) => t.id === v) ? (v as ProfileThemeId) : 'ivory';
  } catch {
    return 'ivory';
  }
}

/** "Share profile as card": live preview of the premium profile card, 3 looks, download and native share. */
export default function ShareProfileCardModal({ data, onClose }: { data: ProfileCardData; onClose: () => void }) {
  const { showToast } = useToast();
  const [theme, setTheme] = useState<ProfileThemeId>('ivory');
  const [busy, setBusy] = useState<null | 'download' | 'share'>(null);
  const [prep, setPrep] = useState<PreparedProfile | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cssWidth, setCssWidth] = useState(0);
  const loaded = useRef(false);
  const dataKey = JSON.stringify(data);

  useEffect(() => {
    setTheme(loadTheme());
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode: the choice just will not persist */
    }
  }, [theme]);

  // Fonts, logo, photo and badge icons are loaded once per data set.
  useEffect(() => {
    let alive = true;
    setPrep(null);
    prepareProfileCard(data).then((p) => alive && setPrep(p));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setCssWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !prep) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = cssWidth > 0 ? Math.min(1, Math.max(0.3, (cssWidth * dpr) / 1080)) : 0.4;
    const raf = requestAnimationFrame(() => {
      try {
        renderProfileCard(canvas, data, theme, prep, scale);
      } catch {
        /* canvas unavailable */
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, theme, prep, cssWidth]);

  const buildFile = async () => new File([await renderProfileCardToBlob(data, theme)], profileFileName(data), { type: 'image/png' });

  const handleDownload = async () => {
    if (busy) return;
    setBusy('download');
    try {
      downloadFiles([await buildFile()]);
      showToast('✨ इमेज डाउनलोड हो गई।');
    } catch {
      showToast('❌ इमेज बनाने में समस्या हुई। कृपया पुनः प्रयास करें।', true);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy('share');
    try {
      const file = await buildFile();
      const text = `${data.name}${data.url ? `\n${data.url}` : ''}\nmehfilpoetry.in`;
      const outcome = await shareFiles([file], text, `${data.name} | Mehfil`);
      if (outcome === 'shared') {
        showToast('✨ साझा करने के लिए तैयार!');
      } else if (outcome === 'unsupported' || outcome === 'failed') {
        downloadFiles([file]);
        if (data.url) navigator.clipboard?.writeText(data.url).catch(() => {});
        showToast(
          outcome === 'unsupported'
            ? 'इस ब्राउज़र में सीधा शेयर उपलब्ध नहीं है — इमेज डाउनलोड कर दी गई है, अब इसे किसी भी ऐप में साझा करें।'
            : 'साझा नहीं हो सका — इमेज डाउनलोड कर दी गई है।',
          outcome === 'failed',
        );
      }
    } catch {
      showToast('❌ इमेज बनाने में समस्या हुई। कृपया पुनः प्रयास करें।', true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sc-overlay" />
        <Dialog.Content className="sc-modal">
          <header className="sc-header">
            <div>
              <Dialog.Title className="sc-title">Share Profile Card</Dialog.Title>
              <Dialog.Description className="sc-subtitle">अपनी प्रोफ़ाइल का कार्ड बनाएँ और साझा करें</Dialog.Description>
            </div>
            <Dialog.Close className="sc-close" aria-label="बंद करें">
              <i className="fas fa-times" aria-hidden="true" />
            </Dialog.Close>
          </header>

          <div className="sc-body">
            <div className="sc-preview-col">
              <div className="sc-preview">
                <div className="sc-card-frame" ref={wrapRef}>
                  <canvas
                    ref={canvasRef}
                    className={`sc-canvas${prep ? ' is-ready' : ''}`}
                    role="img"
                    aria-label={`${data.name} का प्रोफ़ाइल कार्ड पूर्वावलोकन`}
                  />
                  {!prep && <div className="sc-card-skeleton" aria-hidden="true" />}
                </div>
              </div>
            </div>
            <div className="sc-controls-col">
              <div className="sc-editor">
                <fieldset className="sc-field">
                  <legend className="sc-legend">कार्ड की शैली · Style</legend>
                  <div className="sc-swatches" role="radiogroup" aria-label="कार्ड की शैली">
                    {PROFILE_THEME_LIST.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={theme === t.id}
                        className={`sc-swatch${theme === t.id ? ' is-active' : ''}`}
                        onClick={() => setTheme(t.id)}
                      >
                        <span className="sc-swatch-dot" style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }} />
                        <span className="sc-swatch-label">{t.label}</span>
                        <small className="sc-swatch-label" style={{ fontWeight: 500, opacity: 0.7 }}>{t.hint}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>
          </div>

          <footer className="sc-actions">
            <button type="button" className="secondary-btn sc-action" onClick={handleDownload} disabled={!!busy || !prep}>
              <i className={`fas ${busy === 'download' ? 'fa-spinner fa-spin' : 'fa-download'}`} aria-hidden="true" />
              Download Image
            </button>
            <button type="button" className="primary-btn sc-action" onClick={handleShare} disabled={!!busy || !prep}>
              <i className={`fas ${busy === 'share' ? 'fa-spinner fa-spin' : 'fa-share-alt'}`} aria-hidden="true" />
              Share
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

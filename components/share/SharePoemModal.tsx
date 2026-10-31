'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useToast } from '@/components/site/ToastProvider';
import { ShareCardEditor } from './ShareCardEditor';
import { ShareCardPreview } from './ShareCardPreview';
import { buildCardFiles, downloadFiles, shareFiles } from '@/lib/shareCard/export';
import {
  ALIGN_OPTIONS,
  BACKGROUND_OPTIONS,
  DECORATION_OPTIONS,
  DEFAULT_OPTIONS,
  FONT_OPTIONS,
  SIZE_OPTIONS,
} from '@/lib/shareCard/types';
import type { ShareCardOptions, SharePoemData } from '@/lib/shareCard/types';

const STORAGE_KEY = 'mehfil_share_card_v1';

/** Reads saved choices, accepting only values that still exist (so old/edited storage can't break the card). */
function loadOptions(): ShareCardOptions {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return DEFAULT_OPTIONS;
    const pick = <T extends string>(items: { id: T }[], v: unknown, fallback: T): T =>
      items.some((i) => i.id === v) ? (v as T) : fallback;
    return {
      background: pick(BACKGROUND_OPTIONS, saved.background, DEFAULT_OPTIONS.background),
      decoration: pick(DECORATION_OPTIONS, saved.decoration, DEFAULT_OPTIONS.decoration),
      font: pick(FONT_OPTIONS, saved.font, DEFAULT_OPTIONS.font),
      align: pick(ALIGN_OPTIONS, saved.align, DEFAULT_OPTIONS.align),
      size: pick(SIZE_OPTIONS, saved.size, DEFAULT_OPTIONS.size),
    };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

interface Props {
  poem: SharePoemData;
  onClose: () => void;
}

export default function SharePoemModal({ poem, onClose }: Props) {
  const { showToast } = useToast();
  const [options, setOptions] = useState<ShareCardOptions>(DEFAULT_OPTIONS);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [busy, setBusy] = useState<null | 'download' | 'share'>(null);
  const loaded = useRef(false);

  // Restore the user's last choices (client only, after mount, to keep hydration clean).
  useEffect(() => {
    setOptions(loadOptions());
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch {
      /* private mode etc. - choices just won't persist */
    }
  }, [options]);

  const update = useCallback((patch: Partial<ShareCardOptions>) => setOptions((o) => ({ ...o, ...patch })), []);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  // Pre-render the PNG(s) shortly after the user stops tweaking, so tapping "Share" can call the native
  // share sheet immediately (iOS Safari only allows it close to the tap).
  const key = `${poem.id}|${poem.body.length}|${poem.authorName}|${poem.title || ''}|${poem.authorImage || ''}|${JSON.stringify(options)}`;
  const prefetch = useRef<{ key: string; promise: Promise<File[]> } | null>(null);
  useEffect(() => {
    if (pageCount > 3) return;
    const t = setTimeout(() => {
      prefetch.current = { key, promise: buildCardFiles(poem, options, 'all').catch(() => [] as File[]) };
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pageCount]);

  const getFiles = async (): Promise<File[]> => {
    if (prefetch.current?.key === key) {
      const ready = await prefetch.current.promise;
      if (ready.length) return ready;
    }
    return buildCardFiles(poem, options, 'all');
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy('download');
    try {
      const files = await getFiles();
      downloadFiles(files);
      showToast(files.length > 1 ? `${files.length} इमेज डाउनलोड हो रही हैं।` : '✨ इमेज डाउनलोड हो गई।');
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
      const files = await getFiles();
      const text = `${poem.title ? `${poem.title} — ` : ''}${poem.authorName}${poem.url ? `\n${poem.url}` : ''}\nmehfil.in`;
      const outcome = await shareFiles(files, text, `${poem.authorName} | Mehfil`);
      if (outcome === 'shared') {
        showToast('✨ साझा करने के लिए तैयार!');
      } else if (outcome === 'unsupported' || outcome === 'failed') {
        // No native file sharing (most desktop browsers): never fail silently - hand over the image instead.
        downloadFiles(files);
        if (poem.url) navigator.clipboard?.writeText(poem.url).catch(() => {});
        showToast(
          outcome === 'unsupported'
            ? 'इस ब्राउज़र में सीधा शेयर उपलब्ध नहीं है — इमेज डाउनलोड कर दी गई है, अब इसे किसी भी ऐप में साझा करें।'
            : 'साझा नहीं हो सका — इमेज डाउनलोड कर दी गई है।',
          outcome === 'failed',
        );
      }
      // 'cancelled' (user closed the share sheet) needs no message.
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
              <Dialog.Title className="sc-title">Share as Image</Dialog.Title>
              <Dialog.Description className="sc-subtitle">इमेज कार्ड बनाएँ और अपनी पसंद से सजाएँ</Dialog.Description>
            </div>
            <Dialog.Close className="sc-close" aria-label="बंद करें">
              <i className="fas fa-times" aria-hidden="true" />
            </Dialog.Close>
          </header>

          <div className="sc-body">
            <div className="sc-preview-col">
              <ShareCardPreview
                poem={poem}
                options={options}
                page={page}
                pageCount={pageCount}
                onPageChange={(p) => setPage(Math.max(0, Math.min(p, pageCount - 1)))}
                onInfo={(info) => setPageCount(info.pageCount)}
              />
            </div>
            <div className="sc-controls-col">
              <ShareCardEditor options={options} onChange={update} />
            </div>
          </div>

          <footer className="sc-actions">
            <button type="button" className="secondary-btn sc-action" onClick={handleDownload} disabled={!!busy}>
              <i className={`fas ${busy === 'download' ? 'fa-spinner fa-spin' : 'fa-download'}`} aria-hidden="true" />
              {pageCount > 1 ? `Download All (${pageCount})` : 'Download Image'}
            </button>
            <button type="button" className="primary-btn sc-action" onClick={handleShare} disabled={!!busy}>
              <i className={`fas ${busy === 'share' ? 'fa-spinner fa-spin' : 'fa-share-alt'}`} aria-hidden="true" />
              Share
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

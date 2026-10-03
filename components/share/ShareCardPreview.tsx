'use client';

import { PoemShareCard } from './PoemShareCard';
import type { RenderInfo } from '@/lib/shareCard/PoemImageGenerator';
import type { ShareCardOptions, SharePoemData } from '@/lib/shareCard/types';

interface Props {
  poem: SharePoemData;
  options: ShareCardOptions;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onInfo: (info: RenderInfo) => void;
}

/** Live preview + (for very long poems) card pagination. */
export function ShareCardPreview({ poem, options, page, pageCount, onPageChange, onInfo }: Props) {
  return (
    <div className="sc-preview">
      <PoemShareCard poem={poem} options={options} page={page} onInfo={onInfo} />
      {pageCount > 1 && (
        <div className="sc-pager" role="group" aria-label="कार्ड पृष्ठ">
          <button type="button" className="sc-pager-btn" onClick={() => onPageChange(page - 1)} disabled={page === 0} aria-label="पिछला कार्ड">
            <i className="fas fa-chevron-left" aria-hidden="true" />
          </button>
          <span className="sc-pager-state" aria-live="polite">
            कार्ड {page + 1} / {pageCount}
          </span>
          <button type="button" className="sc-pager-btn" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount - 1} aria-label="अगला कार्ड">
            <i className="fas fa-chevron-right" aria-hidden="true" />
          </button>
        </div>
      )}
      {pageCount > 1 && <p className="sc-pager-note">यह रचना लंबी है, इसलिए {pageCount} कार्ड में बाँटी गई है।</p>}
    </div>
  );
}

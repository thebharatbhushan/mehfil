'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { SharePoemData } from '@/lib/shareCard/types';
import './daily-share.css';

// The editor, canvas renderer and fonts logic are only needed once the user opens it.
const SharePoemModal = dynamic(() => import('./SharePoemModal'), { ssr: false });

interface Props {
  poem: SharePoemData;
  /** Button text. Defaults to the poem page wording. */
  label?: string;
  /** Extra class names, e.g. `share-img-btn--sm` for the compact daily-card button. */
  className?: string;
}

export function SharePoemButton({ poem, label = 'Share as Image', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`share-img-btn poem-action-btn${className ? ` ${className}` : ''}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <i className="far fa-image" aria-hidden="true" /> {label}
      </button>
      {open && <SharePoemModal poem={poem} onClose={() => setOpen(false)} />}
    </>
  );
}

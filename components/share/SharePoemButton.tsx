'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { SharePoemData } from '@/lib/shareCard/types';

// The editor, canvas renderer and fonts logic are only needed once the user opens it.
const SharePoemModal = dynamic(() => import('./SharePoemModal'), { ssr: false });

export function SharePoemButton({ poem }: { poem: SharePoemData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="share-img-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <i className="far fa-image" aria-hidden="true" /> Share as Image
      </button>
      {open && <SharePoemModal poem={poem} onClose={() => setOpen(false)} />}
    </>
  );
}

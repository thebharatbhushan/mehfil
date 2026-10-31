'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/** "Back to results" link: returns to the visitor's last dictionary search when there is one (kept only in this tab). */
export function BackToSearch() {
  const [href, setHref] = useState('/dictionary');
  useEffect(() => {
    try {
      const q = sessionStorage.getItem('mehfil_dict_last');
      if (q) setHref(`/dictionary?q=${encodeURIComponent(q)}`);
    } catch { /* ignore */ }
  }, []);
  return (
    <Link href={href} className="dict-back" prefetch={false}>
      <i className="fas fa-arrow-left" aria-hidden="true" /> खोज परिणामों पर लौटें
    </Link>
  );
}

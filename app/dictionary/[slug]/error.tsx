'use client';

import Link from 'next/link';
import '@/components/dictionary/dictionary.css';

export default function DictionaryWordError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="dict-page">
      <div className="dict-wrap">
        <div className="dict-error" role="alert">
          <h2>शब्द अभी लोड नहीं हो सका</h2>
          <p>सर्वर से संपर्क नहीं हो पाया। कृपया थोड़ी देर में फिर कोशिश करें।</p>
          <button type="button" className="dict-btn" onClick={reset}>फिर कोशिश करें</button>{' '}
          <Link href="/dictionary" className="dict-btn is-ghost">शब्दकोश पर जाएँ</Link>
        </div>
      </div>
    </main>
  );
}

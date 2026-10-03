'use client';

import {
  READING_SIZES,
  type ReadingAlign,
  type ReadingPrefs,
  type ReadingSize,
  type ReadingTheme,
} from '@/hooks/use-reading-prefs';

interface Props {
  prefs: ReadingPrefs;
  onChange: (patch: Partial<ReadingPrefs>) => void;
}

const ALIGNS: { key: ReadingAlign; icon: string; label: string }[] = [
  { key: 'left', icon: 'fa-align-left', label: 'बाएँ संरेखित' },
  { key: 'center', icon: 'fa-align-center', label: 'बीच में संरेखित' },
  { key: 'right', icon: 'fa-align-right', label: 'दाएँ संरेखित' },
];

const THEMES: { key: ReadingTheme; label: string }[] = [
  { key: 'light', label: 'हल्का' },
  { key: 'sepia', label: 'सेपिया' },
  { key: 'dark', label: 'गहरा' },
  { key: 'contrast', label: 'हाई कॉन्ट्रास्ट' },
];

export function ReadingToolbar({ prefs, onChange }: Props) {
  const sizeIdx = READING_SIZES.indexOf(prefs.size);
  const step = (dir: -1 | 1) => {
    const next = READING_SIZES[Math.min(READING_SIZES.length - 1, Math.max(0, sizeIdx + dir))] as ReadingSize;
    onChange({ size: next });
  };

  return (
    <div className="reading-toolbar" role="toolbar" aria-label="पढ़ने की सेटिंग">
      {/* Text size */}
      <div className="rt-group" role="group" aria-label="अक्षर का आकार">
        <button
          type="button"
          className="rt-btn rt-size rt-size-sm"
          onClick={() => step(-1)}
          disabled={sizeIdx === 0}
          aria-label="अक्षर छोटे करें"
          title="अक्षर छोटे करें"
        >
          A<span aria-hidden="true">&minus;</span>
        </button>
        <span className="rt-size-state" aria-live="polite">
          {prefs.size === 'sm' ? 'छोटा' : prefs.size === 'md' ? 'मध्यम' : 'बड़ा'}
        </span>
        <button
          type="button"
          className="rt-btn rt-size rt-size-lg"
          onClick={() => step(1)}
          disabled={sizeIdx === READING_SIZES.length - 1}
          aria-label="अक्षर बड़े करें"
          title="अक्षर बड़े करें"
        >
          A<span aria-hidden="true">+</span>
        </button>
      </div>

      <span className="rt-divider" aria-hidden="true" />

      {/* Alignment */}
      <div className="rt-group" role="group" aria-label="पाठ का संरेखण">
        {ALIGNS.map((a) => (
          <button
            key={a.key}
            type="button"
            className={`rt-btn${prefs.align === a.key ? ' active' : ''}`}
            onClick={() => onChange({ align: a.key })}
            aria-pressed={prefs.align === a.key}
            aria-label={a.label}
            title={a.label}
          >
            <i className={`fas ${a.icon}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <span className="rt-divider" aria-hidden="true" />

      {/* Theme */}
      <div className="rt-group" role="group" aria-label="पढ़ने की थीम">
        {THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`rt-btn rt-theme rt-theme-${t.key}${prefs.theme === t.key ? ' active' : ''}`}
            onClick={() => onChange({ theme: t.key })}
            aria-pressed={prefs.theme === t.key}
            aria-label={`${t.label} थीम`}
            title={`${t.label} थीम`}
          >
            <span className="rt-swatch" aria-hidden="true">अ</span>
          </button>
        ))}
      </div>
    </div>
  );
}

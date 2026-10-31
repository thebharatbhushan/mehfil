'use client';

import {
  ALIGN_OPTIONS,
  BACKGROUND_OPTIONS,
  DECORATION_OPTIONS,
  DEFAULT_OPTIONS,
  FONT_OPTIONS,
  SIZE_OPTIONS,
} from '@/lib/shareCard/types';
import type { OptionItem, ShareCardOptions } from '@/lib/shareCard/types';
import { THEMES } from '@/lib/shareCard/themes';

interface Props {
  options: ShareCardOptions;
  onChange: (patch: Partial<ShareCardOptions>) => void;
}

function Group<T extends string>({
  label,
  value,
  items,
  onSelect,
  render,
}: {
  label: string;
  value: T;
  items: OptionItem<T>[];
  onSelect: (id: T) => void;
  render?: (item: OptionItem<T>) => React.ReactNode;
}) {
  return (
    <fieldset className="sc-field">
      <legend className="sc-legend">{label}</legend>
      <div className="sc-chips" role="radiogroup" aria-label={label}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={value === item.id}
            className={`sc-chip${value === item.id ? ' is-active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            {render ? render(item) : (
              <>
                {item.label}
                <small>{item.hint}</small>
              </>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const ALIGN_ICON = { left: 'fa-align-left', center: 'fa-align-center', right: 'fa-align-right' } as const;

export function ShareCardEditor({ options, onChange }: Props) {
  const isDefault = (Object.keys(DEFAULT_OPTIONS) as Array<keyof ShareCardOptions>).every((k) => options[k] === DEFAULT_OPTIONS[k]);

  return (
    <div className="sc-editor">
      {/* Background */}
      <fieldset className="sc-field">
        <legend className="sc-legend">पृष्ठभूमि · Background</legend>
        <div className="sc-swatches" role="radiogroup" aria-label="पृष्ठभूमि">
          {BACKGROUND_OPTIONS.map((item) => {
            const t = THEMES[item.id];
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={options.background === item.id}
                className={`sc-swatch${options.background === item.id ? ' is-active' : ''}`}
                onClick={() => onChange({ background: item.id })}
              >
                <span className="sc-swatch-dot" style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }} aria-hidden="true">
                  <i className="fas fa-feather-alt" style={{ color: t.accent }} />
                </span>
                <span className="sc-swatch-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Group label="सजावट · Decoration" value={options.decoration} items={DECORATION_OPTIONS} onSelect={(decoration) => onChange({ decoration })} />
      <Group label="लिखावट · Text style" value={options.font} items={FONT_OPTIONS} onSelect={(font) => onChange({ font })} />

      <div className="sc-row">
        <fieldset className="sc-field">
          <legend className="sc-legend">संरेखण · Align</legend>
          <div className="sc-chips sc-chips-tight" role="radiogroup" aria-label="संरेखण">
            {ALIGN_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={options.align === item.id}
                aria-label={`${item.label} (${item.hint})`}
                title={item.label}
                className={`sc-chip sc-chip-icon${options.align === item.id ? ' is-active' : ''}`}
                onClick={() => onChange({ align: item.id })}
              >
                <i className={`fas ${ALIGN_ICON[item.id]}`} aria-hidden="true" />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="sc-field">
          <legend className="sc-legend">आकार · Size</legend>
          <div className="sc-chips sc-chips-tight" role="radiogroup" aria-label="अक्षर का आकार">
            {SIZE_OPTIONS.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={options.size === item.id}
                aria-label={`${item.label} (${item.hint})`}
                title={item.label}
                className={`sc-chip sc-chip-icon${options.size === item.id ? ' is-active' : ''}`}
                onClick={() => onChange({ size: item.id })}
              >
                <span aria-hidden="true" style={{ fontSize: `${0.85 + i * 0.22}rem`, fontWeight: 700 }}>अ</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <button type="button" className="sc-reset" onClick={() => onChange({ ...DEFAULT_OPTIONS })} disabled={isDefault}>
        <i className="fas fa-undo" aria-hidden="true" /> डिफ़ॉल्ट पर लौटें
      </button>
    </div>
  );
}

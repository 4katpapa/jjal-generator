import { useEffect, useRef, useState } from 'react';
import { BUILTIN_FONTS, loadSystemFonts, useFonts } from '../editor/fonts';

interface NumberProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  percent?: boolean;
  slider?: boolean;
}

function clamp(v: number, min?: number, max?: number): number {
  let out = v;
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
}

function decimals(step: number): number {
  const s = String(step);
  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
}

/**
 * 슬라이더 + 숫자 칸. 범위를 벗어난 값을 치면 입력을 마칠 때 칸에 실제 적용값을 되돌려 보여준다.
 * (입력한 값과 적용된 값이 조용히 달라지는 일을 막는다.)
 */
export function NumberControl({ value, onChange, min, max, step = 1, unit, percent, slider }: NumberProps) {
  const k = percent ? 100 : 1;
  const dStep = percent ? Math.max(1, Math.round(step * 100)) : step;
  const digits = decimals(dStep);
  const shown = Number((value * k).toFixed(digits));
  const [text, setText] = useState(String(shown));
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setText(String(shown));
  }, [shown]);

  const emit = (display: number) => {
    const real = clamp(display / k, min, max);
    onChange(Number(real.toFixed(decimals(step) + (percent ? 2 : 0))));
  };

  const showSlider = slider !== false && min !== undefined && max !== undefined;
  return (
    <div className="num">
      {showSlider && (
        <input
          type="range" min={min! * k} max={max! * k} step={dStep} value={shown}
          onChange={(e) => emit(Number(e.target.value))}
        />
      )}
      <input
        type="number" className="num-box" value={text} step={dStep}
        min={min !== undefined ? min * k : undefined} max={max !== undefined ? max * k : undefined}
        onFocus={() => { editing.current = true; }}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(n)) emit(n);
        }}
        onBlur={() => { editing.current = false; setText(String(shown)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
      {(unit || percent) && <span className="unit">{percent ? '%' : unit}</span>}
    </div>
  );
}

export function ColorControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="color">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input
        type="text" className="hex" value={text} spellCheck={false} maxLength={7}
        onChange={(e) => {
          setText(e.target.value);
          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value.toLowerCase());
        }}
        onBlur={() => setText(value)}
      />
    </div>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={value} aria-label={label}
      className={`switch${value ? ' on' : ''}`} onClick={() => onChange(!value)}
    >
      <span />
    </button>
  );
}

export function Segment<T extends string | number>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="segment">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const LOAD_FONTS = '__load_system_fonts__';

export function FontControl({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const fonts = useFonts();
  const known = BUILTIN_FONTS.some((f) => f.family === value) || fonts.system.includes(value);
  return (
    <div className="font">
      <select
        value={value} style={{ fontFamily: `"${value}"` }}
        onChange={(e) => {
          if (e.target.value === LOAD_FONTS) void loadSystemFonts();
          else onChange(e.target.value);
        }}
      >
        {!known && <option value={value}>{value}</option>}
        <optgroup label="기본">
          {BUILTIN_FONTS.map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}
        </optgroup>
        {fonts.system.length > 0 && (
          <optgroup label="내 PC 글꼴">
            {fonts.system.map((f) => <option key={f} value={f}>{f}</option>)}
          </optgroup>
        )}
        {fonts.status !== 'ready' && (
          <option value={LOAD_FONTS}>{fonts.status === 'loading' ? '내 PC 글꼴 불러오는 중…' : '＋ 내 PC 글꼴 불러오기…'}</option>
        )}
      </select>
      {!compact && fonts.status !== 'ready' && (
        <button type="button" className="mini" disabled={fonts.status === 'loading'} onClick={() => { void loadSystemFonts(); }}>
          {fonts.status === 'loading' ? '불러오는 중…' : '내 PC 글꼴 불러오기'}
        </button>
      )}
      {!compact && fonts.message && fonts.status === 'unavailable' && <p className="note">{fonts.message}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div className="modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">✕</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

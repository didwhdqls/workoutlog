import { useEffect, useRef, useState } from 'react';
import { fmtNum, parseNum } from '../lib/util';

/**
 * 숫자 입력. "62." 처럼 입력 도중 상태를 잃지 않도록 내부 문자열을 따로 들고 있습니다.
 */
export function NumInput({
  value,
  onChange,
  placeholder,
  decimal = true,
  className = 'num-in',
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  decimal?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(fmtNum(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current || parseNum(text) !== value) setText(fmtNum(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      className={className}
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="next"
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(fmtNum(value));
      }}
      onChange={(e) => {
        const raw = decimal ? e.target.value.replace(/[^0-9.,]/g, '') : e.target.value.replace(/[^0-9]/g, '');
        setText(raw);
        onChange(parseNum(raw));
      }}
    />
  );
}

/** 시간(초) 입력: "1:30" 또는 "90" */
export function TimeInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  const fmt = (v: number | null) => (v == null ? '' : `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`);
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(fmt(value));
  }, [value]);

  const parse = (s: string): number | null => {
    if (!s.trim()) return null;
    if (s.includes(':')) {
      const [m, sec] = s.split(':');
      return (Number(m) || 0) * 60 + (Number(sec) || 0);
    }
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  return (
    <input
      className="num-in"
      inputMode="numeric"
      value={text}
      placeholder={placeholder ?? '0:00'}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(fmt(value));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9:]/g, '');
        setText(raw);
        onChange(parse(raw));
      }}
    />
  );
}

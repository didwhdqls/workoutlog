import { useEffect, useRef, useState } from 'react';

export interface Bar {
  key: number;
  label: string;
  value: number;
  tip: string;
  tipSub?: string;
}

/**
 * 주간 추이 막대그래프 (한 가지 값). 선택한 막대는 진하게, 나머지는 옅게.
 * 막대를 탭하면 onSelect, 마우스를 올리면 툴팁.
 */
export function BarChart({
  bars,
  selectedKey,
  onSelect,
  fmtAxis,
  height = 190,
  integer = false,
}: {
  bars: Bar[];
  selectedKey: number;
  onSelect: (key: number) => void;
  fmtAxis: (v: number) => string;
  height?: number;
  /** 세트 수처럼 정수 눈금만 쓸 때 */
  integer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(220, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { l: 42, r: 8, t: 12, b: 24 };
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = Math.max(...bars.map((b) => b.value), 0);
  const raw = niceStep(max / 3);
  const step = integer ? Math.max(1, Math.ceil(raw)) : raw;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);

  const slot = iw / bars.length;
  const gap = Math.max(2, Math.min(8, slot * 0.28));
  const bw = slot - gap;
  const sy = (v: number) => pad.t + ih - (v / top) * ih;
  const labelEvery = Math.max(1, Math.ceil(bars.length / Math.floor(iw / 40)));

  const hi = hover != null ? bars[hover] : null;

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }} onPointerLeave={() => setHover(null)}>
      <svg width={w} height={height} role="img" aria-label="주간 추이 막대그래프">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 8} y={sy(t)} dy="0.35em" textAnchor="end" fontSize={11} fill="var(--text-3)" className="tnum">
              {fmtAxis(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const x = pad.l + i * slot + gap / 2;
          const y = sy(b.value);
          const h = pad.t + ih - y;
          const selected = b.key === selectedKey;
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={b.key}>
              {h > 0.5 && (
                <path
                  d={`M${x},${pad.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${pad.t + ih} Z`}
                  fill="var(--accent)"
                  opacity={selected ? 1 : hover === i ? 0.6 : 0.32}
                />
              )}
              {/* 최근 주(오른쪽 끝)부터 일정 간격으로 라벨 */}
              {(bars.length - 1 - i) % labelEvery === 0 && (
                <text
                  x={x + bw / 2}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fill={selected ? 'var(--text)' : 'var(--text-3)'}
                  fontWeight={selected ? 700 : 400}
                >
                  {b.label}
                </text>
              )}
              {/* 막대보다 넓은 터치 영역 */}
              <rect
                x={pad.l + i * slot}
                y={pad.t}
                width={slot}
                height={ih + pad.b}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => setHover(i)}
                onClick={() => onSelect(b.key)}
              />
            </g>
          );
        })}
      </svg>
      {hi && hover != null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: Math.min(Math.max(pad.l + hover * slot + slot / 2 - 75, 0), w - 150),
            width: 150,
            background: 'var(--surface-3)',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: 12,
            pointerEvents: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,.25)',
          }}
        >
          <div className="faint">{hi.tipSub}</div>
          <div style={{ fontWeight: 700, fontSize: 14 }} className="tnum">
            {hi.tip}
          </div>
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

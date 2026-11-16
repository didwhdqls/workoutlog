import { useEffect, useMemo, useRef, useState } from 'react';

export interface Point {
  x: number; // timestamp
  y: number;
  tip: string; // 툴팁 두 번째 줄 (예: 60kg × 10)
  date: string;
}

/** 기구별 진행 추이: 한 줄짜리 선 그래프 + 탭/호버 툴팁 */
export function LineChart({ points, unit, height = 180 }: { points: Point[]; unit: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { l: 40, r: 14, t: 14, b: 26 };
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;

  const geo = useMemo(() => {
    const ys = points.map((p) => p.y);
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    if (lo === hi) {
      lo -= Math.max(1, lo * 0.1);
      hi += Math.max(1, hi * 0.1);
    }
    const step = niceStep((hi - lo) / 3);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);

    const x0 = points[0]?.x ?? 0;
    const x1 = points[points.length - 1]?.x ?? 1;
    const byTime = x1 - x0 > 0;
    const sx = (p: Point, i: number) =>
      pad.l + (points.length === 1 ? iw / 2 : byTime ? ((p.x - x0) / (x1 - x0)) * iw : (i / (points.length - 1)) * iw);
    const sy = (v: number) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;
    const xy = points.map((p, i) => [sx(p, i), sy(p.y)] as const);
    return { ticks, sy, xy };
  }, [points, iw, ih, pad.l, pad.t]);

  const onMove = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    let best = 0;
    geo.xy.forEach(([px], i) => {
      if (Math.abs(px - x) < Math.abs(geo.xy[best][0] - x)) best = i;
    });
    setHover(best);
  };

  if (points.length === 0) return null;
  const path = geo.xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const h = hover != null ? points[hover] : null;
  const hxy = hover != null ? geo.xy[hover] : null;

  return (
    <div
      ref={ref}
      style={{ position: 'relative', touchAction: 'pan-y', userSelect: 'none' }}
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerDown={(e) => onMove(e.clientX)}
      onPointerLeave={() => setHover(null)}
    >
      <svg width={w} height={height} role="img" aria-label={`추이 그래프, ${points.length}개 기록`}>
        {geo.ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={geo.sy(t)} y2={geo.sy(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 8} y={geo.sy(t)} dy="0.35em" textAnchor="end" fontSize={11} fill="var(--text-3)" className="tnum">
              {t}
            </text>
          </g>
        ))}
        <text x={pad.l} y={height - 6} fontSize={11} fill="var(--text-3)">
          {points[0].date}
        </text>
        {points.length > 1 && (
          <text x={w - pad.r} y={height - 6} fontSize={11} fill="var(--text-3)" textAnchor="end">
            {points[points.length - 1].date}
          </text>
        )}
        {hxy && <line x1={hxy[0]} x2={hxy[0]} y1={pad.t} y2={pad.t + ih} stroke="var(--text-3)" strokeWidth={1} strokeDasharray="3 3" />}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {geo.xy.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={hover === i ? 5.5 : 4}
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}
      </svg>
      {h && hxy && (
        <div
          style={{
            position: 'absolute',
            // 점이 위쪽에 있으면 툴팁을 아래로 내려 점을 가리지 않게
            top: hxy[1] < height / 2 ? height - pad.b - 64 : 0,
            left: Math.min(Math.max(hxy[0] - 70, 0), w - 140),
            width: 140,
            background: 'var(--surface-3)',
            borderRadius: 10,
            padding: '6px 10px',
            fontSize: 12,
            pointerEvents: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,.25)',
          }}
        >
          <div className="faint">{h.date}</div>
          <div style={{ fontWeight: 700, fontSize: 14 }} className="tnum">
            {round1(h.y)}
            {unit}
          </div>
          <div className="muted tnum">{h.tip}</div>
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
const round1 = (v: number) => Math.round(v * 10) / 10;

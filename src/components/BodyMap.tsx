import { useState, type ReactNode } from 'react';
import { SUB_LABEL, type SubMuscle } from '../data/muscles';
import { LEVEL_LABEL, fmtHoursLeft, type FatigueLevel, type MuscleFatigue } from '../lib/fatigue';

/** 단계별 색 (0 = 회복됨은 몸 바탕보다 조금 밝은 회색) */
export const LEVEL_COLOR: Record<FatigueLevel, string> = {
  0: 'var(--body-muscle)',
  1: '#e9c46a',
  2: '#f08a4b',
  3: '#e5484d',
};

/**
 * 한쪽(왼쪽) 근육 모양. 오른쪽은 좌우 반전해서 그립니다. 좌표계: 가로 120 × 세로 260, 몸 중심 x = 60.
 * 해부도처럼 정밀하진 않고 부위 위치만 알아볼 수 있게 단순화한 도형입니다.
 */
type Shape = { sub: SubMuscle; d: string };
const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
  // 회전한 타원을 path로 (클릭 영역·반전을 path 하나로 다루려고)
  const r = (rot * Math.PI) / 180;
  const pt = (t: number) => {
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    return `${(cx + x * Math.cos(r) - y * Math.sin(r)).toFixed(1)} ${(cy + x * Math.sin(r) + y * Math.cos(r)).toFixed(1)}`;
  };
  const n = 24;
  return 'M' + Array.from({ length: n }, (_, i) => pt((i / n) * Math.PI * 2)).join(' L') + ' Z';
};

const FRONT: Shape[] = [
  { sub: 'upper-chest', d: 'M59 43 Q48 41 40 48 L38 55 Q47 50 59 51 Z' },
  { sub: 'chest', d: 'M59 53 Q47 52 38 57 Q37 69 48 74 Q56 75 59 71 Z' },
  { sub: 'front-delt', d: ell(35, 48, 6.5, 8, 20) },
  { sub: 'side-delt', d: ell(28.5, 50, 4, 8.5, 12) },
  { sub: 'traps', d: 'M54 34 Q48 39 41 41 L56 41 Z' },
  { sub: 'biceps', d: ell(27, 70, 5.2, 13, 8) },
  { sub: 'forearms', d: ell(20.5, 106, 5, 16, 12) },
  { sub: 'abs', d: 'M51.5 78 h7 a1.5 1.5 0 0 1 1.5 1.5 v39 a1.5 1.5 0 0 1 -1.5 1.5 h-5 Q50 118 50.5 110 Z' },
  { sub: 'quads', d: ell(48.5, 170, 9, 27, -3) },
  { sub: 'adductors', d: ell(56.5, 155, 3.2, 14, -6) },
  { sub: 'calves', d: ell(43, 214, 3.5, 14, 2) },
];

const BACK: Shape[] = [
  { sub: 'traps', d: 'M60 30 Q53 38 41 42 Q50 46 60 56 Z' },
  { sub: 'mid-back', d: 'M60 57 Q51 48 45 48 L48 70 Q55 76 60 77 Z' },
  { sub: 'rear-delt', d: ell(35, 48, 6.5, 8, -20) },
  { sub: 'side-delt', d: ell(28.5, 50, 4, 8.5, 12) },
  { sub: 'lats', d: 'M44 52 Q37 72 45 98 Q52 96 57 90 L58 80 Q52 77 47 71 Z' },
  { sub: 'lower-back', d: 'M53.5 92 Q57 88 59.5 88 L59.5 120 L54 120 Q52 106 53.5 92 Z' },
  { sub: 'triceps', d: ell(26.5, 70, 5.4, 13.5, 8) },
  { sub: 'forearms', d: ell(20.5, 106, 5, 16, 12) },
  { sub: 'glutes', d: ell(50, 134, 10, 11, 0) },
  { sub: 'hamstrings', d: ell(49, 174, 8.5, 23, -3) },
  { sub: 'calves', d: ell(47, 215, 7, 15, 2) },
];

/** 몸 실루엣 (한쪽) */
const SILHOUETTE = [
  'M60 6 a12 13 0 1 0 0.1 0 Z', // 머리 (한쪽만 그려도 반전으로 이어짐)
  'M54 29 h6 v9 h-6 Z', // 목
  'M60 37 L44 38 Q33 40 30 46 L32 92 L38 124 L60 126 Z', // 몸통
  'M38 120 L60 122 L60 146 L37 142 Z', // 골반
  ell(26, 72, 7, 25, 8), // 위팔
  ell(19.5, 108, 6.2, 20, 12), // 아래팔
  ell(15, 133, 4.5, 6, 12), // 손
  'M37 140 Q36 172 41 198 L58 198 Q61 168 60 144 Z', // 허벅지
  'M41 196 Q38 222 42 244 L52 244 Q56 222 57 196 Z', // 정강이
  'M41 243 L53 243 Q55 250 50 252 L39 252 Q37 248 41 243 Z', // 발
];

function Figure({
  shapes,
  fatigue,
  selected,
  onSelect,
  label,
}: {
  shapes: Shape[];
  fatigue: Map<SubMuscle, MuscleFatigue>;
  selected: SubMuscle | null;
  onSelect: (s: SubMuscle) => void;
  label: string;
}) {
  const half = (key: string): ReactNode => (
    <>
      {SILHOUETTE.map((d, i) => (
        <path key={key + 's' + i} d={d} fill="var(--body-base)" />
      ))}
      {shapes.map((s, i) => {
        const lv = fatigue.get(s.sub)?.level ?? 0;
        return (
          <path
            key={key + i}
            d={s.d}
            fill={LEVEL_COLOR[lv]}
            stroke={selected === s.sub ? 'var(--text)' : 'var(--body-line)'}
            strokeWidth={selected === s.sub ? 1.2 : 0.6}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(s.sub)}
          >
            <title>
              {SUB_LABEL[s.sub]} · {LEVEL_LABEL[lv]}
            </title>
          </path>
        );
      })}
    </>
  );
  return (
    <figure style={{ margin: 0, flex: 1, minWidth: 0, textAlign: 'center' }}>
      <svg viewBox="0 0 120 258" style={{ width: '100%', maxWidth: 150, height: 'auto' }} role="img" aria-label={`${label} 근육 피로도`}>
        {half('l')}
        <g transform="translate(120 0) scale(-1 1)">{half('r')}</g>
      </svg>
      <figcaption className="tiny faint">{label}</figcaption>
    </figure>
  );
}

/** 앞·뒤 몸 모형에 부위별 피로도를 색으로 표시. 부위를 누르면 이름과 회복까지 남은 시간 */
export function BodyMap({
  fatigue,
  showLegend = true,
  onPick,
  hint,
}: {
  fatigue: Map<SubMuscle, MuscleFatigue>;
  showLegend?: boolean;
  /** 있으면 부위를 눌렀을 때 정보 대신 이 함수를 부름 (운동 만들기에서 부위 고르기) */
  onPick?: (s: SubMuscle) => void;
  /** onPick 모드에서 모형 아래에 보일 글 */
  hint?: ReactNode;
}) {
  const [selected, setSelected] = useState<SubMuscle | null>(null);
  const sel = selected ? fatigue.get(selected) : null;
  const choose = (s: SubMuscle) => (onPick ? onPick(s) : setSelected(s));
  return (
    <div>
      <div className="row" style={{ gap: 8, alignItems: 'flex-start', justifyContent: 'center' }}>
        <Figure shapes={FRONT} fatigue={fatigue} selected={onPick ? null : selected} onSelect={choose} label="앞" />
        <Figure shapes={BACK} fatigue={fatigue} selected={onPick ? null : selected} onSelect={choose} label="뒤" />
      </div>
      <div className="small" style={{ textAlign: 'center', minHeight: 20, marginTop: 6 }}>
        {onPick ? (
          hint
        ) : selected && sel ? (
          <>
            <b>{SUB_LABEL[selected]}</b> · {LEVEL_LABEL[sel.level]}
            {sel.level > 0 && <span className="muted"> · {fmtHoursLeft(sel.hoursLeft)}</span>}
          </>
        ) : (
          <span className="faint">부위를 누르면 회복까지 남은 시간이 보여요</span>
        )}
      </div>
      {showLegend && (
        <div className="row tiny muted" style={{ justifyContent: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          {([0, 1, 2, 3] as FatigueLevel[]).map((lv) => (
            <span key={lv} className="row" style={{ gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: LEVEL_COLOR[lv], display: 'inline-block' }} />
              {LEVEL_LABEL[lv]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** 피로한 부위 목록 (많이 피로한 순) */
export function FatigueList({ fatigue }: { fatigue: Map<SubMuscle, MuscleFatigue> }) {
  const rows = [...fatigue.entries()].filter(([, f]) => f.level > 0).sort((a, b) => b[1].score - a[1].score);
  if (rows.length === 0) return <div className="small muted" style={{ textAlign: 'center' }}>모든 부위가 회복된 상태예요.</div>;
  return (
    <div className="list" style={{ marginTop: 10 }}>
      {rows.map(([sub, f]) => (
        <div key={sub} className="list-item" style={{ padding: '8px 12px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: LEVEL_COLOR[f.level], flex: 'none' }} />
          <span className="grow small">{SUB_LABEL[sub]}</span>
          <span className="tiny muted">
            {LEVEL_LABEL[f.level]} · {fmtHoursLeft(f.hoursLeft)}
          </span>
        </div>
      ))}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { SUB_LABEL, type SubMuscle } from '../data/muscles';
import { levelOf, type MuscleFatigue } from '../lib/fatigue';
import { fmtMinutes, planRoutine } from '../lib/routinePlan';
import { useMaps, useStore } from '../store';
import { MUSCLE_LABEL, type Routine } from '../types';
import { BodyMap, LEVEL_COLOR } from './BodyMap';
import { Icon } from './Icon';

const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** 루틴 목록·홈에 쓰는 한 줄 요약: "약 55분 · 18세트 · 등 10 · 이두 6" */
export function RoutineLine({ r }: { r: Routine }) {
  const maps = useMaps();
  const workouts = useStore((s) => s.workouts);
  const p = useMemo(() => planRoutine(r, maps.ex, workouts), [r, maps.ex, workouts]);
  if (!p.sets) return null;
  return (
    <span className="tnum">
      <Icon name="timer" size={12} /> 약 {fmtMinutes(p.actual?.minutes ?? p.minutes)} · {p.sets}세트
      {p.groups.length > 0 && ' · ' + p.groups.slice(0, 3).map(([g, n]) => `${MUSCLE_LABEL[g]} ${n}`).join(' · ')}
    </span>
  );
}

/** 루틴 편집 화면의 미리 보기: 예상 시간 + 몸 모형으로 자극 부위 */
export function RoutineSummary({ r }: { r: Routine }) {
  const maps = useMaps();
  const workouts = useStore((s) => s.workouts);
  const p = useMemo(() => planRoutine(r, maps.ex, workouts), [r, maps.ex, workouts]);
  const [picked, setPicked] = useState<SubMuscle | null>(null);
  const [showMap, setShowMap] = useState(true);
  const map = useMemo(() => {
    const m = new Map<SubMuscle, MuscleFatigue>();
    for (const [s, v] of p.load) m.set(s, { score: v, level: levelOf(v), hoursLeft: 0 });
    return m;
  }, [p.load]);
  if (!p.sets) return null;

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
        <div className="grow">
          <div className="tiny muted">예상 시간</div>
          <div style={{ fontSize: 20, fontWeight: 800 }} className="tnum">
            약 {fmtMinutes(p.minutes)}
            <span className="small muted" style={{ fontWeight: 500 }}>
              {' '}
              · {r.items.length}개 운동 · {p.sets}세트
            </span>
          </div>
          <div className="tiny faint">
            {p.actual
              ? `이 루틴으로 한 최근 ${p.actual.count}번 평균 ${fmtMinutes(p.actual.minutes)}`
              : '세트당 40초 + 정해 둔 휴식 + 운동 사이 준비 1분 30초로 계산'}
          </div>
        </div>
        <button className="btn ghost sm" onClick={() => setShowMap((x) => !x)}>
          {showMap ? '부위 접기' : '자극 부위'}
        </button>
      </div>

      {showMap && (
        <>
          <div className="chips wrap" style={{ marginTop: 10 }}>
            {p.groups.map(([g, n]) => (
              <span key={g} className="chip sm">
                {MUSCLE_LABEL[g]} <b className="tnum" style={{ color: 'var(--text)' }}>{n}</b>
              </span>
            ))}
          </div>
          {p.subs.length > 0 && (
            <div className="tiny muted" style={{ marginTop: 6 }}>
              {p.subs.map(([s, n]) => `${SUB_LABEL[s]} ${n}`).join(' · ')}
              <span className="faint"> (주 부위 세트)</span>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <BodyMap
              fatigue={map}
              showLegend={false}
              onPick={(s) => setPicked(picked === s ? null : s)}
              hint={
                picked ? (
                  <span className="small">
                    <b>{SUB_LABEL[picked]}</b>
                    <span className="muted"> · 약 {fmtN(Math.round((p.load.get(picked) ?? 0) * 2) / 2)}세트만큼 자극</span>
                  </span>
                ) : (
                  <span className="tiny muted">
                    <span style={{ color: LEVEL_COLOR[3] }}>■</span> 많이 <span style={{ color: LEVEL_COLOR[2], marginLeft: 6 }}>■</span> 보통
                    <span style={{ color: LEVEL_COLOR[1], marginLeft: 6 }}>■</span> 조금
                    <span className="faint"> · 함께 쓰이는 부위는 절반으로 셈</span>
                  </span>
                )
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

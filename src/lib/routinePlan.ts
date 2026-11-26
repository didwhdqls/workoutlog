import { subMuscleOf, type SubMuscle } from '../data/muscles';
import type { Exercise, MuscleGroup, Routine, Workout } from '../types';
import { exerciseLoad } from './fatigue';

/**
 * 루틴 미리 보기: 예상 운동 시간과 자극 부위.
 * 시간 = 세트 수행(무게·횟수 세트 40초, 시간 세트는 정해 둔 시간) + 세트 사이 휴식 + 운동 사이 준비(90초).
 * 이 루틴을 실제로 해 본 기록이 있으면 그 평균 시간도 함께 보여 줍니다.
 */
const WORK_SEC = 40;
const TIME_SET_DEFAULT = 60;
const SWITCH_SEC = 90;

export interface RoutinePlan {
  sets: number;
  /** 예상 시간(분) */
  minutes: number;
  /** 이 루틴으로 실제로 한 운동의 평균 시간(분)과 횟수 */
  actual: { minutes: number; count: number } | null;
  /** 세부 부위별 자극(주 부위 1 + 보조 부위 0.5, 세트 수 기준) */
  load: Map<SubMuscle, number>;
  /** 부위 그룹별 세트 수 (주 부위 기준, 통계와 같은 방식) */
  groups: [MuscleGroup, number][];
  /** 세부 부위별 세트 수 (주 부위 기준) */
  subs: [SubMuscle, number][];
}

export function planRoutine(r: Routine, ex: Map<string, Exercise>, workouts: Workout[] = []): RoutinePlan {
  let sec = 0;
  let sets = 0;
  const load = new Map<SubMuscle, number>();
  const groups = new Map<MuscleGroup, number>();
  const subs = new Map<SubMuscle, number>();
  r.items.forEach((it, i) => {
    const x = ex.get(it.exerciseId);
    const n = it.sets.length;
    if (!n) return;
    sets += n;
    for (const s of it.sets) sec += x?.track === 'time' ? (s.time ?? TIME_SET_DEFAULT) : WORK_SEC;
    sec += it.restSec * (n - 1); // 운동 안 세트 사이 휴식
    if (i < r.items.length - 1) sec += it.restSec + SWITCH_SEC; // 다음 운동으로 넘어가기 전 휴식·준비
    if (x && x.muscle !== 'cardio') {
      groups.set(x.muscle, (groups.get(x.muscle) ?? 0) + n);
      const main = subMuscleOf(x);
      if (main) subs.set(main, (subs.get(main) ?? 0) + n);
      for (const [s, k] of exerciseLoad(x)) load.set(s, (load.get(s) ?? 0) + n * k);
    }
  });

  const done = workouts.filter((w) => w.routineId === r.id && w.endedAt && w.endedAt > w.startedAt).slice(0, 5);
  const actual = done.length
    ? { minutes: Math.round(done.reduce((a, w) => a + (w.endedAt! - w.startedAt), 0) / done.length / 60000), count: done.length }
    : null;

  return {
    sets,
    minutes: Math.max(1, Math.round(sec / 60 / 5) * 5 || Math.round(sec / 60)),
    actual,
    load,
    groups: [...groups.entries()].sort((a, b) => b[1] - a[1]),
    subs: [...subs.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** "약 55분" / "약 1시간 20분" */
export function fmtMinutes(m: number): string {
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`;
}

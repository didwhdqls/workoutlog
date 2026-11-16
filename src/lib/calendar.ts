import type { Exercise, MuscleGroup, Workout } from '../types';

/** 'YYYY-MM-DD' (기기 시간대 기준) */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDayKey(k: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export interface DayInfo {
  workouts: Workout[];
  /** 그날 세트가 많은 순 부위 */
  muscles: MuscleGroup[];
}

/** 날짜별 운동과 주로 한 부위 */
export function workoutsByDay(workouts: Workout[], ex: Map<string, Exercise>): Map<string, DayInfo> {
  const out = new Map<string, DayInfo>();
  const counts = new Map<string, Map<MuscleGroup, number>>();
  for (const w of workouts) {
    const k = dayKey(w.startedAt);
    const info = out.get(k) ?? { workouts: [], muscles: [] };
    info.workouts.push(w);
    out.set(k, info);
    const c = counts.get(k) ?? new Map<MuscleGroup, number>();
    for (const e of w.exercises) {
      const m = ex.get(e.exerciseId)?.muscle;
      if (!m || m === 'other') continue;
      c.set(m, (c.get(m) ?? 0) + e.sets.filter((s) => s.done && s.kind !== 'warmup').length);
    }
    counts.set(k, c);
  }
  for (const [k, info] of out) {
    info.muscles = [...(counts.get(k) ?? new Map<MuscleGroup, number>()).entries()]
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([m]) => m);
  }
  return out;
}

/** 달력 칸에 넣을 짧은 부위 이름 */
export const MUSCLE_SHORT: Record<MuscleGroup, string> = {
  chest: '가슴',
  back: '등',
  shoulders: '어깨',
  legs: '하체',
  arms: '팔',
  core: '복근',
  cardio: '유산소',
  other: '기타',
};

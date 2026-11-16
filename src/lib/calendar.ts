import type { Exercise, MuscleGroup, Routine, Workout } from '../types';

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
  /** 부위별 그날 세트 수 (워밍업 제외) */
  sets: Map<MuscleGroup, number>;
}

/** 날짜별 운동과 부위별 세트 수 */
export function workoutsByDay(workouts: Workout[], ex: Map<string, Exercise>): Map<string, DayInfo> {
  const out = new Map<string, DayInfo>();
  for (const w of workouts) {
    const k = dayKey(w.startedAt);
    const info = out.get(k) ?? { workouts: [], sets: new Map<MuscleGroup, number>() };
    info.workouts.push(w);
    for (const e of w.exercises) {
      const m = ex.get(e.exerciseId)?.muscle;
      if (!m || m === 'other') continue;
      const n = e.sets.filter((s) => s.done && s.kind !== 'warmup').length;
      if (n) info.sets.set(m, (info.sets.get(m) ?? 0) + n);
    }
    out.set(k, info);
  }
  return out;
}

/** 분할 이름에 쓰는 순서와 이름 (흔히 묶는 분류) */
const SPLIT_ORDER: MuscleGroup[] = ['back', 'chest', 'shoulders', 'arms', 'legs'];
const SPLIT_NAME: Partial<Record<MuscleGroup, string>> = { back: '등', chest: '가슴', shoulders: '어깨', arms: '팔', legs: '하체' };
const UPPER: MuscleGroup[] = ['back', 'chest', 'shoulders', 'arms'];

/**
 * 그날을 한 단어로: 루틴으로 했으면 루틴 이름, 아니면 한 부위로
 *  - 상체 부위 + 하체 → 전신
 *  - 상체 부위 3개 이상 (예: 등·가슴·어깨) → 상체
 *  - 2개 → 등&가슴, 가슴&어깨 …
 *  - 1개 → 등 / 하체 …, 복근·유산소만 했으면 복근 / 유산소
 * 한두 세트만 곁들인 부위는 빼고 셉니다 (그날 가장 많이 한 부위의 25% 미만이고 2세트 이하).
 */
export function dayLabel(info: DayInfo, routines: Map<string, Routine>): string {
  // 그날 운동이 모두 같은 루틴이면 루틴 이름
  const rIds = new Set(info.workouts.map((w) => w.routineId));
  if (rIds.size === 1) {
    const rid = [...rIds][0];
    const r = rid ? routines.get(rid) : undefined;
    if (r?.name.trim()) return r.name.trim();
  }

  const max = Math.max(0, ...info.sets.values());
  const main = SPLIT_ORDER.filter((m) => {
    const n = info.sets.get(m) ?? 0;
    return n > 0 && (n > 2 || n >= max * 0.25);
  });
  if (main.length === 0) {
    if (info.sets.get('core')) return '복근';
    if (info.sets.get('cardio')) return '유산소';
    return '운동';
  }
  const upper = main.filter((m) => UPPER.includes(m));
  if (upper.length > 0 && main.includes('legs')) return '전신';
  if (upper.length >= 3) return '상체';
  return main.map((m) => SPLIT_NAME[m]).join('&');
}

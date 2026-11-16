import { subMuscleOf, type SubMuscle } from '../data/muscles';
import type { Exercise, MuscleGroup, Variant, Workout } from '../types';
import { isWorkSet, loadMode, setVolumeKg, workoutBw } from './stats';

// ─── 주 경계 ─────────────────────────────────────────────────
/** ts 가 속한 주의 시작(자정, 로컬 시간). weekStart 1 = 월요일, 0 = 일요일 */
export function startOfWeek(ts: number, weekStart: 0 | 1): number {
  const d = new Date(ts);
  const diff = (d.getDay() - weekStart + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff).getTime();
}

export function shiftWeek(start: number, n: number): number {
  const d = new Date(start);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * n).getTime();
}

// ─── 한 주 집계 ──────────────────────────────────────────────
export interface MuscleBucket {
  sets: number;
  volumeKg: number;
  subs: Map<SubMuscle, number>;
  exercises: Map<string, { sets: number; volumeKg: number }>;
}

export interface WeekStats {
  start: number;
  end: number;
  workouts: number;
  durationMs: number;
  /** 본 세트 수 (워밍업 제외, 유산소 제외) */
  sets: number;
  /** kg 환산 볼륨 (lb 는 환산, "칸" 단위 기구는 제외) */
  volumeKg: number;
  cardioSec: number;
  muscles: Map<MuscleGroup, MuscleBucket>;
}

const emptyBucket = (): MuscleBucket => ({ sets: 0, volumeKg: 0, subs: new Map(), exercises: new Map() });

/**
 * 세트 수 규칙 (플릭과 비슷하게):
 *  - 완료 체크한 세트만, 워밍업 세트는 제외
 *  - 운동의 주 타깃 부위 1곳에만 1세트로 셈 (보조 근육 분배 없음)
 *  - 유산소는 세트 대신 시간으로 따로 집계
 */
export function computeWeek(
  workouts: Workout[],
  start: number,
  ex: Map<string, Exercise>,
  variants: Map<string, Variant>,
  /** 기록에 체중이 없을 때 쓸 체중 (설정 값) */
  bwFallback: number | null = null,
): WeekStats {
  const end = shiftWeek(start, 1);
  const out: WeekStats = { start, end, workouts: 0, durationMs: 0, sets: 0, volumeKg: 0, cardioSec: 0, muscles: new Map() };

  for (const w of workouts) {
    if (w.startedAt < start || w.startedAt >= end) continue;
    out.workouts++;
    out.durationMs += (w.endedAt ?? w.startedAt) - w.startedAt;

    const bw = workoutBw(w, bwFallback);
    for (const entry of w.exercises) {
      const x = ex.get(entry.exerciseId);
      const muscle: MuscleGroup = x?.muscle ?? 'other';
      const v = entry.variantId ? variants.get(entry.variantId) : undefined;
      const unit = v?.unit || 'kg';
      const mode = loadMode(entry, x, v);
      const sub = subMuscleOf(x);

      for (const s of entry.sets) {
        if (!isWorkSet(s)) continue;
        if (muscle === 'cardio') {
          out.cardioSec += s.time ?? 0;
          continue;
        }
        const kg = setVolumeKg(s, mode, unit, bw);
        const b = out.muscles.get(muscle) ?? emptyBucket();
        b.sets++;
        b.volumeKg += kg;
        if (sub) b.subs.set(sub, (b.subs.get(sub) ?? 0) + 1);
        const e = b.exercises.get(entry.exerciseId) ?? { sets: 0, volumeKg: 0 };
        e.sets++;
        e.volumeKg += kg;
        b.exercises.set(entry.exerciseId, e);
        out.muscles.set(muscle, b);
        out.sets++;
        out.volumeKg += kg;
      }
    }
  }
  return out;
}

// ─── 여러 주 추이 ────────────────────────────────────────────
export interface WeekPoint {
  start: number;
  volumeKg: number;
  sets: number;
  workouts: number;
}

/** lastStart 주를 마지막으로 하는 count 주 동안의 주별 합계 (오래된 주 → 최근 주) */
export function weeklySeries(
  workouts: Workout[],
  lastStart: number,
  count: number,
  weekStart: 0 | 1,
  ex: Map<string, Exercise>,
  variants: Map<string, Variant>,
  bwFallback: number | null = null,
): WeekPoint[] {
  const weeks: WeekPoint[] = Array.from({ length: count }, (_, i) => ({
    start: shiftWeek(lastStart, i - count + 1),
    volumeKg: 0,
    sets: 0,
    workouts: 0,
  }));
  const index = new Map(weeks.map((w, i) => [w.start, i]));
  for (const w of workouts) {
    const i = index.get(startOfWeek(w.startedAt, weekStart));
    if (i === undefined) continue;
    const p = weeks[i];
    p.workouts++;
    const bw = workoutBw(w, bwFallback);
    for (const entry of w.exercises) {
      const x = ex.get(entry.exerciseId);
      if (x?.muscle === 'cardio') continue;
      const v = entry.variantId ? variants.get(entry.variantId) : undefined;
      const unit = v?.unit || 'kg';
      const mode = loadMode(entry, x, v);
      for (const s of entry.sets) {
        if (!isWorkSet(s)) continue;
        p.sets++;
        p.volumeKg += setVolumeKg(s, mode, unit, bw);
      }
    }
  }
  return weeks;
}

/** 지난주 대비 변화율 텍스트 */
export function deltaText(cur: number, prev: number): string {
  if (prev <= 0) return cur > 0 ? '지난주 기록 없음' : '–';
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return '지난주와 같음';
  return `지난주 대비 ${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%`;
}

export function fmtWeekRange(start: number): string {
  const s = new Date(start);
  const e = new Date(shiftWeek(start, 1) - 1);
  const sm = s.getMonth() + 1;
  const em = e.getMonth() + 1;
  return sm === em ? `${sm}월 ${s.getDate()}일 – ${e.getDate()}일` : `${sm}월 ${s.getDate()}일 – ${em}월 ${e.getDate()}일`;
}

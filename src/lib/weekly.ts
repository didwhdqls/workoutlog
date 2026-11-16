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

// ─── 기간(주/월) ─────────────────────────────────────────────
export type Period = 'week' | 'month';

export function startOfPeriod(ts: number, p: Period, weekStart: 0 | 1): number {
  if (p === 'week') return startOfWeek(ts, weekStart);
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function shiftPeriod(start: number, p: Period, n: number): number {
  if (p === 'week') return shiftWeek(start, n);
  const d = new Date(start);
  return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
}

/** 기간 안의 주 수 (진행 중인 기간은 오늘까지만). 월간 화면에서 "주 평균"을 낼 때 씀 */
export function weeksIn(start: number, p: Period, now = Date.now()): number {
  if (p === 'week') return 1;
  const end = Math.min(shiftPeriod(start, p, 1), now);
  return Math.max(1, (end - start) / (7 * 864e5));
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
  /** 기록에 체중이 없을 때 쓸 체중 */
  bwFallback: number | null = null,
  /** 기간 끝 (기본: 한 주) */
  endTs?: number,
): WeekStats {
  const end = endTs ?? shiftWeek(start, 1);
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

// ─── 기간별 추이 ─────────────────────────────────────────────
export interface WeekPoint {
  start: number;
  volumeKg: number;
  sets: number;
  workouts: number;
  durationMs: number;
}

/**
 * lastStart 기간을 마지막으로 하는 count개 기간의 합계 (오래된 → 최근).
 * muscle을 주면 그 부위 세트·볼륨만, 운동 횟수·시간은 그 부위를 한 운동만 셈.
 */
export function periodSeries(
  workouts: Workout[],
  period: Period,
  lastStart: number,
  count: number,
  weekStart: 0 | 1,
  ex: Map<string, Exercise>,
  variants: Map<string, Variant>,
  bwFallback: number | null = null,
  muscle: MuscleGroup | 'all' = 'all',
): WeekPoint[] {
  const pts: WeekPoint[] = Array.from({ length: count }, (_, i) => ({
    start: shiftPeriod(lastStart, period, i - count + 1),
    volumeKg: 0,
    sets: 0,
    workouts: 0,
    durationMs: 0,
  }));
  const index = new Map(pts.map((w, i) => [w.start, i]));
  for (const w of workouts) {
    const i = index.get(startOfPeriod(w.startedAt, period, weekStart));
    if (i === undefined) continue;
    const p = pts[i];
    const bw = workoutBw(w, bwFallback);
    let touched = false;
    for (const entry of w.exercises) {
      const x = ex.get(entry.exerciseId);
      if (x?.muscle === 'cardio') continue;
      if (muscle !== 'all' && (x?.muscle ?? 'other') !== muscle) continue;
      const v = entry.variantId ? variants.get(entry.variantId) : undefined;
      const unit = v?.unit || 'kg';
      const mode = loadMode(entry, x, v);
      for (const s of entry.sets) {
        if (!isWorkSet(s)) continue;
        touched = true;
        p.sets++;
        p.volumeKg += setVolumeKg(s, mode, unit, bw);
      }
    }
    if (muscle === 'all' || touched) {
      p.workouts++;
      p.durationMs += (w.endedAt ?? w.startedAt) - w.startedAt;
    }
  }
  return pts;
}

/** 예전 이름 (주간 고정) */
export function weeklySeries(
  workouts: Workout[],
  lastStart: number,
  count: number,
  weekStart: 0 | 1,
  ex: Map<string, Exercise>,
  variants: Map<string, Variant>,
  bwFallback: number | null = null,
): WeekPoint[] {
  return periodSeries(workouts, 'week', lastStart, count, weekStart, ex, variants, bwFallback);
}

/** 지난주(지난달) 대비 변화율 텍스트 */
export function deltaText(cur: number, prev: number, prevLabel = '지난주'): string {
  if (prev <= 0) return cur > 0 ? `${prevLabel} 기록 없음` : '–';
  const pct = Math.round(((cur - prev) / prev) * 100);
  const last = prevLabel.charCodeAt(prevLabel.length - 1);
  const hasJong = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  if (pct === 0) return `${prevLabel}${hasJong ? '과' : '와'} 같음`;
  return `${prevLabel} 대비 ${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%`;
}

export function fmtPeriod(start: number, p: Period): string {
  if (p === 'week') return fmtWeekRange(start);
  const d = new Date(start);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export function fmtWeekRange(start: number): string {
  const s = new Date(start);
  const e = new Date(shiftWeek(start, 1) - 1);
  const sm = s.getMonth() + 1;
  const em = e.getMonth() + 1;
  return sm === em ? `${sm}월 ${s.getDate()}일 – ${e.getDate()}일` : `${sm}월 ${s.getDate()}일 – ${em}월 ${e.getDate()}일`;
}

import type { Exercise, Grip, SetEntry, TrackType, Variant, WeightUnit, Workout, WorkoutExercise } from '../types';

const sameGrip = (a?: Grip | null, b?: Grip | null) => (a ?? null) === (b ?? null);

// workouts 배열은 항상 최신순(startedAt 내림차순)으로 유지된다고 가정합니다.

const LB = 0.45359237;

export function toKg(w: number, unit: WeightUnit): number | null {
  if (unit === 'kg') return w;
  if (unit === 'lb') return w * LB;
  return null; // '칸' 단위는 kg 로 환산할 수 없음
}

/** Epley 추정 1RM. 15회 초과는 신뢰도가 낮아 제외 */
export function e1rm(weight: number | null, reps: number | null): number | null {
  if (!weight || !reps || reps <= 0 || reps > 15) return null;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export const isWorkSet = (s: SetEntry) => s.done && s.kind !== 'warmup';

// ─── 볼륨 ────────────────────────────────────────────────────
/** 무게를 기구가 받쳐 주는(어시스트) 운동: 실제 부하 = 체중 − 보조 무게 */
export const ASSISTED = new Set(['assisted-pull-up', 'assisted-dip']);

/**
 * 한 운동 항목의 세트 볼륨 계산 방법
 *  - external: 무게 × 횟수 (일반)
 *  - bodyweight: (체중 + 추가 무게) × 횟수 — 풀업·딥스처럼 기구가 '맨몸'인 운동 (복근 운동은 몸 전체를 들지 않아 제외)
 *  - assisted: (체중 − 보조 무게) × 횟수 — 어시스트 풀업·딥스
 */
export type LoadMode = 'external' | 'bodyweight' | 'assisted';

export function loadMode(entry: WorkoutExercise, ex: Exercise | undefined, variant: Variant | undefined): LoadMode {
  if (ASSISTED.has(entry.exerciseId)) return 'assisted';
  if (variant?.equipment === 'bodyweight' && ex?.muscle !== 'core' && ex?.muscle !== 'cardio') return 'bodyweight';
  return 'external';
}

// ─── 한쪽 무게 (볼륨 ×2) ─────────────────────────────────────
/** 덤벨 1개를 두 손으로 드는 운동: 덤벨이어도 입력 무게가 전체 무게 */
const SINGLE_DUMBBELL = new Set(['overhead-triceps']);
/** 한쪽씩 양쪽을 다 하는 운동: 어떤 기구든 입력 무게는 한쪽 무게 */
const UNILATERAL = new Set(['dumbbell-row', 'one-arm-lateral-raise', 'one-arm-lat-pulldown']);

/** 기구를 따로 정하지 않았을 때의 기본값 */
export function defaultPerSide(exerciseId: string, equipment: Variant['equipment'] | undefined): boolean {
  if (UNILATERAL.has(exerciseId)) return true;
  return equipment === 'dumbbell' && !SINGLE_DUMBBELL.has(exerciseId);
}
export function isPerSide(exerciseId: string, v: Variant | undefined): boolean {
  return v?.perSide ?? defaultPerSide(exerciseId, v?.equipment);
}
/** 볼륨 계산 배수: 한쪽 무게로 적는 기구는 2 (예: 덤벨 5kg 레터럴 레이즈 10회 = 100kg) */
export const loadFactor = (exerciseId: string, v: Variant | undefined) => (isPerSide(exerciseId, v) ? 2 : 1);

/**
 * 세트 하나의 볼륨(kg). bw는 그날 체중 (없으면 맨몸·어시스트 운동은 0).
 * factor: 한쪽 무게로 적은 기구면 2 (맨몸·어시스트는 체중 기준이라 쓰지 않음)
 */
export function setVolumeKg(s: SetEntry, mode: LoadMode, unit: WeightUnit, bw: number | null, factor = 1): number {
  const reps = s.reps ?? 0;
  if (reps <= 0) return 0;
  const w = s.weight != null ? toKg(s.weight, unit) : 0;
  if (mode === 'bodyweight') return bw ? (bw + (w ?? 0)) * reps : 0;
  if (mode === 'assisted') return bw && w != null ? Math.max(0, bw - w) * reps : 0;
  return s.weight != null && w != null ? w * reps * factor : 0;
}

/** 가장 최근에 기록한 체중 (기록이 최신순이라 처음 나오는 값) */
export function latestBodyweight(workouts: Workout[]): number | null {
  for (const w of workouts) if (w.bodyweightKg) return w.bodyweightKg;
  return null;
}

/** 이 기록에 쓸 체중: 그날 입력한 체중 → 없으면 가장 최근에 입력한 체중 */
export const workoutBw = (w: Workout, fallback: number | null | undefined) => w.bodyweightKg ?? fallback ?? null;

// ─── "이전 기록" ─────────────────────────────────────────────
/** 같은 운동 + 같은 기구로 가장 최근에 한 기록. 기구가 다르면 무게감이 다르므로 섞지 않습니다. */
export function findPrevious(
  workouts: Workout[],
  exerciseId: string,
  variantId: string | null,
  grip?: Grip | null,
): { workout: Workout; entry: WorkoutExercise } | null {
  for (const w of workouts) {
    for (const entry of w.exercises) {
      if (entry.exerciseId === exerciseId && entry.variantId === variantId && sameGrip(entry.grip, grip) && entry.sets.some((s) => s.done)) {
        return { workout: w, entry };
      }
    }
  }
  return null;
}

/** 이 운동·기구로 마지막에 쓴 그립 (없으면 undefined = 기본) */
export function lastGrip(workouts: Workout[], exerciseId: string, variantId: string | null): Grip | undefined {
  for (const w of workouts)
    for (const e of w.exercises)
      if (e.exerciseId === exerciseId && e.variantId === variantId && e.sets.some((s) => s.done)) return e.grip;
  return undefined;
}

export function lastVariantAtGym(workouts: Workout[], exerciseId: string, gymId: string): string | null {
  for (const w of workouts) {
    if (w.gymId !== gymId) continue;
    const hit = w.exercises.find((x) => x.exerciseId === exerciseId && x.variantId);
    if (hit) return hit.variantId;
  }
  return null;
}

export function lastVariantAny(workouts: Workout[], exerciseId: string): string | null {
  for (const w of workouts) {
    const hit = w.exercises.find((x) => x.exerciseId === exerciseId && x.variantId);
    if (hit) return hit.variantId;
  }
  return null;
}

/**
 * 운동을 추가할 때 어떤 기구를 자동 선택할지.
 * 헬스장이 정해져 있으면 "그 헬스장에서 마지막으로 쓴 기구"를 최우선으로 합니다.
 * 확신이 없으면 null 을 돌려 사용자가 직접 고르게 해서, 다른 기구에 기록이 섞이지 않게 합니다.
 */
export function pickVariant(
  workouts: Workout[],
  variants: Variant[],
  exerciseId: string,
  gymId: string | null,
  fallbackVariantId: string | null = null,
): string | null {
  const list = variants.filter((v) => v.exerciseId === exerciseId && !v.archived);
  const alive = (id: string | null) => (id && list.some((v) => v.id === id) ? id : null);

  if (gymId) {
    const atGym = alive(lastVariantAtGym(workouts, exerciseId, gymId));
    if (atGym) return atGym;
  }
  const fb = list.find((v) => v.id === fallbackVariantId);
  if (fb && (!fb.gymId || !gymId || fb.gymId === gymId)) return fb.id;
  if (gymId) {
    const tagged = list.filter((v) => v.gymId === gymId);
    if (tagged.length === 1) return tagged[0].id;
  } else {
    const any = alive(lastVariantAny(workouts, exerciseId));
    if (any) return any;
  }
  return defaultVariantId(list);
}

/**
 * 기록이 전혀 없을 때의 기본 기구.
 * 기구가 하나뿐이거나 프리웨이트만 있으면(벤치 프레스 → 바벨) 첫 번째를,
 * 머신이 섞여 있으면(시티드 로우 등) null 을 돌려 사용자가 직접 고르게 합니다.
 */
export function defaultVariantId(list: Variant[]): string | null {
  if (list.length === 1) return list[0].id;
  if (list.length > 0 && !list.some((v) => v.equipment === 'machine')) return list[0].id;
  return null;
}

// ─── 기구별 기록 ─────────────────────────────────────────────
export interface Session {
  workoutId: string;
  date: number;
  sets: SetEntry[];
  maxWeight: number | null;
  bestE1rm: number | null;
  maxReps: number | null;
  maxTime: number | null;
  volume: number;
}

/** grip을 주면 그 그립 기록만 (null = 기본 그립), 생략하면 그립 상관없이 전부 */
export function variantSessions(workouts: Workout[], variantId: string, grip?: Grip | null, factor = 1): Session[] {
  const out: Session[] = [];
  for (const w of workouts) {
    const sets = w.exercises
      .filter((x) => x.variantId === variantId && (grip === undefined || sameGrip(x.grip, grip)))
      .flatMap((x) => x.sets.filter((s) => s.done));
    if (sets.length === 0) continue;
    out.push(summarize(w.id, w.startedAt, sets, factor));
  }
  return out;
}

function summarize(workoutId: string, date: number, sets: SetEntry[], factor = 1): Session {
  let maxWeight: number | null = null;
  let bestE1rm: number | null = null;
  let maxReps: number | null = null;
  let maxTime: number | null = null;
  let volume = 0;
  for (const s of sets) {
    if (s.kind === 'warmup') continue;
    if (s.weight != null && (s.reps ?? 0) > 0) maxWeight = Math.max(maxWeight ?? -Infinity, s.weight);
    const e = e1rm(s.weight, s.reps);
    if (e != null) bestE1rm = Math.max(bestE1rm ?? -Infinity, e);
    if (s.reps != null) maxReps = Math.max(maxReps ?? -Infinity, s.reps);
    if (s.time != null) maxTime = Math.max(maxTime ?? -Infinity, s.time);
    volume += (s.weight ?? 0) * (s.reps ?? 0) * factor;
  }
  return { workoutId, date, sets, maxWeight, bestE1rm, maxReps, maxTime, volume };
}

export interface VariantSummary {
  sessions: number;
  lastAt: number | null;
  maxWeight: number | null;
  bestE1rm: number | null;
  maxReps: number | null;
  maxTime: number | null;
  lastBest: SetEntry | null;
}

export function summarizeVariant(sessions: Session[], track: TrackType): VariantSummary {
  const pick = (k: 'maxWeight' | 'bestE1rm' | 'maxReps' | 'maxTime') =>
    sessions.reduce<number | null>((a, s) => (s[k] != null && (a == null || s[k]! > a) ? s[k] : a), null);
  return {
    sessions: sessions.length,
    lastAt: sessions[0]?.date ?? null,
    maxWeight: pick('maxWeight'),
    bestE1rm: pick('bestE1rm'),
    maxReps: pick('maxReps'),
    maxTime: pick('maxTime'),
    lastBest: sessions[0] ? topSet(sessions[0].sets, track) : null,
  };
}

/** 한 세션에서 가장 잘한 세트 */
export function topSet(sets: SetEntry[], track: TrackType): SetEntry | null {
  const work = sets.filter((s) => s.kind !== 'warmup');
  const pool = work.length ? work : sets;
  let best: SetEntry | null = null;
  const score = (s: SetEntry) => {
    if (track === 'time') return s.time ?? 0;
    if (track === 'reps') return s.reps ?? 0;
    return (s.weight ?? 0) * 1000 + (s.reps ?? 0);
  };
  for (const s of pool) if (!best || score(s) > score(best)) best = s;
  return best;
}

// ─── 신기록(PR) ──────────────────────────────────────────────
/** 이 운동 기록에서 기구별 이전 최고를 넘긴 세트 → 라벨 */
export function findPRs(workout: Workout, all: Workout[], tracks: Record<string, TrackType>): Map<string, string[]> {
  const prs = new Map<string, string[]>();
  const before = all.filter((w) => w.id !== workout.id && w.startedAt < workout.startedAt);
  const add = (id: string, label: string) => prs.set(id, [...(prs.get(id) ?? []), label]);

  for (const entry of workout.exercises) {
    if (!entry.variantId) continue;
    // 신기록은 같은 기구·같은 그립끼리만 비교
    const prior = variantSessions(before, entry.variantId, entry.grip ?? null);
    if (prior.length === 0) continue; // 첫 기록은 PR 로 치지 않음
    const p = summarizeVariant(prior, tracks[entry.exerciseId] ?? 'weight');
    const work = entry.sets.filter(isWorkSet);
    const track = tracks[entry.exerciseId] ?? 'weight';
    const best = <T,>(f: (s: SetEntry) => T | null) =>
      work.reduce<SetEntry | null>((a, s) => {
        const v = f(s);
        if (v == null) return a;
        return !a || (v as number) > (f(a) as number) ? s : a;
      }, null);

    if (track === 'weight' && ASSISTED.has(entry.exerciseId)) {
      // 어시스트 운동은 보조 무게가 낮을수록 잘한 것: 이전보다 적은 보조로 해낸 세트
      const lifted = (s: SetEntry) => s.kind !== 'warmup' && (s.reps ?? 0) > 0 && s.weight != null;
      const priorMin = prior.flatMap((x) => x.sets.filter(lifted)).reduce<number | null>((a, s) => (a == null || s.weight! < a ? s.weight! : a), null);
      const low = work.filter(lifted).reduce<SetEntry | null>((a, s) => (!a || s.weight! < a.weight! ? s : a), null);
      if (low && priorMin != null && low.weight! < priorMin) add(low.id, '최소 보조');
    } else if (track === 'weight') {
      const w = best((s) => ((s.reps ?? 0) > 0 ? s.weight : null));
      if (w && p.maxWeight != null && w.weight! > p.maxWeight) add(w.id, '최고 무게');
      const e = best((s) => e1rm(s.weight, s.reps));
      if (e && p.bestE1rm != null && e1rm(e.weight, e.reps)! > p.bestE1rm + 0.01) add(e.id, '추정 1RM');
    } else if (track === 'reps') {
      const r = best((s) => s.reps);
      if (r && p.maxReps != null && r.reps! > p.maxReps) add(r.id, '최다 횟수');
    } else {
      const t = best((s) => s.time);
      if (t && p.maxTime != null && t.time! > p.maxTime) add(t.id, '최장 시간');
    }
  }
  return prs;
}

// ─── 운동 요약 ───────────────────────────────────────────────
export function workoutVolumeKg(
  w: Workout,
  variants: Map<string, Variant>,
  ex?: Map<string, Exercise>,
  bwFallback?: number | null,
): number {
  const bw = workoutBw(w, bwFallback);
  let total = 0;
  for (const entry of w.exercises) {
    const v = entry.variantId ? variants.get(entry.variantId) : undefined;
    const mode = loadMode(entry, ex?.get(entry.exerciseId), v);
    const unit = v?.unit || 'kg';
    const f = loadFactor(entry.exerciseId, v);
    for (const s of entry.sets) if (isWorkSet(s)) total += setVolumeKg(s, mode, unit, bw, f);
  }
  return total;
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0);
}

export function fmtVolume(kg: number): string {
  if (kg >= 10000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg).toLocaleString('ko-KR')}kg`;
}

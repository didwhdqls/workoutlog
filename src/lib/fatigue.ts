import { SUBS_BY_GROUP, isSub, subMuscleOf, type SubMuscle } from '../data/muscles';
import type { Exercise, Workout } from '../types';
import { isWorkSet } from './stats';

/**
 * 부위별 피로도(회복 상태) 추정.
 * - 운동 하나의 세트는 주 타깃 부위에 1, 함께 쓰이는 보조 부위에 0.5 만큼 피로를 쌓습니다.
 * - 쌓인 피로는 부위마다 정해진 회복 시간(큰 근육 72시간, 작은 근육 48시간)에 걸쳐 일정하게 줄어듭니다.
 * 근거가 정밀한 모델은 아니고, "어디를 최근에 얼마나 썼나"를 한눈에 보기 위한 어림값입니다.
 */

/** 다 회복되기까지 걸리는 시간(시간) */
export const RECOVERY_HOURS: Record<SubMuscle, number> = {
  chest: 72,
  'upper-chest': 72,
  lats: 72,
  'mid-back': 72,
  'lower-back': 72,
  quads: 72,
  hamstrings: 72,
  glutes: 72,
  traps: 60,
  'front-delt': 60,
  adductors: 60,
  'side-delt': 48,
  'rear-delt': 48,
  biceps: 48,
  triceps: 48,
  forearms: 48,
  calves: 48,
  abs: 48,
};

/** 다관절 운동의 보조 부위 (세트당 0.5) */
export const SECONDARY: Record<string, SubMuscle[]> = {
  'seated-row': ['lats', 'biceps', 'rear-delt'],
  'long-pull': ['lats', 'biceps', 'rear-delt'],
  'lat-pulldown': ['biceps', 'mid-back'],
  'one-arm-lat-pulldown': ['biceps', 'mid-back'],
  'high-row': ['mid-back', 'biceps'],
  'low-row': ['mid-back', 'biceps'],
  't-bar-row': ['lats', 'biceps', 'rear-delt', 'lower-back'],
  'machine-t-bar-row': ['lats', 'biceps', 'rear-delt'],
  'barbell-row': ['lats', 'biceps', 'rear-delt', 'lower-back'],
  'dumbbell-row': ['mid-back', 'biceps'],
  'pull-up': ['biceps', 'mid-back'],
  'assisted-pull-up': ['biceps', 'mid-back'],
  deadlift: ['hamstrings', 'glutes', 'traps', 'forearms'],
  'back-extension': ['glutes', 'hamstrings'],
  pullover: ['chest'],

  'bench-press': ['triceps', 'front-delt'],
  'incline-bench-press': ['triceps', 'front-delt'],
  'chest-press': ['triceps', 'front-delt'],
  'incline-chest-press': ['triceps', 'front-delt'],
  dips: ['triceps', 'front-delt'],
  'assisted-dip': ['triceps', 'front-delt'],
  'dip-machine': ['triceps', 'front-delt'],
  'pec-fly': ['front-delt'],
  'cable-crossover': ['front-delt'],
  'dumbbell-fly': ['front-delt'],

  'overhead-press': ['triceps', 'side-delt', 'upper-chest'],
  'shoulder-press': ['triceps', 'side-delt'],
  'face-pull': ['mid-back', 'traps'],
  'rear-delt-fly': ['mid-back'],
  shrug: ['forearms'],

  squat: ['glutes', 'adductors', 'lower-back'],
  'leg-press': ['glutes', 'adductors'],
  'hack-squat': ['glutes', 'adductors'],
  'pendulum-squat': ['glutes', 'adductors'],
  'romanian-deadlift': ['glutes', 'lower-back'],
  lunge: ['glutes', 'adductors'],
  'bulgarian-split-squat': ['glutes', 'adductors'],
  'hip-thrust': ['hamstrings'],

  'barbell-curl': ['forearms'],
  'hammer-curl': ['forearms'],
  'preacher-curl': ['forearms'],
};

/** 보조 부위: 사용자가 정한 값 → 기본 운동의 내장 값 */
export function secondaryOf(x: Exercise): SubMuscle[] {
  return x.secondary ? x.secondary.filter(isSub) : (SECONDARY[x.id] ?? []);
}

/** 운동 하나가 세트당 각 부위에 주는 피로 비중 */
export function exerciseLoad(x: Exercise | undefined): Map<SubMuscle, number> {
  const out = new Map<SubMuscle, number>();
  if (!x || x.muscle === 'cardio' || x.muscle === 'other') return out;
  const main = subMuscleOf(x);
  if (main) out.set(main, 1);
  else for (const s of SUBS_BY_GROUP[x.muscle]) out.set(s, 0.5); // 세부 부위를 모르면 그 그룹 전체에 조금씩
  for (const s of secondaryOf(x)) if (!out.has(s)) out.set(s, 0.5);
  return out;
}

export type FatigueLevel = 0 | 1 | 2 | 3;
export const LEVEL_LABEL: Record<FatigueLevel, string> = { 0: '회복됨', 1: '조금 피로', 2: '피로', 3: '많이 피로' };

/** 피로 점수 → 단계. 점수는 대략 '아직 남아 있는 유효 세트 수' */
export const levelOf = (score: number): FatigueLevel => (score < 0.5 ? 0 : score < 3 ? 1 : score < 6 ? 2 : 3);

export interface MuscleFatigue {
  score: number;
  level: FatigueLevel;
  /** 회복됨(점수 0.5 미만)까지 남은 시간(시간). 이미 회복됐으면 0 */
  hoursLeft: number;
}

interface Hit {
  at: number;
  sub: SubMuscle;
  amount: number;
}

function collectHits(workouts: Workout[], ex: Map<string, Exercise>, at: number): Hit[] {
  const hits: Hit[] = [];
  const oldest = at - 80 * 3600_000; // 가장 긴 회복 시간보다 오래된 기록은 볼 필요 없음
  for (const w of workouts) {
    const t = w.endedAt ?? w.startedAt;
    if (t > at || t < oldest) continue;
    for (const e of w.exercises) {
      const n = e.sets.filter(isWorkSet).length;
      if (!n) continue;
      for (const [sub, k] of exerciseLoad(ex.get(e.exerciseId))) hits.push({ at: t, sub, amount: n * k });
    }
  }
  return hits;
}

function scoreAt(hits: Hit[], sub: SubMuscle, at: number): number {
  const R = RECOVERY_HOURS[sub] * 3600_000;
  let s = 0;
  for (const h of hits) if (h.sub === sub && h.at <= at) s += h.amount * Math.max(0, 1 - (at - h.at) / R);
  return s;
}

/** at 시각의 부위별 피로도 */
export function fatigueAt(workouts: Workout[], ex: Map<string, Exercise>, at = Date.now()): Map<SubMuscle, MuscleFatigue> {
  const hits = collectHits(workouts, ex, at);
  const out = new Map<SubMuscle, MuscleFatigue>();
  for (const sub of Object.keys(RECOVERY_HOURS) as SubMuscle[]) {
    const score = scoreAt(hits, sub, at);
    let hoursLeft = 0;
    if (score >= 0.5) {
      // 한 시간씩 넘겨 보며 회복 시점 찾기 (최대 회복 시간까지)
      for (let h = 1; h <= RECOVERY_HOURS[sub]; h++) {
        hoursLeft = h;
        if (scoreAt(hits, sub, at + h * 3600_000) < 0.5) break;
      }
    }
    out.set(sub, { score, level: levelOf(score), hoursLeft });
  }
  return out;
}

/** "약 30시간" / "약 2일" */
export function fmtHoursLeft(h: number): string {
  if (h <= 0) return '회복됨';
  if (h < 24) return `약 ${h}시간 뒤 회복`;
  const d = Math.round(h / 12) / 2; // 반나절 단위
  return `약 ${d % 1 ? d.toFixed(1) : d}일 뒤 회복`;
}

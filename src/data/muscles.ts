import type { Exercise, MuscleGroup } from '../types';

/** 세부 부위. 통계에서 "팔 18세트 → 이두 10 · 삼두 8" 처럼 나눠 보여 줄 때 씁니다. */
export type SubMuscle =
  | 'chest'
  | 'upper-chest'
  | 'lats'
  | 'mid-back'
  | 'lower-back'
  | 'front-delt'
  | 'side-delt'
  | 'rear-delt'
  | 'traps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'adductors'
  | 'calves'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs';

export const SUB_LABEL: Record<SubMuscle, string> = {
  chest: '가슴',
  'upper-chest': '윗가슴',
  lats: '광배',
  'mid-back': '중부 등',
  'lower-back': '척추기립근',
  'front-delt': '전면 삼각',
  'side-delt': '측면 삼각',
  'rear-delt': '후면 삼각',
  traps: '승모',
  quads: '대퇴사두',
  hamstrings: '햄스트링',
  glutes: '둔근',
  adductors: '내전근',
  calves: '종아리',
  biceps: '이두',
  triceps: '삼두',
  forearms: '전완',
  abs: '복근',
};

export const SUBS_BY_GROUP: Record<MuscleGroup, SubMuscle[]> = {
  chest: ['chest', 'upper-chest'],
  back: ['lats', 'mid-back', 'lower-back'],
  shoulders: ['front-delt', 'side-delt', 'rear-delt', 'traps'],
  legs: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'],
  arms: ['biceps', 'triceps', 'forearms'],
  core: ['abs'],
  cardio: [],
  other: [],
};

/** 기본 운동의 주 타깃 부위 (정적 데이터라 기존 사용자에게도 바로 적용) */
const SEED_SUB: Record<string, SubMuscle> = {
  'seated-row': 'mid-back',
  'lat-pulldown': 'lats',
  'one-arm-lat-pulldown': 'lats',
  'high-row': 'lats',
  'low-row': 'lats',
  't-bar-row': 'mid-back',
  'machine-t-bar-row': 'mid-back',
  'barbell-row': 'mid-back',
  'dumbbell-row': 'lats',
  'pull-up': 'lats',
  'assisted-pull-up': 'lats',
  deadlift: 'lower-back',
  'back-extension': 'lower-back',
  'straight-arm-pulldown': 'lats',
  pullover: 'lats',

  'bench-press': 'chest',
  'incline-bench-press': 'upper-chest',
  'chest-press': 'chest',
  'incline-chest-press': 'upper-chest',
  'pec-fly': 'chest',
  'cable-crossover': 'chest',
  'dumbbell-fly': 'chest',
  dips: 'chest',
  'assisted-dip': 'chest',
  'dip-machine': 'chest',

  'overhead-press': 'front-delt',
  'shoulder-press': 'front-delt',
  'lateral-raise': 'side-delt',
  'one-arm-lateral-raise': 'side-delt',
  'rear-delt-fly': 'rear-delt',
  'face-pull': 'rear-delt',
  shrug: 'traps',

  squat: 'quads',
  'leg-press': 'quads',
  'hack-squat': 'quads',
  'pendulum-squat': 'quads',
  'leg-extension': 'quads',
  'lying-leg-curl': 'hamstrings',
  'seated-leg-curl': 'hamstrings',
  'romanian-deadlift': 'hamstrings',
  lunge: 'quads',
  'bulgarian-split-squat': 'quads',
  'hip-thrust': 'glutes',
  'hip-adduction': 'adductors',
  'hip-abduction': 'glutes',
  'calf-raise': 'calves',
  'glute-kickback': 'glutes',

  'barbell-curl': 'biceps',
  'dumbbell-curl': 'biceps',
  'hammer-curl': 'biceps',
  'cable-curl': 'biceps',
  'preacher-curl': 'biceps',
  'triceps-pushdown': 'triceps',
  'overhead-triceps': 'triceps',
  'skull-crusher': 'triceps',
  'triceps-machine': 'triceps',

  crunch: 'abs',
  'cable-crunch': 'abs',
  'ab-crunch-machine': 'abs',
  'hanging-leg-raise': 'abs',
  plank: 'abs',
};

/** 운동의 세부 부위: 사용자가 정한 값 → 기본값. 부위 그룹과 맞지 않으면 무시 */
export function subMuscleOf(x: Exercise | undefined): SubMuscle | null {
  if (!x) return null;
  const sub = (x.sub as SubMuscle | undefined) ?? SEED_SUB[x.id];
  return sub && SUBS_BY_GROUP[x.muscle].includes(sub) ? sub : null;
}

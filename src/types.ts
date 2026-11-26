// ─── 운동(동작) ──────────────────────────────────────────────
// "시티드 로우" 같은 동작 자체. 실제 기록은 아래 Variant(기구) 단위로 쌓입니다.
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core' | 'cardio' | 'other';

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: '가슴',
  back: '등',
  shoulders: '어깨',
  legs: '하체',
  arms: '팔',
  core: '복근',
  cardio: '유산소',
  other: '기타',
};
export const MUSCLE_ORDER: MuscleGroup[] = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'cardio', 'other'];

/** weight: 무게×횟수, reps: 횟수만(맨몸), time: 시간(초) */
export type TrackType = 'weight' | 'reps' | 'time';

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  track: TrackType;
  /** 사용자가 추가한 검색용 다른 이름 (쉼표로 구분, 예: "Low Row, 로우머신") */
  aliases?: string;
  /** 세부 부위 (예: 'biceps'). 비우면 기본 운동은 내장 값, 직접 만든 운동은 부위 그룹만 집계 */
  sub?: string;
  /** 함께 쓰이는 보조 부위 (세부 부위 id 목록). 비우면 기본 운동은 내장 값. 근육 피로도에 절반만큼 반영 */
  secondary?: string[];
  custom?: boolean;
  archived?: boolean;
}

// ─── 기구(변형) ──────────────────────────────────────────────
// 같은 "시티드 로우"라도 해머스트렝스 플레이트 / 라이프피트니스 핀 머신 / 케이블은
// 무게감이 다르므로 각각 별도의 Variant 로 기록합니다.
export type Equipment =
  | 'machine'
  | 'cable'
  | 'barbell'
  | 'dumbbell'
  | 'smith'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  machine: '머신',
  cable: '케이블',
  barbell: '바벨',
  dumbbell: '덤벨',
  smith: '스미스 머신',
  bodyweight: '맨몸',
  kettlebell: '케틀벨',
  band: '밴드',
  other: '기타',
};
export const EQUIPMENT_ORDER: Equipment[] = [
  'machine',
  'cable',
  'barbell',
  'dumbbell',
  'smith',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
];

/** plate: 원판을 끼우는 머신, stack: 핀을 꽂는 웨이트 스택 머신 */
export type Loading = 'plate' | 'stack';
export const LOADING_LABEL: Record<Loading, string> = { plate: '플레이트', stack: '핀' };

/** level: 무게 표기가 없거나 믿기 어려운 핀 머신을 "몇 번째 칸"으로 기록 */
export type WeightUnit = 'kg' | 'lb' | 'level';
export const UNIT_LABEL: Record<WeightUnit, string> = { kg: 'kg', lb: 'lb', level: '칸' };

export interface Variant {
  id: string;
  exerciseId: string;
  equipment: Equipment;
  brand?: string;
  loading?: Loading;
  /** 모델/라인명 (예: ISO-래터럴 로우, Insignia) */
  model?: string;
  /** 이름을 직접 정하고 싶을 때 */
  label?: string;
  /** 특정 헬스장에만 있는 기구라면 지정 */
  gymId?: string | null;
  unit: WeightUnit;
  /** 세팅 메모: 시트 높이, 패드 위치 등 */
  memo?: string;
  /**
   * 입력하는 무게가 한쪽 무게인지 (true면 볼륨 ×2).
   * 비워 두면 기본값: 덤벨은 한쪽(덤벨 1개) 무게, 원암 운동은 한쪽씩 양쪽 다 하므로 한쪽 무게.
   */
  perSide?: boolean;
  custom?: boolean;
  archived?: boolean;
}

export interface Gym {
  id: string;
  name: string;
}

// ─── 그립 ────────────────────────────────────────────────────
/** 같은 기구라도 그립에 따라 무게가 달라서 기록(이전 기록·신기록)을 그립별로 나눕니다. 없으면 기본 그립 */
export type Grip = 'neutral' | 'pronated' | 'supinated' | 'wide' | 'close' | 'rope' | 'vbar';
export const GRIP_ORDER: Grip[] = ['neutral', 'pronated', 'supinated', 'wide', 'close', 'rope', 'vbar'];
export const GRIP_LABEL: Record<Grip, string> = {
  neutral: '뉴트럴 그립',
  pronated: '오버핸드 그립',
  supinated: '언더핸드 그립',
  wide: '와이드 그립',
  close: '클로즈 그립',
  rope: '로프',
  vbar: 'V바',
};

// ─── 기록 ────────────────────────────────────────────────────
export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure';

export interface SetEntry {
  id: string;
  weight: number | null;
  reps: number | null;
  /** 초 단위 (track === 'time') */
  time: number | null;
  done: boolean;
  kind: SetKind;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  variantId: string | null;
  /** 없으면 기본 그립 */
  grip?: Grip;
  sets: SetEntry[];
  restSec: number;
  note?: string;
}

export interface Workout {
  id: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  gymId: string | null;
  routineId: string | null;
  exercises: WorkoutExercise[];
  /** 운동 전체 메모 */
  note?: string;
  /** 그날 체중(kg). 운동 중에 입력 (시작할 때 지난번 체중이 미리 채워짐). 맨몸 운동 볼륨 계산용 */
  bodyweightKg?: number;
  /** 운동 후 돌아보기 (모두 선택 입력) */
  review?: WorkoutReview;
}

/** 1–5 점. 없으면 체크 안 함 */
export type Score = 1 | 2 | 3 | 4 | 5;
export interface WorkoutReview {
  condition?: Score;
  focus?: Score;
  fatigue?: Score;
  pump?: Score;
  satisfaction?: Score;
  tags?: string[];
}

// ─── 루틴(계획) ──────────────────────────────────────────────
export interface PlannedSet {
  weight: number | null;
  reps: number | null;
  time: number | null;
}

export interface RoutineItem {
  id: string;
  exerciseId: string;
  /** 기본 기구. 운동 시작 시 헬스장별 마지막 사용 기구가 있으면 그쪽을 우선합니다. */
  variantId: string | null;
  /** 없으면 지난번 그립을 그대로 */
  grip?: Grip;
  sets: PlannedSet[];
  restSec: number;
}

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
  createdAt: number;
  lastUsedAt?: number;
}

export interface Settings {
  defaultRestSec: number;
  sound: boolean;
  vibrate: boolean;
  lastGymId: string | null;
  /** 주 시작 요일: 1 = 월요일, 0 = 일요일 */
  weekStart: 0 | 1;
}

export interface RestTimer {
  endAt: number;
  total: number;
  label: string;
}

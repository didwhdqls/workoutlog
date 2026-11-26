import type { Equipment, Exercise, Loading, MuscleGroup, TrackType, Variant } from '../types';

/**
 * 기본 운동 카탈로그.
 * 핵심 아이디어: 동작(Exercise) 하나에 기구(Variant)가 여러 개 달려 있고,
 * 기록·이전 무게·최고 기록은 전부 기구 단위로 따로 쌓입니다.
 *
 * id 는 한 번 배포되면 바꾸지 마세요. 기존 사용자 기록이 이 id 를 참조합니다.
 * 새 운동/기구를 추가했다면 SEED_VERSION 을 올리세요. 다음 실행 때 기존 데이터에 자동으로 합쳐집니다.
 */

/** 브랜드 목록. 순서대로 기구 등록 화면의 브랜드 칩에 나옵니다 (자주 보이는 순). */
export const BRANDS = {
  hammer: '해머스트렝스',
  lf: '라이프피트니스',
  tg: '테크노짐',
  cybex: '싸이벡스',
  matrix: '매트릭스',
  prime: '프라임',
  atlantis: '아틀란티스',
  panatta: '파나타',
  gym80: '짐80',
  arsenal: '아스널',
  watson: '왓슨',
  newtech: '뉴텍',
  drax: '드랙스',
  precor: '프리코어',
  hoist: '호이스트',
  nautilus: '노틸러스',
  gymleco: '짐레코',
  startrac: '스타트랙',
  impulse: '임펄스',
  bootybuilder: '부티빌더',
  freemotion: '프리모션',
  sportsart: '스포츠아트',
  bodysolid: '바디솔리드',
  // v6 브랜드 추가 (기구 등록·바로 등록에서 고를 수 있음)
  dhz: '디에이치지',
  shua: '슈아',
  steelflex: '스틸플렉스',
  keiser: '카이저',
  rogue: '로그',
  eleiko: '엘레이코',
  pulse: '펄스',
  bodytone: '바디톤',
  primal: '프라이멀',
  tuffstuff: '터프스터프',
  legend: '레전드',
  muscled: '머슬디',
  flex: '플렉스피트니스',
  nebula: '네뷸라',
  schnell: '슈넬',
  bh: 'BH 피트니스',
  jordan: '조던',
  origin: '오리진',
  exigo: '엑시고',
  gymgear: '짐기어',
  concept2: '컨셉2',
  megamass: '메가매스',
  // 지금은 이름이 바뀌었거나 없어진 브랜드. 오래된 헬스장에 기구가 남아 있음 (aliases.ts의 LEGACY_BRANDS 참고)
  strive: '스트라이브',
  icarian: '이카리안',
  trotter: '트로터',
  eagle: '이글',
  universal: '유니버셜',
  bodymasters: '바디마스터스',
  polaris: '폴라리스',
} as const;
type BrandKey = keyof typeof BRANDS;

interface VSpec {
  key: string;
  equipment: Equipment;
  brand?: string;
  loading?: Loading;
  model?: string;
  /** id를 유지하려고 남겨 두지만 목록에는 숨기는 기구 */
  hidden?: boolean;
}

/** 브랜드 머신 */
const m = (brand: BrandKey, loading: Loading, model?: string, suffix = ''): VSpec => ({
  key: `m-${brand}-${loading}${suffix}`,
  equipment: 'machine',
  brand: BRANDS[brand],
  loading,
  model,
});
/** 브랜드 없는 일반 머신 */
const g = (loading: Loading, model?: string, suffix = ''): VSpec => ({
  key: `m-generic-${loading}${suffix}`,
  equipment: 'machine',
  loading,
  model,
});
/** 프리웨이트·케이블 등 */
const e = (equipment: Equipment, model?: string, suffix = ''): VSpec => ({
  key: `${equipment}${suffix}`,
  equipment,
  model,
});
/** 브랜드 케이블 기구 (예: 롱 풀 스테이션) */
const cb = (brand: BrandKey, model?: string): VSpec => ({ key: `cable-${brand}`, equipment: 'cable', brand: BRANDS[brand], model });
/** 여러 브랜드를 같은 방식으로 */
const many = (loading: Loading, brands: BrandKey[]) => brands.map((b) => m(b, loading));
/** T바 로우 일반 플레이트 머신의 모델명 (SPEC보다 먼저 선언해야 함) */
export const T_BAR_STAND = '스탠딩 거치대';
/** 다른 운동으로 옮긴 기구: id는 남기고 숨김 */
const hide = (v: VSpec): VSpec => ({ ...v, hidden: true });

// v1 부터 있던 핀 머신 브랜드 (순서 유지) + v2 에서 추가한 브랜드
const STACK_BRANDS: BrandKey[] = ['lf', 'tg', 'cybex', 'matrix', 'panatta', 'newtech', 'prime', 'atlantis', 'hoist', 'precor'];
const stackAll = (...extra: VSpec[]) => [...STACK_BRANDS.map((b) => m(b, 'stack')), ...extra];

interface ExSpec {
  id: string;
  name: string;
  muscle: MuscleGroup;
  track?: TrackType;
  v: VSpec[];
}

// 각 목록은 v1 항목을 앞에 그대로 두고, 새 브랜드는 뒤에 덧붙였습니다.
const SPEC: ExSpec[] = [
  // ── 등 ──
  {
    id: 'seated-row',
    name: '시티드 로우',
    muscle: 'back',
    v: [
      e('cable'),
      m('hammer', 'plate', 'ISO-래터럴 로우'),
      m('lf', 'stack'),
      m('tg', 'stack'),
      m('cybex', 'stack'),
      m('matrix', 'stack'),
      m('panatta', 'plate'),
      m('newtech', 'stack'),
      m('drax', 'stack'),
      // v2
      m('prime', 'plate'),
      m('prime', 'stack'),
      m('atlantis', 'stack'),
      m('watson', 'plate'),
      m('gymleco', 'plate'),
      m('hoist', 'stack'),
      m('precor', 'stack'),
    ],
  },
  // v14: 한 팔씩 당기는 시티드 로우 (케이블 싱글 핸들, 양팔이 따로 움직이는 플레이트 머신). 한쪽 무게 기준, 볼륨 ×2
  {
    id: 'one-arm-seated-row',
    name: '원암 시티드 로우',
    muscle: 'back',
    v: [
      e('cable'),
      m('hammer', 'plate', 'ISO-래터럴 로우'),
      m('panatta', 'plate'),
      m('prime', 'plate'),
      ...many('plate', ['watson', 'gymleco']),
      g('plate'),
      g('stack'),
    ],
  },
  // v9: 앉아서 발판에 발을 대고 케이블을 몸쪽으로 당기는 롱 풀 스테이션 (시티드 케이블 로우)
  {
    id: 'long-pull',
    name: '롱 풀',
    muscle: 'back',
    v: [
      e('cable'),
      ...(['lf', 'tg', 'matrix', 'precor', 'cybex', 'hoist', 'atlantis', 'prime'] as BrandKey[]).map((b) => cb(b)),
    ],
  },
  {
    id: 'lat-pulldown',
    name: '랫 풀다운',
    muscle: 'back',
    v: [
      e('cable'),
      m('hammer', 'plate', 'ISO-래터럴 프론트 풀다운'),
      m('lf', 'stack'),
      m('tg', 'stack'),
      m('cybex', 'stack'),
      m('matrix', 'stack'),
      m('panatta', 'stack'),
      m('newtech', 'stack'),
      // v2
      m('prime', 'plate'),
      m('prime', 'stack'),
      m('atlantis', 'stack'),
      m('hoist', 'stack'),
      m('precor', 'stack'),
    ],
  },
  // v8: 한 팔씩 당기는 풀다운. 케이블 싱글 핸들이 가장 흔하고, 양팔이 따로 움직이는 플레이트 머신으로도 함
  {
    id: 'one-arm-lat-pulldown',
    name: '원암 랫 풀다운',
    muscle: 'back',
    v: [e('cable'), m('hammer', 'plate', 'ISO-래터럴 프론트 풀다운'), m('prime', 'plate'), g('stack')],
  },
  {
    id: 'high-row',
    name: '하이 로우',
    muscle: 'back',
    v: [
      m('hammer', 'plate', 'ISO-래터럴 하이 로우'),
      m('panatta', 'plate'),
      m('arsenal', 'plate'),
      m('gym80', 'plate'),
      ...many('plate', ['prime', 'atlantis', 'watson', 'gymleco']),
    ],
  },
  // v13: 양팔이 따로 움직이는 하이 로우 머신을 한 팔씩 하는 경우. 한쪽 무게(한쪽에 끼운 원판) 기준, 볼륨 ×2
  {
    id: 'one-arm-high-row',
    name: '원암 하이 로우',
    muscle: 'back',
    v: [
      m('hammer', 'plate', 'ISO-래터럴 하이 로우'),
      m('panatta', 'plate'),
      m('arsenal', 'plate'),
      m('gym80', 'plate'),
      ...many('plate', ['prime', 'atlantis', 'watson', 'gymleco']),
      e('cable'),
    ],
  },
  // v3
  {
    id: 'low-row',
    name: '로우 로우',
    muscle: 'back',
    v: [
      m('hammer', 'plate', 'ISO-래터럴 로우 로우'),
      m('panatta', 'plate'),
      m('arsenal', 'plate'),
      m('gym80', 'plate'),
      m('tg', 'plate'),
      ...many('plate', ['prime', 'atlantis']),
      g('plate'),
    ],
  },
  {
    // 서서 하는 일반 T바 로우. 가슴 패드에 엎드려 하는 머신은 v4부터 '체스트 서포티드 T바 로우'로 분리
    id: 't-bar-row',
    name: 'T바 로우',
    muscle: 'back',
    v: [
      g('plate', T_BAR_STAND),
      hide(m('hammer', 'plate')),
      e('barbell', '랜드마인'),
      ...many('plate', ['prime', 'atlantis']).map(hide),
    ],
  },
  // v4
  {
    id: 'machine-t-bar-row',
    name: '체스트 서포티드 T바 로우',
    muscle: 'back',
    v: [
      m('hammer', 'plate'),
      m('panatta', 'plate'),
      m('arsenal', 'plate'),
      m('gym80', 'plate'),
      ...many('plate', ['prime', 'atlantis']),
      g('plate'),
    ],
  },
  { id: 'barbell-row', name: '바벨 로우', muscle: 'back', v: [e('barbell'), e('smith')] },
  { id: 'dumbbell-row', name: '원암 덤벨 로우', muscle: 'back', v: [e('dumbbell')] },
  { id: 'pull-up', name: '풀업', muscle: 'back', track: 'reps', v: [e('bodyweight')] },
  {
    id: 'assisted-pull-up',
    name: '어시스트 풀업',
    muscle: 'back',
    v: [m('lf', 'stack'), m('tg', 'stack'), m('matrix', 'stack'), m('cybex', 'stack'), ...many('stack', ['precor', 'hoist', 'atlantis'])],
  },
  { id: 'deadlift', name: '데드리프트', muscle: 'back', v: [e('barbell'), e('barbell', '트랩바', '-trap')] },
  { id: 'back-extension', name: '백 익스텐션', muscle: 'back', v: [e('other', '45도 로만체어'), m('lf', 'stack'), m('tg', 'stack')] },
  { id: 'straight-arm-pulldown', name: '스트레이트 암 풀다운', muscle: 'back', v: [e('cable')] },
  { id: 'pullover', name: '풀오버 머신', muscle: 'back', v: [m('nautilus', 'stack'), m('panatta', 'stack'), m('gym80', 'plate')] },

  // ── 가슴 ──
  // v12: 누워서 하는 벤치 프레스 머신 (앉아서 미는 체스트 프레스와 다른 기구)
  {
    id: 'bench-press',
    name: '벤치 프레스',
    muscle: 'chest',
    v: [
      e('barbell'),
      e('dumbbell'),
      e('smith'),
      m('hammer', 'plate', 'ISO-래터럴 벤치 프레스'),
      m('panatta', 'plate'),
      m('gym80', 'plate'),
      m('arsenal', 'plate'),
      m('atlantis', 'plate'),
      m('prime', 'plate'),
      m('tg', 'stack'),
      m('lf', 'stack'),
      g('plate'),
      g('stack'),
    ],
  },
  {
    id: 'incline-bench-press',
    name: '인클라인 벤치 프레스',
    muscle: 'chest',
    v: [
      e('barbell'),
      e('dumbbell'),
      e('smith'),
      m('hammer', 'plate', 'ISO-래터럴 인클라인 벤치 프레스'),
      m('panatta', 'plate'),
      m('gym80', 'plate'),
      m('arsenal', 'plate'),
      m('atlantis', 'plate'),
      m('prime', 'plate'),
      m('tg', 'stack'),
      m('lf', 'stack'),
      g('plate'),
      g('stack'),
    ],
  },
  {
    id: 'chest-press',
    name: '체스트 프레스',
    muscle: 'chest',
    v: [
      m('hammer', 'plate'),
      m('lf', 'stack'),
      m('tg', 'stack'),
      m('cybex', 'stack'),
      m('matrix', 'stack'),
      m('panatta', 'plate'),
      m('newtech', 'stack'),
      m('drax', 'stack'),
      // v2
      m('prime', 'plate'),
      m('prime', 'stack'),
      m('atlantis', 'stack'),
      m('watson', 'plate'),
      m('gymleco', 'plate'),
      m('hoist', 'stack'),
      m('precor', 'stack'),
    ],
  },
  {
    id: 'incline-chest-press',
    name: '인클라인 체스트 프레스',
    muscle: 'chest',
    v: [
      m('hammer', 'plate'),
      m('panatta', 'plate'),
      m('arsenal', 'plate'),
      m('lf', 'stack'),
      m('tg', 'stack'),
      ...many('plate', ['prime', 'atlantis', 'watson', 'gymleco', 'gym80']),
    ],
  },
  { id: 'pec-fly', name: '펙덱 플라이', muscle: 'chest', v: stackAll() },
  { id: 'cable-crossover', name: '케이블 크로스오버', muscle: 'chest', v: [e('cable')] },
  { id: 'dumbbell-fly', name: '덤벨 플라이', muscle: 'chest', v: [e('dumbbell')] },
  { id: 'dips', name: '딥스', muscle: 'chest', track: 'reps', v: [e('bodyweight')] },
  {
    id: 'dip-machine',
    name: '딥스 머신',
    muscle: 'chest',
    v: [m('lf', 'stack'), m('tg', 'stack'), m('hammer', 'plate'), m('panatta', 'stack'), ...many('stack', ['prime', 'atlantis'])],
  },
  // v7: 무게를 기구가 받쳐 주는 딥스 (어시스트 풀업과 같은 '딥/친 어시스트' 기구가 많음). 무게 = 보조 무게
  {
    id: 'assisted-dip',
    name: '어시스트 딥스',
    muscle: 'chest',
    v: [m('lf', 'stack'), m('tg', 'stack'), m('matrix', 'stack'), m('cybex', 'stack'), ...many('stack', ['precor', 'hoist', 'atlantis'])],
  },

  // ── 어깨 ──
  { id: 'overhead-press', name: '오버헤드 프레스', muscle: 'shoulders', v: [e('barbell'), e('dumbbell'), e('smith')] },
  {
    id: 'shoulder-press',
    name: '숄더 프레스 머신',
    muscle: 'shoulders',
    v: [
      m('hammer', 'plate'),
      m('lf', 'stack'),
      m('tg', 'stack'),
      m('cybex', 'stack'),
      m('matrix', 'stack'),
      m('panatta', 'plate'),
      m('newtech', 'stack'),
      // v2
      m('prime', 'plate'),
      m('prime', 'stack'),
      m('atlantis', 'stack'),
      m('watson', 'plate'),
      m('gymleco', 'plate'),
      m('hoist', 'stack'),
      m('precor', 'stack'),
    ],
  },
  {
    id: 'lateral-raise',
    name: '사이드 레터럴 레이즈',
    muscle: 'shoulders',
    v: [
      e('dumbbell'),
      e('cable'),
      m('lf', 'stack'),
      m('tg', 'stack'),
      m('panatta', 'stack'),
      m('newtech', 'stack'),
      ...many('stack', ['prime', 'atlantis']),
    ],
  },
  // v6: 한쪽씩 하는 레터럴 레이즈 (케이블이 가장 흔함). 양손 버전과 무게가 달라 따로 기록
  {
    id: 'one-arm-lateral-raise',
    name: '원암 레터럴 레이즈',
    muscle: 'shoulders',
    v: [e('cable'), e('dumbbell'), g('stack')],
  },
  { id: 'rear-delt-fly', name: '리어 델트 플라이', muscle: 'shoulders', v: [e('dumbbell'), e('cable'), ...stackAll()] },
  { id: 'face-pull', name: '페이스 풀', muscle: 'shoulders', v: [e('cable')] },
  { id: 'shrug', name: '슈러그', muscle: 'shoulders', v: [e('barbell'), e('dumbbell'), e('smith')] },

  // ── 하체 ──
  { id: 'squat', name: '스쿼트', muscle: 'legs', v: [e('barbell'), e('smith')] },
  {
    id: 'leg-press',
    name: '레그 프레스',
    muscle: 'legs',
    v: [
      g('plate', '45도'),
      m('hammer', 'plate'),
      m('lf', 'stack'),
      m('tg', 'stack'),
      m('cybex', 'stack'),
      m('panatta', 'plate'),
      m('newtech', 'plate'),
      ...many('plate', ['prime', 'atlantis', 'watson', 'gymleco', 'gym80', 'arsenal']),
    ],
  },
  {
    id: 'hack-squat',
    name: '핵 스쿼트',
    muscle: 'legs',
    v: [
      g('plate'),
      m('hammer', 'plate'),
      m('panatta', 'plate'),
      m('arsenal', 'plate'),
      m('gym80', 'plate'),
      ...many('plate', ['prime', 'atlantis', 'watson', 'gymleco']),
    ],
  },
  { id: 'pendulum-squat', name: '펜듈럼 스쿼트', muscle: 'legs', v: [g('plate'), m('arsenal', 'plate')] },
  { id: 'leg-extension', name: '레그 익스텐션', muscle: 'legs', v: stackAll(m('hammer', 'plate')) },
  { id: 'lying-leg-curl', name: '라잉 레그 컬', muscle: 'legs', v: stackAll(m('hammer', 'plate')) },
  { id: 'seated-leg-curl', name: '시티드 레그 컬', muscle: 'legs', v: stackAll() },
  { id: 'romanian-deadlift', name: '루마니안 데드리프트', muscle: 'legs', v: [e('barbell'), e('dumbbell'), e('smith')] },
  // v16: 무릎을 거의 편 채 바닥 가까이까지 내리는 데드리프트 (루마니안보다 햄스트링이 더 늘어남)
  { id: 'stiff-leg-deadlift', name: '스티프 레그 데드리프트', muscle: 'legs', v: [e('barbell'), e('dumbbell'), e('smith')] },
  { id: 'lunge', name: '런지', muscle: 'legs', v: [e('dumbbell'), e('barbell'), e('smith')] },
  { id: 'bulgarian-split-squat', name: '불가리안 스플릿 스쿼트', muscle: 'legs', v: [e('dumbbell'), e('smith')] },
  { id: 'hip-thrust', name: '힙 쓰러스트', muscle: 'legs', v: [e('barbell'), g('plate'), e('smith'), m('bootybuilder', 'plate')] },
  { id: 'hip-adduction', name: '힙 어덕션 (이너 타이)', muscle: 'legs', v: stackAll() },
  { id: 'hip-abduction', name: '힙 어브덕션 (아웃 타이)', muscle: 'legs', v: stackAll() },
  {
    id: 'calf-raise',
    name: '카프 레이즈',
    muscle: 'legs',
    v: [g('stack', '스탠딩'), g('plate', '시티드'), e('smith'), e('other', '레그 프레스에서')],
  },
  { id: 'glute-kickback', name: '글루트 킥백', muscle: 'legs', v: [e('cable'), g('stack')] },

  // ── 팔 ──
  { id: 'barbell-curl', name: '바벨 컬', muscle: 'arms', v: [e('barbell'), e('barbell', 'EZ바', '-ez')] },
  { id: 'dumbbell-curl', name: '덤벨 컬', muscle: 'arms', v: [e('dumbbell')] },
  // v10: 인클라인 벤치에 기대 팔을 뒤로 늘인 채 하는 컬 (같은 무게라도 일반 덤벨 컬보다 가벼움)
  { id: 'incline-dumbbell-curl', name: '인클라인 덤벨 컬', muscle: 'arms', v: [e('dumbbell')] },
  { id: 'hammer-curl', name: '해머 컬', muscle: 'arms', v: [e('dumbbell'), e('cable', '로프')] },
  // v15: 손등이 위로 오게(오버핸드) 잡는 컬. 전완(완요골근)이 주로 쓰임
  { id: 'reverse-curl', name: '리버스 컬', muscle: 'arms', v: [e('barbell'), e('barbell', 'EZ바', '-ez'), e('cable'), e('dumbbell')] },
  { id: 'cable-curl', name: '케이블 컬', muscle: 'arms', v: [e('cable')] },
  {
    id: 'preacher-curl',
    name: '프리처 컬',
    muscle: 'arms',
    v: [
      e('barbell', 'EZ바'),
      e('dumbbell'),
      m('lf', 'stack'),
      m('tg', 'stack'),
      m('panatta', 'stack'),
      m('hammer', 'plate'),
      ...many('stack', ['prime', 'atlantis']),
      // v11
      e('cable'),
    ],
  },
  {
    id: 'triceps-pushdown',
    name: '트라이셉스 푸시다운',
    muscle: 'arms',
    v: [e('cable', '로프'), e('cable', '스트레이트 바', '-bar'), e('cable', 'V바', '-v')],
  },
  { id: 'overhead-triceps', name: '오버헤드 트라이셉스 익스텐션', muscle: 'arms', v: [e('cable'), e('dumbbell')] },
  { id: 'skull-crusher', name: '라잉 트라이셉스 익스텐션', muscle: 'arms', v: [e('barbell', 'EZ바'), e('dumbbell')] },
  {
    id: 'triceps-machine',
    name: '트라이셉스 익스텐션 머신',
    muscle: 'arms',
    v: [m('lf', 'stack'), m('tg', 'stack'), m('panatta', 'stack'), ...many('stack', ['prime', 'atlantis'])],
  },

  // ── 복근 ──
  { id: 'crunch', name: '크런치', muscle: 'core', track: 'reps', v: [e('bodyweight')] },
  { id: 'cable-crunch', name: '케이블 크런치', muscle: 'core', v: [e('cable')] },
  {
    id: 'ab-crunch-machine',
    name: '복근 크런치 머신',
    muscle: 'core',
    v: [m('lf', 'stack'), m('tg', 'stack'), m('panatta', 'stack'), m('atlantis', 'stack')],
  },
  { id: 'hanging-leg-raise', name: '행잉 레그 레이즈', muscle: 'core', track: 'reps', v: [e('bodyweight')] },
  { id: 'plank', name: '플랭크', muscle: 'core', track: 'time', v: [e('bodyweight')] },

  // ── 유산소 ──
  { id: 'treadmill', name: '러닝머신', muscle: 'cardio', track: 'time', v: [e('machine')] },
  { id: 'stationary-bike', name: '실내 자전거', muscle: 'cardio', track: 'time', v: [e('machine')] },
  { id: 'stair-climber', name: '천국의 계단', muscle: 'cardio', track: 'time', v: [e('machine')] },
  { id: 'rowing-machine', name: '로잉 머신', muscle: 'cardio', track: 'time', v: [e('machine')] },
];

/**
 * v2: 프라임·아틀란티스·왓슨·짐레코·호이스트·프리코어·부티빌더 기구 추가
 * v3: 로우 로우(low-row) 추가
 * v4: 머신 T바 로우 분리. T바 로우의 브랜드 머신은 숨기고(SEED_V4_HIDDEN), 일반 머신은 스탠딩 거치대로 표시
 * v5: '머신 T바 로우' → '체스트 서포티드 T바 로우'로 이름 변경 (서서 하는 T바 로우와 구분)
 * v6: 원암 레터럴 레이즈 추가
 * v7: 어시스트 딥스 추가
 * v8: 원암 랫 풀다운 추가
 * v9: 롱 풀 추가
 * v10: 인클라인 덤벨 컬 추가
 * v11: 프리처 컬에 케이블 추가
 * v12: 벤치 프레스·인클라인 벤치 프레스에 머신 추가
 * v13: 원암 하이 로우 추가
 * v14: 원암 시티드 로우 추가
 * v15: 리버스 컬 추가
 * v16: 스티프 레그 데드리프트 추가
 */
export const SEED_VERSION = 16;

/** v4에서 숨긴 T바 로우 브랜드 머신 (기록이 없을 때만 숨김) */
export const SEED_V4_HIDDEN = ['t-bar-row:m-hammer-plate', 't-bar-row:m-prime-plate', 't-bar-row:m-atlantis-plate'];

export function buildSeed(): { exercises: Exercise[]; variants: Variant[] } {
  const exercises: Exercise[] = [];
  const variants: Variant[] = [];
  for (const s of SPEC) {
    exercises.push({ id: s.id, name: s.name, muscle: s.muscle, track: s.track ?? 'weight' });
    const seen = new Set<string>();
    for (const v of s.v) {
      const id = `${s.id}:${v.key}`;
      if (seen.has(id)) throw new Error(`중복 기구 id: ${id}`);
      seen.add(id);
      variants.push({
        id,
        exerciseId: s.id,
        equipment: v.equipment,
        brand: v.brand,
        loading: v.loading,
        model: v.model,
        unit: 'kg',
        ...(v.hidden ? { archived: true } : {}),
      });
    }
  }
  return { exercises, variants };
}

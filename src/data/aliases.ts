import type { Equipment, Loading } from '../types';
import { BRANDS } from './seed';

/**
 * 검색용 다른 이름들. 영어 이름, 약어, 자주 쓰는 한글 줄임말을 넣어 둡니다.
 * 각 배열의 첫 번째 값은 화면에 보여 줄 대표 영어 이름입니다.
 * (상태에 저장하지 않는 정적 데이터라 여기만 고치면 기존 사용자에게도 바로 적용됩니다.)
 */
export const EXERCISE_ALIASES: Record<string, string[]> = {
  // 등
  'seated-row': ['Seated Row', 'Cable Row', 'Seated Cable Row', 'Machine Row', '케이블 로우', '머신 로우', '로우 머신'],
  'lat-pulldown': ['Lat Pulldown', 'Lat Pull Down', 'Pulldown', '랫풀', '렛풀다운'],
  'high-row': ['High Row'],
  'low-row': ['Low Row', 'Iso Low Row', 'Lower Row', '로우로우', '로우 로우 머신'],
  't-bar-row': ['T-Bar Row', 'Tbar Row', 'Standing T-Bar Row', '티바 로우', '일반 티바 로우', '스탠딩 티바 로우', 'Landmine Row', '랜드마인 로우'],
  'machine-t-bar-row': [
    'Chest Supported T-Bar Row',
    'Machine T-Bar Row',
    'Incline T-Bar Row',
    'T-Bar Row Machine',
    '체스트 서포티드 티바 로우',
    '머신 티바 로우',
    '머신 T바 로우',
    '인클라인 티바 로우',
  ],
  'barbell-row': ['Barbell Row', 'Bent Over Row', 'BB Row', '벤트오버 로우'],
  'dumbbell-row': ['Dumbbell Row', 'One Arm Row', 'DB Row', '덤벨 로우'],
  'pull-up': ['Pull Up', 'Pullup', 'Chin Up', '턱걸이', '친업'],
  'assisted-pull-up': ['Assisted Pull Up', 'Assisted Chin Up', '어시스티드 풀업', '어시스트 턱걸이'],
  deadlift: ['Deadlift', 'DL', 'Conventional Deadlift', 'Trap Bar Deadlift', '데드', '컨벤셔널'],
  'back-extension': ['Back Extension', 'Hyperextension', '하이퍼 익스텐션', '백익스'],
  'straight-arm-pulldown': ['Straight Arm Pulldown', 'Straight Arm Lat Pulldown', '암풀다운'],
  pullover: ['Pullover', 'Pullover Machine'],

  // 가슴
  'bench-press': ['Bench Press', 'BP', 'Flat Bench', '벤치', '플랫 벤치'],
  'incline-bench-press': ['Incline Bench Press', 'Incline Press', '인클라인 벤치'],
  'chest-press': ['Chest Press', 'Machine Chest Press', 'Seated Chest Press', '머신 체스트 프레스', '체프'],
  'incline-chest-press': ['Incline Chest Press', 'Incline Machine Press', '인클라인 머신'],
  'pec-fly': ['Pec Deck', 'Pec Fly', 'Chest Fly Machine', 'Butterfly', '펙덱', '체스트 플라이', '버터플라이'],
  'cable-crossover': ['Cable Crossover', 'Cable Fly', '케이블 플라이'],
  'dumbbell-fly': ['Dumbbell Fly', 'DB Fly', 'Chest Fly'],
  dips: ['Dips', 'Dip', 'Parallel Bar Dip'],
  'dip-machine': ['Dip Machine', 'Seated Dip', '시티드 딥스'],

  // 어깨
  'overhead-press': ['Overhead Press', 'OHP', 'Military Press', 'Shoulder Press', '밀리터리 프레스', '밀프', '숄더 프레스'],
  'shoulder-press': ['Shoulder Press Machine', 'Machine Shoulder Press', 'Seated Shoulder Press', '숄프', '머신 숄더'],
  'lateral-raise': ['Lateral Raise', 'Side Lateral Raise', 'Side Raise', '사레레', '사이드 레이즈'],
  'one-arm-lateral-raise': ['One Arm Lateral Raise', 'Single Arm Lateral Raise', 'Unilateral Lateral Raise', '원암 사레레', '한팔 레터럴 레이즈', '외팔 사레레', '케이블 사레레'],
  'rear-delt-fly': ['Rear Delt Fly', 'Reverse Fly', 'Reverse Pec Deck', '리버스 펙덱', '리어 델트', '리버스 플라이'],
  'face-pull': ['Face Pull'],
  shrug: ['Shrug', 'Shrugs', '쉬러그', '슈럭'],

  // 하체
  squat: ['Squat', 'Back Squat', 'Barbell Squat', '백 스쿼트'],
  'leg-press': ['Leg Press', '레프'],
  'hack-squat': ['Hack Squat'],
  'pendulum-squat': ['Pendulum Squat'],
  'leg-extension': ['Leg Extension', '레익'],
  'lying-leg-curl': ['Lying Leg Curl', 'Prone Leg Curl', 'Leg Curl'],
  'seated-leg-curl': ['Seated Leg Curl', 'Leg Curl'],
  'romanian-deadlift': ['Romanian Deadlift', 'RDL', '루마니안'],
  lunge: ['Lunge', 'Lunges', 'Walking Lunge', '워킹 런지'],
  'bulgarian-split-squat': ['Bulgarian Split Squat', 'BSS', 'Split Squat', '불스', '스플릿 스쿼트'],
  'hip-thrust': ['Hip Thrust', 'Glute Bridge', '힙쓰', '글루트 브릿지'],
  'hip-adduction': ['Hip Adduction', 'Adductor', 'Inner Thigh', '어덕터'],
  'hip-abduction': ['Hip Abduction', 'Abductor', 'Outer Thigh', '어브덕터'],
  'calf-raise': ['Calf Raise', 'Standing Calf Raise', 'Seated Calf Raise', '카프'],
  'glute-kickback': ['Glute Kickback', 'Cable Kickback', '킥백', '힙 킥백'],

  // 팔
  'barbell-curl': ['Barbell Curl', 'EZ Bar Curl', 'BB Curl', '이지바 컬'],
  'dumbbell-curl': ['Dumbbell Curl', 'Bicep Curl', 'DB Curl', '이두 컬'],
  'hammer-curl': ['Hammer Curl'],
  'cable-curl': ['Cable Curl', 'Cable Bicep Curl'],
  'preacher-curl': ['Preacher Curl', 'Scott Curl', '스캇 컬'],
  'triceps-pushdown': ['Triceps Pushdown', 'Tricep Pushdown', 'Rope Pushdown', 'Pushdown', '푸쉬다운', '케이블 푸시다운'],
  'overhead-triceps': ['Overhead Triceps Extension', 'Overhead Extension', 'French Press', '프렌치 프레스'],
  'skull-crusher': ['Skull Crusher', 'Lying Triceps Extension', '스컬 크러셔'],
  'triceps-machine': ['Triceps Extension Machine', 'Tricep Machine', '삼두 머신'],

  // 복근
  crunch: ['Crunch', 'Crunches'],
  'cable-crunch': ['Cable Crunch'],
  'ab-crunch-machine': ['Ab Crunch Machine', 'Abdominal Crunch', 'Ab Machine', '앱 크런치', '복근 머신'],
  'hanging-leg-raise': ['Hanging Leg Raise', 'Leg Raise', '행레레'],
  plank: ['Plank'],

  // 유산소
  treadmill: ['Treadmill', 'Running', 'Run', '트레드밀', '런닝머신', '달리기'],
  'stationary-bike': ['Stationary Bike', 'Bike', 'Cycle', 'Spin Bike', '사이클', '자전거'],
  'stair-climber': ['Stair Climber', 'Stairmaster', 'Step Mill', '스텝밀', '스테어마스터'],
  'rowing-machine': ['Rowing Machine', 'Rower', 'Erg', '에르고'],
};

/** 기본 운동의 대표 영어 이름 */
export function exerciseEnglishName(id: string): string | undefined {
  return EXERCISE_ALIASES[id]?.[0];
}

/** 브랜드 다른 이름 (키: 앱에 저장되는 한글 브랜드명) */
export const BRAND_ALIASES: Record<string, string[]> = {
  [BRANDS.hammer]: ['Hammer Strength', 'Hammer', 'HS', '해머'],
  [BRANDS.lf]: ['Life Fitness', 'LifeFitness', 'LF', '라이프'],
  [BRANDS.tg]: ['Technogym', 'Techno Gym', '테크노'],
  [BRANDS.cybex]: ['Cybex', '사이벡스'],
  [BRANDS.matrix]: ['Matrix', '메트릭스'],
  [BRANDS.precor]: ['Precor', '프리코', '프리커'],
  [BRANDS.nautilus]: ['Nautilus', '너틸러스'],
  [BRANDS.panatta]: ['Panatta'],
  [BRANDS.gym80]: ['Gym80', 'Gym 80', '짐에이티'],
  [BRANDS.arsenal]: ['Arsenal Strength', 'Arsenal', '아스날'],
  [BRANDS.newtech]: ['Newtech', 'New Tech', 'Newtech Wellness', '뉴테크'],
  [BRANDS.drax]: ['DRAX', '드렉스'],
  [BRANDS.prime]: ['Prime Fitness', 'Prime', 'Prime Strength', '프라임피트니스'],
  [BRANDS.atlantis]: ['Atlantis', 'Atlantis Strength', '아틀란'],
  [BRANDS.watson]: ['Watson', 'Watson Gym Equipment', 'Watson Animal'],
  [BRANDS.hoist]: ['Hoist', 'Hoist Fitness'],
  [BRANDS.gymleco]: ['Gymleco', '짐레꼬'],
  [BRANDS.startrac]: ['Star Trac', 'StarTrac', '스타트렉'],
  [BRANDS.impulse]: ['Impulse', 'Impulse Fitness'],
  [BRANDS.bootybuilder]: ['Booty Builder', 'BootyBuilder'],
  [BRANDS.freemotion]: ['Freemotion', 'Free Motion'],
  [BRANDS.sportsart]: ['SportsArt', 'Sports Art'],
  [BRANDS.bodysolid]: ['Body-Solid', 'Body Solid', 'BodySolid'],
  [BRANDS.dhz]: ['DHZ', 'DHZ Fitness', '디에이치제트'],
  [BRANDS.shua]: ['SHUA', 'Shua Fitness'],
  [BRANDS.steelflex]: ['Steelflex', 'Steel Flex'],
  [BRANDS.keiser]: ['Keiser'],
  [BRANDS.rogue]: ['Rogue', 'Rogue Fitness'],
  [BRANDS.eleiko]: ['Eleiko'],
  [BRANDS.pulse]: ['Pulse Fitness', 'Pulse'],
  [BRANDS.bodytone]: ['Bodytone', 'Body Tone'],
  [BRANDS.primal]: ['Primal Strength', 'Primal'],
  [BRANDS.tuffstuff]: ['TuffStuff', 'Tuff Stuff'],
  [BRANDS.legend]: ['Legend Fitness', 'Legend'],
  [BRANDS.muscled]: ['Muscle D Fitness', 'Muscle D', 'MuscleD'],
  [BRANDS.flex]: ['Flex Fitness', '플렉스'],
  [BRANDS.nebula]: ['Nebula Fitness', 'Nebula'],
  [BRANDS.schnell]: ['Schnell'],
  [BRANDS.bh]: ['BH Fitness', 'BH'],
  [BRANDS.jordan]: ['Jordan Fitness', 'Jordan'],
  [BRANDS.origin]: ['Origin Fitness', 'Origin'],
  [BRANDS.exigo]: ['Exigo'],
  [BRANDS.gymgear]: ['Gym Gear', 'GymGear'],
  [BRANDS.strive]: ['Strive', 'Strive Strength', 'Strive Fitness'],
  [BRANDS.icarian]: ['Icarian', '아이카리안'],
  [BRANDS.trotter]: ['Trotter', '트로터'],
  [BRANDS.eagle]: ['Eagle', 'Cybex Eagle', 'Eagle Performance'],
  [BRANDS.universal]: ['Universal', 'Universal Gym', '유니버설'],
  [BRANDS.bodymasters]: ['Body Masters', 'BodyMasters', 'Body Master', '바디마스터'],
  [BRANDS.polaris]: ['Polaris'],
  [BRANDS.megamass]: ['MegaMass', 'Mega Mass', '메가마스'],
  [BRANDS.concept2]: ['Concept2', 'Concept 2', '컨셉투'],
};

export const EQUIPMENT_ALIASES: Record<Equipment, string[]> = {
  machine: ['Machine', '기계'],
  cable: ['Cable'],
  barbell: ['Barbell', 'BB'],
  dumbbell: ['Dumbbell', 'DB', '아령'],
  smith: ['Smith', 'Smith Machine', '스미스'],
  bodyweight: ['Bodyweight', 'BW'],
  kettlebell: ['Kettlebell', 'KB'],
  band: ['Band', 'Resistance Band'],
  other: [],
};

export const LOADING_ALIASES: Record<Loading, string[]> = {
  plate: ['Plate', 'Plate Loaded', '원판'],
  stack: ['Pin', 'Stack', 'Weight Stack', 'Selectorized', '스택', '핀 머신'],
};

/** 검색·비교용 정규화: 대소문자, 띄어쓰기, 하이픈, 점 등을 무시 */
export function norm(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[\s\-_.·,()/']+/g, '');
}

/**
 * 직접 입력한 브랜드명을 이미 있는 브랜드로 맞춰 줍니다.
 * "hammer strength", "Hammer", "해머 스트렝스" → "해머스트렝스"
 */
export function canonicalBrand(input: string, known: string[] = []): string {
  const t = input.trim();
  const n = norm(t);
  if (!n) return '';
  for (const [ko, aliases] of Object.entries(BRAND_ALIASES)) {
    if (norm(ko) === n || aliases.some((a) => norm(a) === n)) return ko;
  }
  return known.find((k) => norm(k) === n) ?? t;
}

/** 브랜드명이 입력어와 (한글/영어 어느 쪽으로든) 부분 일치하는지 */
/**
 * 이름이 바뀌었거나 없어진 브랜드. successor가 있으면 그 브랜드로 검색해도 같이 보여 줌
 * (예: "프리코어" 검색 → 이카리안도 제안). 기록은 브랜드 이름별로 따로 쌓임.
 */
export const LEGACY_BRANDS: Record<string, { successor?: string; note: string }> = {
  [BRANDS.strive]: { successor: BRANDS.prime, note: '지금의 프라임' },
  [BRANDS.icarian]: { successor: BRANDS.precor, note: '프리코어에 인수' },
  [BRANDS.trotter]: { successor: BRANDS.cybex, note: '싸이벡스로 합병' },
  [BRANDS.eagle]: { successor: BRANDS.cybex, note: '싸이벡스 구형 라인' },
  [BRANDS.universal]: { successor: BRANDS.nautilus, note: '노틸러스에 인수' },
  [BRANDS.bodymasters]: { note: '단종 브랜드' },
  [BRANDS.polaris]: { note: '단종 브랜드' },
};

/** "이카리안 · 프리코어에 인수" 같은 설명. 해당 없으면 undefined */
export function brandNote(brand: string | undefined): string | undefined {
  return brand ? LEGACY_BRANDS[brand]?.note : undefined;
}

export function brandMatches(brand: string, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  return [brand, ...(BRAND_ALIASES[brand] ?? [])].some((s) => norm(s).includes(q));
}

/** brandMatches + 옛 브랜드는 지금 브랜드 이름으로도 걸림 ("precor" → 이카리안) */
export function brandMatchesWithLegacy(brand: string, query: string): boolean {
  if (brandMatches(brand, query)) return true;
  const succ = LEGACY_BRANDS[brand]?.successor;
  return !!succ && !!norm(query) && brandMatches(succ, query);
}

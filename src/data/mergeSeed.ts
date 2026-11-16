import type { DataState } from '../store';
import { buildSeed, SEED_V4_HIDDEN, SEED_VERSION, T_BAR_STAND } from './seed';

/** 기본 카탈로그에 새로 추가된 운동/기구를 기존 사용자 데이터에 합칩니다. (기존 항목은 건드리지 않음) */
export function mergeSeed(state: DataState): DataState {
  const seed = buildSeed();
  const exercises = [...state.exercises];
  const exIds = new Set(exercises.map((x) => x.id));
  const vIds = new Set(state.variants.map((x) => x.id));
  // 새 기본 운동은 목록 맨 끝이 아니라 시드에서 바로 앞 운동 뒤에 끼워 넣음 (예: 로우 로우 → 하이 로우 다음)
  seed.exercises.forEach((x, i) => {
    if (exIds.has(x.id)) return;
    const at = i > 0 ? exercises.findIndex((y) => y.id === seed.exercises[i - 1].id) : -1;
    if (at < 0) exercises.push(x);
    else exercises.splice(at + 1, 0, x);
    exIds.add(x.id);
  });
  let variants = [...state.variants, ...seed.variants.filter((x) => !vIds.has(x.id))];

  // v4: 가슴 패드형 T바 머신을 '머신 T바 로우'로 분리.
  // 예전 T바 로우의 브랜드 머신은 기록·루틴·진행 중 운동에 쓰인 적이 없을 때만 숨김 (쓴 기록은 그대로 둠)
  if ((state.seedVersion ?? 0) < 4) {
    const used = new Set<string>();
    for (const w of state.workouts) for (const e of w.exercises) if (e.variantId) used.add(e.variantId);
    for (const e of state.active?.exercises ?? []) if (e.variantId) used.add(e.variantId);
    for (const r of state.routines) for (const it of r.items) if (it.variantId) used.add(it.variantId);
    variants = variants.map((v) => {
      if (SEED_V4_HIDDEN.includes(v.id) && !v.archived && !used.has(v.id)) return { ...v, archived: true };
      if (v.id === 't-bar-row:m-generic-plate' && !v.model) return { ...v, model: T_BAR_STAND };
      return v;
    });
  }

  // v5: 이름 변경. 사용자가 직접 바꾼 이름은 그대로 둠
  const exercisesOut =
    (state.seedVersion ?? 0) < 5
      ? exercises.map((x) => (x.id === 'machine-t-bar-row' && x.name === '머신 T바 로우' ? { ...x, name: '체스트 서포티드 T바 로우' } : x))
      : exercises;

  return { ...state, exercises: exercisesOut, variants, seedVersion: SEED_VERSION };
}

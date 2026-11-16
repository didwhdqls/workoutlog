import type { MuscleGroup } from '../types';
import type { SubMuscle } from './muscles';

/**
 * 부위별 주당 권장 세트 (근비대 목적, 그 부위를 주 타깃으로 한 세트 기준).
 * Renaissance Periodization의 볼륨 랜드마크(MEV·MAV·MRV)를 참고해 단순화한 값이에요.
 *  - lo: 이보다 적으면 성장 자극이 부족할 수 있는 최소 (MEV 근처). 0이면 따로 안 해도 되는 부위
 *  - hi: 대부분 사람이 효과를 보는 구간의 위쪽 (MAV 위쪽)
 *  - max: 넘기면 회복이 어려워지기 쉬운 선 (MRV 근처)
 * 개인차가 크므로 참고용입니다.
 */
export interface VolumeGuide {
  lo: number;
  hi: number;
  max: number;
}

export const SUB_GUIDE: Partial<Record<SubMuscle, VolumeGuide>> = {
  'front-delt': { lo: 0, hi: 8, max: 12 }, // 가슴·어깨 프레스에서 많이 쓰여 따로 안 해도 됨
  'side-delt': { lo: 8, hi: 22, max: 26 },
  'rear-delt': { lo: 6, hi: 18, max: 22 },
  traps: { lo: 0, hi: 16, max: 26 },
  quads: { lo: 8, hi: 18, max: 20 },
  hamstrings: { lo: 6, hi: 16, max: 20 },
  glutes: { lo: 0, hi: 12, max: 16 }, // 스쿼트·데드리프트로도 많이 자극됨
  calves: { lo: 8, hi: 16, max: 20 },
  biceps: { lo: 8, hi: 20, max: 26 },
  triceps: { lo: 6, hi: 14, max: 18 },
  forearms: { lo: 0, hi: 10, max: 16 },
  abs: { lo: 0, hi: 20, max: 25 },
};

/**
 * 부위(그룹) 전체 권장. 하체·팔은 주요 세부 부위(대퇴사두+햄스트링, 이두+삼두)를 더한 값.
 */
export const GROUP_GUIDE: Partial<Record<MuscleGroup, VolumeGuide>> = {
  chest: { lo: 8, hi: 20, max: 22 },
  back: { lo: 10, hi: 22, max: 25 },
  shoulders: { lo: 8, hi: 22, max: 26 },
  legs: { lo: 14, hi: 34, max: 40 },
  arms: { lo: 14, hi: 34, max: 44 },
  core: { lo: 0, hi: 20, max: 25 },
};

export type GuideStatus = 'none' | 'low' | 'ok' | 'high' | 'over';

export function guideStatus(sets: number, g?: VolumeGuide): GuideStatus {
  if (!g) return 'none';
  if (sets < g.lo) return 'low';
  if (sets <= g.hi) return 'ok';
  if (sets <= g.max) return 'high';
  return 'over';
}

export const STATUS_LABEL: Record<GuideStatus, string> = {
  none: '',
  low: '부족',
  ok: '적정',
  high: '많은 편',
  over: '과다',
};

export const fmtGuide = (g: VolumeGuide) => (g.lo === 0 ? `~${g.hi}` : `${g.lo}–${g.hi}`);

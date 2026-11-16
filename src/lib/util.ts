import type { Gym, SetEntry, TrackType, Variant, WeightUnit } from '../types';
import { EQUIPMENT_LABEL, LOADING_LABEL, UNIT_LABEL } from '../types';

/** crypto.randomUUID 는 http(LAN) 환경에서 없을 수 있어 직접 만듭니다. */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function newSet(partial: Partial<SetEntry> = {}): SetEntry {
  return { id: uid(), weight: null, reps: null, time: null, done: false, kind: 'normal', ...partial };
}

// ─── 기구 이름 ───────────────────────────────────────────────
/** 기구의 큰 제목: 브랜드(머신) 또는 기구 종류 */
export function variantTitle(v: Variant): string {
  if (v.label) return v.label;
  if (v.equipment === 'machine') return v.brand ?? (v.loading ? '일반 머신' : '머신');
  return EQUIPMENT_LABEL[v.equipment];
}

/** 플레이트/핀, 모델명 등 부가 설명 */
export function variantDetail(v: Variant): string {
  const parts: string[] = [];
  if (v.label && v.equipment === 'machine' && v.brand) parts.push(v.brand);
  if (v.loading) parts.push(LOADING_LABEL[v.loading]);
  if (v.model) parts.push(v.model);
  return parts.join(' · ');
}

export function variantName(v: Variant | undefined | null, gyms?: Gym[]): string {
  if (!v) return '기구 미지정';
  const d = variantDetail(v);
  const gym = gyms && v.gymId ? gyms.find((g) => g.id === v.gymId)?.name : undefined;
  return [variantTitle(v), d, gym ? `@${gym}` : ''].filter(Boolean).join(' · ');
}

// ─── 숫자/시간 포맷 ──────────────────────────────────────────
export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function unitLabel(u: WeightUnit | undefined): string {
  return UNIT_LABEL[u ?? 'kg'];
}

export function fmtDuration(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDurationLong(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}분`;
  return `${Math.floor(min / 60)}시간 ${min % 60}분`;
}

export function fmtRest(sec: number): string {
  if (sec <= 0) return '끔';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}초`;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}

const WD = ['일', '월', '화', '수', '목', '금', '토'];
export function fmtDate(ts: number, withYear = false): string {
  const d = new Date(ts);
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
  return withYear || d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()}년 ${base}` : base;
}
export function fmtShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtSet(s: Pick<SetEntry, 'weight' | 'reps' | 'time'>, track: TrackType, unit: WeightUnit = 'kg'): string {
  if (track === 'time') return s.time != null ? fmtDuration(s.time) : '-';
  if (track === 'reps') return s.reps != null ? `${s.reps}회` : '-';
  if (s.weight == null && s.reps == null) return '-';
  return `${fmtNum(s.weight) || 0}${unitLabel(unit)} × ${s.reps ?? 0}`;
}

export function defaultWorkoutName(ts = Date.now()): string {
  const h = new Date(ts).getHours();
  if (h < 11) return '아침 운동';
  if (h < 17) return '오후 운동';
  return '저녁 운동';
}

/** 입력 문자열을 숫자로. 비었거나 이상하면 null */
export function parseNum(s: string): number | null {
  const t = s.replace(',', '.').trim();
  if (t === '' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

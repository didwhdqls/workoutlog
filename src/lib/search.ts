import { BRAND_ALIASES, EQUIPMENT_ALIASES, EXERCISE_ALIASES, LOADING_ALIASES, norm } from '../data/aliases';
import type { Exercise, MuscleGroup, Variant } from '../types';
import { EQUIPMENT_LABEL, LOADING_LABEL } from '../types';

interface Cand {
  text: string;
  /** 정규화한 전체 문자열 */
  n: string;
  /** 단어 경계마다 시작하는 나머지 문자열: "Straight Arm Lat Pulldown" → straightarmlatpulldown, armlatpulldown, latpulldown, pulldown */
  starts: string[];
}
interface Entry {
  name: Cand;
  aliases: Cand[];
  machines: Cand[];
}

const HANGUL = /[ㄱ-ㆎ가-힣]/;

function cand(text: string): Cand {
  const words = text.split(/[\s\-_/·,()]+/).filter(Boolean);
  return { text, n: norm(text), starts: words.map((_, i) => norm(words.slice(i).join(''))) };
}

/**
 * 한글은 단어 중간도 일치 ("풀다운" → 랫 풀다운),
 * 영어는 단어 첫머리부터 일치 ("lat" → Lat Pulldown 은 되지만 Plate 는 안 됨)
 */
function hit(c: Cand, token: string): boolean {
  return HANGUL.test(token) ? c.n.includes(token) : c.starts.some((s) => s.startsWith(token));
}

/** 사용자가 직접 넣은 별칭 (쉼표 구분) */
export function userAliases(x: Exercise): string[] {
  return (x.aliases ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const cands = (texts: (string | undefined)[]): Cand[] =>
  [...new Set(texts.filter((t): t is string => !!t && !!norm(t)))].map(cand);

/** 운동마다 검색 대상 문자열 묶음을 만들어 둡니다. */
export function buildSearchIndex(exercises: Exercise[], variants: Variant[]): Map<string, Entry> {
  const machineTexts = new Map<string, (string | undefined)[]>();
  for (const v of variants) {
    if (v.archived) continue;
    const list = machineTexts.get(v.exerciseId) ?? [];
    list.push(v.brand, ...(v.brand ? BRAND_ALIASES[v.brand] ?? [] : []), v.model, v.label);
    list.push(EQUIPMENT_LABEL[v.equipment], ...EQUIPMENT_ALIASES[v.equipment]);
    if (v.loading) list.push(LOADING_LABEL[v.loading], ...LOADING_ALIASES[v.loading]);
    machineTexts.set(v.exerciseId, list);
  }
  const index = new Map<string, Entry>();
  for (const x of exercises) {
    index.set(x.id, {
      name: cand(x.name),
      aliases: cands([...(EXERCISE_ALIASES[x.id] ?? []), ...userAliases(x)]),
      machines: cands(machineTexts.get(x.id) ?? []),
    });
  }
  return index;
}

/**
 * 띄어쓰기로 나눈 단어가 모두 (이름 / 영어·별칭 / 기구명) 중 어딘가에 있으면 일치.
 * "seated row", "시티드로우", "hammer row", "사레레", "rdl" 모두 됩니다.
 * hints: 이름이 아니라 별칭·브랜드로 찾은 경우 무엇과 일치했는지 (목록에 작게 표시)
 */
export function searchExercises(
  exercises: Exercise[],
  index: Map<string, Entry>,
  query: string,
  muscle: MuscleGroup | 'all',
): { list: Exercise[]; hints: Map<string, string> } {
  const whole = norm(query);
  const tokens = query.split(/\s+/).map(norm).filter(Boolean);
  const hints = new Map<string, string>();
  // 0: 이름이 검색어 전체와 맞음, 1: 별칭이 전체와 맞음, 2: 단어별로만 맞음 → 이 순서로 정렬
  const rank = new Map<string, number>();
  const list = exercises.filter((x) => {
    if (x.archived) return false;
    if (muscle !== 'all' && x.muscle !== muscle) return false;
    if (!whole) return true;
    const e = index.get(x.id);
    if (!e) return false;
    if (hit(e.name, whole)) {
      rank.set(x.id, 0);
      return true;
    }

    // 별칭 하나가 검색어 전체와 맞으면 그 별칭을 힌트로 ("seated row" → Seated Row)
    const aliasHit = e.aliases.find((c) => hit(c, whole));
    if (aliasHit) {
      hints.set(x.id, aliasHit.text);
      rank.set(x.id, 1);
      return true;
    }
    // 아니면 단어별로: 각 단어가 이름·별칭·기구명 중 하나와 맞아야 함 ("hammer row")
    const found: string[] = [];
    for (const t of tokens) {
      if (hit(e.name, t)) continue;
      const c = e.aliases.find((a) => hit(a, t)) ?? e.machines.find((m) => hit(m, t));
      if (!c) return false;
      if (!found.includes(c.text)) found.push(c.text);
    }
    if (found.length) hints.set(x.id, found.join(' · '));
    rank.set(x.id, 2);
    return true;
  });
  // 예: "로우 로우"는 단어마다 모든 로우 운동과 맞지만, 이름이 통째로 맞는 로우 로우를 맨 위로
  if (whole) list.sort((a, b) => (rank.get(a.id) ?? 2) - (rank.get(b.id) ?? 2));
  return { list, hints };
}

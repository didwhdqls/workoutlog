import { useMemo, useState } from 'react';
import { EXERCISE_ALIASES } from '../data/aliases';
import { SUB_LABEL, SUBS_BY_GROUP, groupOfSub, subMuscleOf, type SubMuscle } from '../data/muscles';
import { BodyMap, LEVEL_COLOR } from './BodyMap';
import { SECONDARY, secondaryOf, type MuscleFatigue } from '../lib/fatigue';
import { isUnilateral } from '../lib/stats';
import { buildSearchIndex, searchExercises } from '../lib/search';
import { useStore } from '../store';
import type { Equipment, Exercise, MuscleGroup, TrackType } from '../types';
import { EQUIPMENT_LABEL, EQUIPMENT_ORDER, MUSCLE_LABEL, MUSCLE_ORDER } from '../types';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

/** 운동 이름(한글/영어/줄임말) 또는 등록된 기구의 브랜드·모델로 검색 */
export function useExerciseSearch(query: string, muscle: MuscleGroup | 'all') {
  const exercises = useStore((s) => s.exercises);
  const variants = useStore((s) => s.variants);
  const index = useMemo(() => buildSearchIndex(exercises, variants), [exercises, variants]);
  return useMemo(() => searchExercises(exercises, index, query, muscle), [exercises, index, query, muscle]);
}

/** 영어·별칭·브랜드로 찾았을 때 무엇과 일치했는지 */
export function MatchHint({ text }: { text?: string }) {
  if (!text) return null;
  return <span className="tag accent">{text}</span>;
}

export function MuscleChips({ value, onChange }: { value: MuscleGroup | 'all'; onChange: (m: MuscleGroup | 'all') => void }) {
  return (
    <div className="chips">
      <button className={'chip' + (value === 'all' ? ' on' : '')} onClick={() => onChange('all')}>
        전체
      </button>
      {MUSCLE_ORDER.map((m) => (
        <button key={m} className={'chip' + (value === m ? ' on' : '')} onClick={() => onChange(m)}>
          {MUSCLE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="search">
      <Icon name="search" size={18} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '운동·브랜드 검색 (한글/영어)'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}

export function ExercisePicker({
  onPick,
  onClose,
  title = '운동 추가',
  single = false,
  excludeId,
}: {
  onPick: (ids: string[]) => void;
  onClose: () => void;
  title?: string;
  /** 하나만 고르기: 누르면 바로 선택하고 닫힘 (운동 바꾸기용) */
  single?: boolean;
  /** 지금 운동은 목록에서 흐리게 */
  excludeId?: string;
}) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const { list, hints } = useExerciseSearch(q, muscle);
  const variants = useStore((s) => s.variants);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of variants) if (!v.archived) m.set(v.exerciseId, (m.get(v.exerciseId) ?? 0) + 1);
    return m;
  }, [variants]);

  if (creating) {
    return (
      <ExerciseForm
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          if (single) {
            onPick([id]);
            onClose();
            return;
          }
          setPicked((p) => [...p, id]);
          setCreating(false);
        }}
      />
    );
  }

  const toggle = (id: string) => {
    if (single) {
      onPick([id]);
      onClose();
      return;
    }
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      headerExtra={
        <button className="btn ghost sm" onClick={() => setCreating(true)}>
          새 운동
        </button>
      }
      footer={
        single ? undefined : (
        <button
          className="btn primary block"
          disabled={picked.length === 0}
          onClick={() => {
            onPick(picked);
            onClose();
          }}
        >
          {picked.length > 0 ? `${picked.length}개 추가` : '운동을 선택하세요'}
        </button>
        )
      }
    >
      <div style={{ position: 'sticky', top: -4, background: 'var(--surface)', paddingBottom: 8, zIndex: 1 }}>
        <SearchBox value={q} onChange={setQ} />
        <div style={{ marginTop: 8 }}>
          <MuscleChips value={muscle} onChange={setMuscle} />
        </div>
      </div>
      <div className="list">
        {list.map((x) => {
          const on = picked.includes(x.id);
          const n = counts.get(x.id) ?? 0;
          return (
            <button
              key={x.id}
              className="list-item"
              onClick={() => toggle(x.id)}
              disabled={x.id === excludeId}
              style={x.id === excludeId ? { opacity: 0.4 } : undefined}
            >
              {!single && (
                <span className={'check-box' + (on ? ' on' : '')}>
                  <Icon name="check" size={14} stroke={3} />
                </span>
              )}
              <div className="grow">
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className="title">{x.name}</span>
                  <MatchHint text={hints.get(x.id)} />
                </div>
                <div className="sub">
                  {x.id === excludeId && '지금 운동 · '}
                  {MUSCLE_LABEL[x.muscle]}
                  {n > 1 && ` · 기구 ${n}종`}
                </div>
              </div>
              {on && <span className="tag accent">{picked.indexOf(x.id) + 1}</span>}
            </button>
          );
        })}
        {list.length === 0 && <div className="empty">검색 결과가 없어요. 오른쪽 위 "새 운동"으로 만들 수 있어요.</div>}
      </div>
    </Sheet>
  );
}

/** 새 운동(동작) 만들기. 첫 기구도 함께 등록합니다. */
export function ExerciseForm({
  exercise,
  onClose,
  onSaved,
}: {
  exercise?: Exercise;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const addExercise = useStore((s) => s.addExercise);
  const updateExercise = useStore((s) => s.updateExercise);
  const addVariant = useStore((s) => s.addVariant);
  const [name, setName] = useState(exercise?.name ?? '');
  const [aliases, setAliases] = useState(exercise?.aliases ?? '');
  const [muscle, setMuscle] = useState<MuscleGroup>(exercise?.muscle ?? 'back');
  const [track, setTrack] = useState<TrackType>(exercise?.track ?? 'weight');
  const [equipment, setEquipment] = useState<Equipment>('machine');
  const [sub, setSub] = useState<SubMuscle | null>(exercise ? subMuscleOf(exercise) : null);
  const [secondary, setSecondary] = useState<SubMuscle[]>(exercise ? secondaryOf(exercise) : []);
  const [unilateral, setUnilateral] = useState(exercise ? isUnilateral(exercise) : false);
  const builtIn = exercise ? EXERCISE_ALIASES[exercise.id] : undefined;
  const subOptions = SUBS_BY_GROUP[muscle];
  const hasSubs = SUBS_BY_GROUP[muscle].length > 0;

  // 주 부위를 고르면 부위 그룹도 그에 맞춤 (예: 삼두 → 팔)
  const pickMain = (s: SubMuscle | null) => {
    setSub(s);
    if (s) {
      setMuscle(groupOfSub(s));
      setSecondary((xs) => xs.filter((x) => x !== s));
    }
  };
  const toggleSecondary = (s: SubMuscle) => setSecondary((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));
  // 몸 모형을 누를 때: 없음 → 주 부위 → 보조 부위 → 없음
  const cycle = (s: SubMuscle) => {
    if (sub === s) {
      setSub(null);
      setSecondary((xs) => [...xs, s]);
    } else if (secondary.includes(s)) toggleSecondary(s);
    else if (!sub) pickMain(s);
    else toggleSecondary(s);
  };
  // 미리 보기: 주 부위 빨강, 보조 부위 노랑
  const preview = useMemo(() => {
    const m = new Map<SubMuscle, MuscleFatigue>();
    for (const x of secondary) m.set(x, { score: 1, level: 1, hoursLeft: 0 });
    if (sub) m.set(sub, { score: 9, level: 3, hoursLeft: 0 });
    return m;
  }, [sub, secondary]);

  const save = () => {
    const cleanAliases =
      aliases
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', ') || undefined;
    const validSub = sub && subOptions.includes(sub) ? sub : undefined;
    // 기본 운동의 내장 보조 부위와 같으면 저장하지 않음 (나중에 기본값이 고쳐지면 따라가게)
    const builtInSecondary = exercise ? (SECONDARY[exercise.id] ?? []) : [];
    const sameAsBuiltIn =
      exercise && !exercise.secondary && secondary.length === builtInSecondary.length && secondary.every((x) => builtInSecondary.includes(x));
    const sec = sameAsBuiltIn ? undefined : secondary.filter((x) => x !== validSub);
    // 기본 운동은 내장 값과 다를 때만 저장
    const uni = exercise ? (unilateral === isUnilateral(exercise.id) ? undefined : unilateral) : unilateral || undefined;
    if (exercise) {
      updateExercise(exercise.id, { name: name.trim(), muscle, track, aliases: cleanAliases, sub: validSub, secondary: sec, unilateral: uni });
      onSaved?.(exercise.id);
    } else {
      const id = addExercise({
        name: name.trim(),
        muscle,
        track,
        aliases: cleanAliases,
        sub: validSub,
        ...(sec?.length ? { secondary: sec } : {}),
        ...(uni ? { unilateral: true } : {}),
      });
      addVariant({ exerciseId: id, equipment, unit: 'kg', loading: equipment === 'machine' ? 'stack' : undefined });
      onSaved?.(id);
    }
    onClose();
  };

  return (
    <Sheet
      title={exercise ? '운동 수정' : '새 운동'}
      onClose={onClose}
      footer={
        <button className="btn primary block" disabled={!name.trim()} onClick={save}>
          저장
        </button>
      }
    >
      <div className="field">
        <label>이름</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 와이드 그립 시티드 로우 / Wide Grip Row" autoFocus />
      </div>
      <div className="field">
        <label>다른 이름 (검색용, 선택)</label>
        <input
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          placeholder="쉼표로 구분 · 예: Wide Row, 와이드로우"
          autoCapitalize="none"
          autoCorrect="off"
        />
        <div className="hint">
          {builtIn
            ? `기본으로 검색되는 이름: ${builtIn.join(', ')}`
            : '영어 이름이나 줄임말을 넣어 두면 그걸로도 검색돼요.'}
        </div>
      </div>
      <div className="field">
        <label>부위</label>
        <div className="chips wrap">
          {MUSCLE_ORDER.map((m) => (
            <button
              key={m}
              className={'chip' + (muscle === m ? ' on' : '')}
              onClick={() => {
                setMuscle(m);
                if (sub && !SUBS_BY_GROUP[m].includes(sub)) setSub(null);
                if (!SUBS_BY_GROUP[m].length) setSecondary([]);
              }}
            >
              {MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
      {hasSubs && (
        <>
          <div className="field">
            <label>주로 쓰는 부위</label>
            <div className="chips wrap">
              {subOptions.map((s) => (
                <button key={s} className={'chip' + (sub === s ? ' on' : '')} onClick={() => pickMain(sub === s ? null : s)}>
                  {SUB_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="hint">통계의 세부 부위 세트 수와 근육 피로도에 써요. 다른 그룹 부위는 아래 몸 모형을 눌러 고를 수도 있어요.</div>
          </div>

          <div className="field">
            <label>함께 쓰이는 부위 (선택, 여러 개)</label>
            {MUSCLE_ORDER.filter((g) => SUBS_BY_GROUP[g].length).map((g) => (
              <div key={g} className="row" style={{ gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                <span className="tiny faint" style={{ width: 30, flex: 'none', paddingTop: 7 }}>
                  {MUSCLE_LABEL[g]}
                </span>
                <div className="chips wrap" style={{ flex: 1 }}>
                  {SUBS_BY_GROUP[g]
                    .filter((s) => s !== sub)
                    .map((s) => (
                      <button key={s} className={'chip sm' + (secondary.includes(s) ? ' on' : '')} onClick={() => toggleSecondary(s)}>
                        {SUB_LABEL[s]}
                      </button>
                    ))}
                </div>
              </div>
            ))}
            <div className="hint">예: 벤치 프레스 → 삼두·전면 삼각. 근육 피로도에 세트의 절반만큼 반영돼요.</div>
          </div>

          <div className="card" style={{ padding: '12px 8px', marginBottom: 14 }}>
            <BodyMap
              fatigue={preview}
              showLegend={false}
              onPick={cycle}
              hint={
                <span className="tiny muted">
                  <span style={{ color: LEVEL_COLOR[3] }}>■</span> 주 부위 <span style={{ color: LEVEL_COLOR[1], marginLeft: 8 }}>■</span> 함께 쓰는 부위
                  <span className="faint"> · 누를 때마다 주 → 보조 → 해제</span>
                </span>
              }
            />
          </div>
        </>
      )}
      <div className="field">
        <label>기록 방식</label>
        <div className="seg">
          <button className={track === 'weight' ? 'on' : ''} onClick={() => setTrack('weight')}>
            무게 × 횟수
          </button>
          <button className={track === 'reps' ? 'on' : ''} onClick={() => setTrack('reps')}>
            횟수만
          </button>
          <button className={track === 'time' ? 'on' : ''} onClick={() => setTrack('time')}>
            시간
          </button>
        </div>
      </div>
      {track !== 'time' && (
        <div className="field">
          <label>한쪽씩 하는 운동인가요?</label>
          <div className="seg">
            <button className={!unilateral ? 'on' : ''} onClick={() => setUnilateral(false)}>
              양쪽 함께
            </button>
            <button className={unilateral ? 'on' : ''} onClick={() => setUnilateral(true)}>
              원암 · 원레그
            </button>
          </div>
          <div className="hint">
            {unilateral
              ? '한 팔(다리)씩 번갈아 하는 운동이에요. 무게는 한쪽 기준으로 적고, 볼륨은 양쪽을 합쳐 ×2로 계산해요. 예: 원암 케이블 로우 20kg × 10회 → 400kg'
              : '양손·양발로 함께 드는 운동이에요. 덤벨은 기구 설정에 따라 덤벨 1개 무게 기준(×2)으로 계산해요.'}
          </div>
        </div>
      )}
      {!exercise && (
        <div className="field">
          <label>첫 기구</label>
          <div className="chips wrap">
            {EQUIPMENT_ORDER.map((eq) => (
              <button key={eq} className={'chip' + (equipment === eq ? ' on' : '')} onClick={() => setEquipment(eq)}>
                {EQUIPMENT_LABEL[eq]}
              </button>
            ))}
          </div>
          <div className="hint">브랜드별 머신은 저장 후 운동 상세 화면이나 운동 중에 더 추가할 수 있어요.</div>
        </div>
      )}
    </Sheet>
  );
}

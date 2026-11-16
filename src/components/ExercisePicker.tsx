import { useMemo, useState } from 'react';
import { EXERCISE_ALIASES } from '../data/aliases';
import { SUB_LABEL, SUBS_BY_GROUP, subMuscleOf, type SubMuscle } from '../data/muscles';
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
  const builtIn = exercise ? EXERCISE_ALIASES[exercise.id] : undefined;
  const subOptions = SUBS_BY_GROUP[muscle];

  const save = () => {
    const cleanAliases =
      aliases
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', ') || undefined;
    const validSub = sub && subOptions.includes(sub) ? sub : undefined;
    if (exercise) {
      updateExercise(exercise.id, { name: name.trim(), muscle, track, aliases: cleanAliases, sub: validSub });
      onSaved?.(exercise.id);
    } else {
      const id = addExercise({ name: name.trim(), muscle, track, aliases: cleanAliases, sub: validSub });
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
              }}
            >
              {MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
      {subOptions.length > 1 && (
        <div className="field">
          <label>세부 부위 (선택)</label>
          <div className="chips wrap">
            {subOptions.map((s) => (
              <button key={s} className={'chip' + (sub === s ? ' on' : '')} onClick={() => setSub(sub === s ? null : s)}>
                {SUB_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="hint">통계에서 "팔 → 이두 · 삼두"처럼 나눠 세는 데 써요.</div>
        </div>
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

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ask, notify } from '../components/Dialog';
import { ExercisePicker } from '../components/ExercisePicker';
import { GripChip } from '../components/GripPicker';
import { Icon } from '../components/Icon';
import { NumInput, TimeInput } from '../components/NumInput';
import { ReorderSheet } from '../components/ReorderSheet';
import { ActionSheet } from '../components/Sheet';
import { VariantPicker } from '../components/VariantPicker';
import { fromInputs, toDateInput, toTimeInput } from '../components/WhenSheet';
import { defaultVariantId, isPerSide, latestBodyweight, loadMode } from '../lib/stats';
import { newSet, uid, unitLabel, variantName } from '../lib/util';
import { useMaps, useStore } from '../store';
import type { SetEntry, SetKind, Workout, WorkoutExercise } from '../types';

const KIND_LABEL: Record<SetKind, string> = { normal: '일반 세트', warmup: '워밍업', drop: '드롭 세트', failure: '실패 지점까지' };
const KIND_SHORT: Record<SetKind, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' };


/** 완료한 운동 기록 고치기 (/history/:id/edit). 저장 전까지는 초안만 바뀜 */
export function WorkoutEdit() {
  const { id = '' } = useParams();
  const original = useStore((s) => s.workouts.find((w) => w.id === id));
  if (!original) return <div className="empty">기록을 찾을 수 없어요.</div>;
  return <Editor original={original} />;
}

function Editor({ original }: { original: Workout }) {
  const navigate = useNavigate();
  const gyms = useStore((s) => s.gyms);
  const settingsBw = useStore((s) => latestBodyweight(s.workouts.filter((x) => x.id !== original.id)));
  const updateWorkout = useStore((s) => s.updateWorkout);
  const maps = useMaps();
  const [draft, setDraft] = useState<Workout>(original);
  const [dirty, setDirty] = useState(false);
  const [date, setDate] = useState(toDateInput(original.startedAt));
  const [start, setStart] = useState(toTimeInput(original.startedAt));
  const [end, setEnd] = useState(toTimeInput(original.endedAt ?? original.startedAt));
  const [picking, setPicking] = useState(false);
  const [reordering, setReordering] = useState(false);

  const update = (fn: (w: Workout) => Workout) => {
    setDraft(fn);
    setDirty(true);
  };
  const updateEntry = (entryId: string, fn: (e: WorkoutExercise) => WorkoutExercise) =>
    update((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === entryId ? fn(e) : e)) }));

  const save = async () => {
    // 값이 하나도 없는 세트와 세트가 없는 운동은 빼고 저장
    const exercises = draft.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.weight != null || s.reps != null || s.time != null).map((s) => ({ ...s, done: true })) }))
      .filter((e) => e.sets.length > 0);
    if (exercises.length === 0) {
      await notify('저장할 세트가 없어요', '기록을 지우려면 기록 화면 아래의 "기록 삭제"를 눌러 주세요.');
      return;
    }
    const startedAt = fromInputs(date, start);
    let endedAt = fromInputs(date, end);
    if (endedAt < startedAt) endedAt += 24 * 3600 * 1000; // 자정을 넘긴 운동
    updateWorkout({ ...draft, name: draft.name.trim() || original.name, startedAt, endedAt, exercises });
    navigate(`/history/${original.id}`, { replace: true });
  };

  const leave = async () => {
    if (!dirty || (await ask({ title: '저장하지 않고 나갈까요?', message: '고친 내용이 사라져요.', ok: '나가기', cancel: '계속 수정', danger: true })))
      navigate(-1);
  };

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={leave} aria-label="뒤로">
          <Icon name="back" />
        </button>
        <h1 className="small">기록 수정</h1>
        <button className="btn primary sm" onClick={save}>
          저장
        </button>
      </div>

      <input
        value={draft.name}
        onChange={(e) => update((w) => ({ ...w, name: e.target.value }))}
        placeholder="운동 이름"
        style={{ fontSize: 18, fontWeight: 700, background: 'var(--surface)', marginBottom: 10 }}
      />

      <div className="card edit-when">
        <label>
          <span>날짜</span>
          <input type="date" value={date} max={toDateInput(Date.now())} onChange={(e) => (setDate(e.target.value), setDirty(true))} />
        </label>
        <label>
          <span>시작</span>
          <input type="time" value={start} onChange={(e) => (setStart(e.target.value), setDirty(true))} />
        </label>
        <label>
          <span>끝</span>
          <input type="time" value={end} onChange={(e) => (setEnd(e.target.value), setDirty(true))} />
        </label>
      </div>

      <div className="card row" style={{ marginTop: 10, padding: '10px 12px', gap: 10 }}>
        <span className="grow small">
          그날 체중
          <div className="tiny faint">맨몸 운동 볼륨에 써요{!draft.bodyweightKg && settingsBw ? ` · 비우면 최근 체중 ${settingsBw}kg` : ''}</div>
        </span>
        <NumInput
          value={draft.bodyweightKg ?? null}
          placeholder={settingsBw ? String(settingsBw) : 'kg'}
          onChange={(v) =>
            update((w) => {
              const { bodyweightKg: _old, ...rest } = w;
              return v && v > 0 ? { ...rest, bodyweightKg: v } : rest;
            })
          }
          ariaLabel="그날 체중"
        />
        <span className="small muted">kg</span>
      </div>

      {gyms.length > 0 && (
        <div className="chips wrap" style={{ margin: '10px 0 4px' }}>
          <button className={'chip' + (draft.gymId == null ? ' on' : '')} onClick={() => update((w) => ({ ...w, gymId: null }))}>
            헬스장 없음
          </button>
          {gyms.map((g) => (
            <button key={g.id} className={'chip' + (draft.gymId === g.id ? ' on' : '')} onClick={() => update((w) => ({ ...w, gymId: g.id }))}>
              <Icon name="pin" size={14} /> {g.name}
            </button>
          ))}
        </div>
      )}

      {draft.exercises.length > 1 && (
        <div className="section-title">
          운동 {draft.exercises.length}개
          <button className="btn ghost sm" onClick={() => setReordering(true)}>
            <Icon name="sort" size={16} /> 순서 변경
          </button>
        </div>
      )}
      <div style={{ marginTop: draft.exercises.length > 1 ? 0 : 12 }}>
        {draft.exercises.map((e) => (
          <EditCard
            key={e.id}
            entry={e}
            gymId={draft.gymId}
            onChange={(fn) => updateEntry(e.id, fn)}
            onRemove={() => update((w) => ({ ...w, exercises: w.exercises.filter((x) => x.id !== e.id) }))}
          />
        ))}
      </div>

      <button className="btn soft block" onClick={() => setPicking(true)}>
        <Icon name="plus" size={18} /> 운동 추가
      </button>
      <p className="tiny faint" style={{ margin: '10px 2px 0' }}>
        고친 세트는 모두 완료한 세트로 저장돼요. 무게·횟수를 다 비운 세트는 저장할 때 빠져요.
      </p>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            const vs = useStore.getState().variants;
            update((w) => ({
              ...w,
              exercises: [
                ...w.exercises,
                ...ids.map((exerciseId) => ({
                  id: uid(),
                  exerciseId,
                  variantId: defaultVariantId(vs.filter((v) => v.exerciseId === exerciseId && !v.archived)),
                  restSec: 90,
                  sets: [newSet({ done: true })],
                })),
              ],
            }));
          }}
        />
      )}
      {reordering && (
        <ReorderSheet
          items={draft.exercises.map((e) => {
            const v = e.variantId ? maps.v.get(e.variantId) : undefined;
            return { id: e.id, title: maps.ex.get(e.exerciseId)?.name ?? '운동', sub: `${e.sets.length}세트 · ${v ? variantName(v, gyms) : '기구 미지정'}` };
          })}
          onSave={(ids) =>
            update((w) => {
              const byId = new Map(w.exercises.map((x) => [x.id, x]));
              return { ...w, exercises: ids.map((i) => byId.get(i)!).filter(Boolean) };
            })
          }
          onClose={() => setReordering(false)}
        />
      )}
    </div>
  );
}

function EditCard({
  entry,
  gymId,
  onChange,
  onRemove,
}: {
  entry: WorkoutExercise;
  gymId: string | null;
  onChange: (fn: (e: WorkoutExercise) => WorkoutExercise) => void;
  onRemove: () => void;
}) {
  const maps = useMaps();
  const gyms = useStore((s) => s.gyms);
  const exercise = maps.ex.get(entry.exerciseId);
  const variant = entry.variantId ? maps.v.get(entry.variantId) : undefined;
  const track = exercise?.track ?? 'weight';
  const unit = variant?.unit ?? 'kg';
  const perSide = isPerSide(exercise ?? entry.exerciseId, variant) && loadMode(entry, exercise, variant) === 'external';
  const assisted = loadMode(entry, exercise, variant) === 'assisted';
  const [menu, setMenu] = useState(false);
  const [pickVariant, setPickVariant] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [setMenuFor, setSetMenuFor] = useState<SetEntry | null>(null);

  let n = 0;
  const labels = entry.sets.map((s) => (s.kind === 'warmup' ? 'W' : String(++n)));
  const updSet = (setId: string, patch: Partial<SetEntry>) =>
    onChange((e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));
  const addSet = () =>
    onChange((e) => {
      const last = e.sets[e.sets.length - 1];
      return { ...e, sets: [...e.sets, newSet({ done: true, weight: last?.weight ?? null, reps: last?.reps ?? null, time: last?.time ?? null })] };
    });

  return (
    <div className="ex-card">
      <div className="ex-card-head">
        <div className="grow">
          <div className="ex-name">{exercise?.name ?? '삭제된 운동'}</div>
          <div className="variant-row">
            <button className={'variant-btn' + (variant ? '' : ' unset')} onClick={() => setPickVariant(true)}>
              <Icon name="swap" size={15} />
              <span>{variant ? variantName(variant, gyms) : '어떤 기구였나요? 선택'}</span>
            </button>
            <GripChip
              grip={entry.grip}
              hint={`${exercise?.name ?? ''} 그립`}
              onChange={(g) =>
                onChange((e) => {
                  const { grip: _old, ...rest } = e;
                  return g ? { ...rest, grip: g } : rest;
                })
              }
            />
          </div>
        </div>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="운동 메뉴">
          <Icon name="more" />
        </button>
      </div>

      <table className="sets">
        <thead>
          <tr>
            <th style={{ width: 40 }}>세트</th>
            {track === 'weight' && <th>{assisted ? '보조 ' : perSide ? '한쪽 ' : ''}{unitLabel(unit)}</th>}
            {track !== 'time' && <th>회</th>}
            {track === 'time' && <th>시간</th>}
            <th style={{ width: 42 }} />
          </tr>
        </thead>
        <tbody>
          {entry.sets.map((s, i) => (
            <tr key={s.id}>
              <td>
                <button className={'set-no ' + s.kind} onClick={() => setSetMenuFor(s)} aria-label={`세트 ${labels[i]} 메뉴`}>
                  {s.kind === 'normal' || s.kind === 'warmup' ? labels[i] : KIND_SHORT[s.kind]}
                </button>
              </td>
              {track === 'weight' && (
                <td>
                  <NumInput value={s.weight} placeholder="0" onChange={(v) => updSet(s.id, { weight: v })} ariaLabel={`${labels[i]}세트 무게`} />
                </td>
              )}
              {track !== 'time' && (
                <td>
                  <NumInput value={s.reps} decimal={false} placeholder="0" onChange={(v) => updSet(s.id, { reps: v })} ariaLabel={`${labels[i]}세트 횟수`} />
                </td>
              )}
              {track === 'time' && (
                <td>
                  <TimeInput value={s.time} onChange={(v) => updSet(s.id, { time: v })} />
                </td>
              )}
              <td>
                <button
                  className="icon-btn"
                  aria-label={`${labels[i]}세트 지우기`}
                  onClick={() => onChange((e) => ({ ...e, sets: e.sets.filter((x) => x.id !== s.id) }))}
                >
                  <Icon name="x" size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <textarea
        style={{ marginTop: 6, minHeight: 40 }}
        placeholder="메모 (선택)"
        value={entry.note ?? ''}
        onChange={(e) => onChange((x) => ({ ...x, note: e.target.value || undefined }))}
      />

      <div className="ex-foot">
        <button className="btn sm" onClick={addSet}>
          <Icon name="plus" size={16} /> 세트 추가
        </button>
      </div>

      {menu && (
        <ActionSheet
          title={exercise?.name ?? ''}
          onClose={() => setMenu(false)}
          actions={[
            { label: '운동 바꾸기', onClick: () => setReplacing(true) },
            { label: '기구 바꾸기', onClick: () => setPickVariant(true) },
            { label: '이 운동 빼기', danger: true, onClick: onRemove },
          ]}
        />
      )}
      {setMenuFor && (
        <ActionSheet
          title={`세트 ${labels[entry.sets.findIndex((x) => x.id === setMenuFor.id)] ?? ''}`}
          onClose={() => setSetMenuFor(null)}
          actions={[
            ...(['normal', 'warmup', 'drop', 'failure'] as SetKind[]).map((k) => ({
              label: KIND_LABEL[k],
              active: setMenuFor.kind === k,
              onClick: () => updSet(setMenuFor.id, { kind: k }),
            })),
            { label: '세트 삭제', danger: true, onClick: () => onChange((e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setMenuFor.id) })) },
          ]}
        />
      )}
      {pickVariant && (
        <VariantPicker
          exerciseId={entry.exerciseId}
          currentId={entry.variantId}
          gymId={gymId}
          onPick={(vid) => onChange((e) => ({ ...e, variantId: vid }))}
          onClose={() => setPickVariant(false)}
        />
      )}
      {replacing && (
        <ExercisePicker
          single
          title={`${exercise?.name ?? '운동'} 대신 한 운동`}
          excludeId={entry.exerciseId}
          onPick={([exId]) => {
            if (!exId) return;
            const vs = useStore.getState().variants.filter((v) => v.exerciseId === exId && !v.archived);
            onChange((e) => ({ ...e, exerciseId: exId, variantId: defaultVariantId(vs) }));
          }}
          onClose={() => setReplacing(false)}
        />
      )}
    </div>
  );
}

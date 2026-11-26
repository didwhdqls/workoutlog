import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ask } from '../components/Dialog';
import { ExercisePicker } from '../components/ExercisePicker';
import { GripChip } from '../components/GripPicker';
import { Icon } from '../components/Icon';
import { NumInput, TimeInput } from '../components/NumInput';
import { ReorderSheet } from '../components/ReorderSheet';
import { RoutineLine, RoutineSummary } from '../components/RoutineSummary';
import { RestPicker } from '../components/RestPicker';
import { ActionSheet } from '../components/Sheet';
import { VariantPicker } from '../components/VariantPicker';
import { defaultVariantId } from '../lib/stats';
import { fmtRest, uid, unitLabel, variantName } from '../lib/util';
import { useMaps, useStore } from '../store';
import type { Routine, RoutineItem } from '../types';

export function Routines() {
  const routines = useStore((s) => s.routines);
  const active = useStore((s) => s.active);
  const startWorkout = useStore((s) => s.startWorkout);
  const maps = useMaps();
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="page-head">
        <h1>루틴</h1>
        <Link to="/routines/new" className="btn primary sm">
          <Icon name="plus" size={16} /> 새 루틴
        </Link>
      </div>
      {routines.length === 0 && (
        <div className="empty">
          루틴이 없어요.
          <br />
          "가슴·삼두 데이", "등 데이"처럼 자주 하는 구성을 만들어 두세요.
        </div>
      )}
      {routines.map((r) => (
        <div key={r.id} className="card">
          <div className="row">
            <Link to={`/routines/${r.id}`} className="grow">
              <div style={{ fontWeight: 700, fontSize: 16 }} className="ellipsis">
                {r.name}
              </div>
              <div className="tiny muted ellipsis" style={{ marginTop: 2 }}>
                <RoutineLine r={r} />
              </div>
            </Link>
            <button
              className="btn soft sm"
              disabled={!!active || r.items.length === 0}
              onClick={() => {
                startWorkout({ routineId: r.id });
                navigate('/workout');
              }}
            >
              <Icon name="play" size={14} /> 시작
            </button>
          </div>
          <Link to={`/routines/${r.id}`} style={{ display: 'block', marginTop: 6 }}>
            {r.items.map((it) => {
              const v = it.variantId ? maps.v.get(it.variantId) : null;
              return (
                <div key={it.id} className="small muted ellipsis">
                  {it.sets.length} × {maps.ex.get(it.exerciseId)?.name ?? '?'}
                  {v && <span className="faint"> · {variantName(v)}</span>}
                </div>
              );
            })}
            {r.items.length === 0 && <div className="small faint">운동이 없어요</div>}
          </Link>
        </div>
      ))}
    </div>
  );
}

export function RoutineEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const stored = useStore((s) => s.routines.find((r) => r.id === id));
  const saveRoutine = useStore((s) => s.saveRoutine);
  const deleteRoutine = useStore((s) => s.deleteRoutine);
  const startWorkout = useStore((s) => s.startWorkout);
  const active = useStore((s) => s.active);
  const defaultRest = useStore((s) => s.settings.defaultRestSec);
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Routine>(
    () => stored ?? { id: 'r-' + uid(), name: '', items: [], createdAt: Date.now() },
  );
  const [picking, setPicking] = useState(false);
  const [dirty, setDirty] = useState(isNew);

  useEffect(() => {
    if (!isNew && !stored) navigate('/routines', { replace: true });
  }, [isNew, stored, navigate]);

  const update = (fn: (r: Routine) => Routine) => {
    setDraft(fn);
    setDirty(true);
  };
  const updateItem = (itemId: string, fn: (it: RoutineItem) => RoutineItem) =>
    update((r) => ({ ...r, items: r.items.map((it) => (it.id === itemId ? fn(it) : it)) }));

  const maps = useMaps();
  const [reordering, setReordering] = useState(false);

  const save = () => {
    const r = { ...draft, name: draft.name.trim() || '새 루틴' };
    saveRoutine(r);
    setDirty(false);
    return r;
  };

  return (
    <div className="page">
      <div className="page-head">
        <button
          className="icon-btn"
          onClick={async () => {
            if (
              !dirty ||
              (await ask({ title: '저장하지 않고 나갈까요?', message: '바꾼 내용이 사라져요.', ok: '나가기', cancel: '계속 편집', danger: true }))
            )
              navigate(-1);
          }}
          aria-label="뒤로"
        >
          <Icon name="back" />
        </button>
        <h1 className="small">{isNew ? '새 루틴' : '루틴 편집'}</h1>
        <button
          className="btn primary sm"
          onClick={() => {
            save();
            navigate('/routines', { replace: true });
          }}
        >
          저장
        </button>
      </div>

      <input
        value={draft.name}
        onChange={(e) => update((r) => ({ ...r, name: e.target.value }))}
        placeholder="루틴 이름 (예: 등·이두 데이)"
        style={{ fontSize: 18, fontWeight: 700, background: 'var(--surface)', marginBottom: 14 }}
        autoFocus={isNew}
      />

      <RoutineSummary r={draft} />

      {draft.items.length > 1 && (
        <div className="section-title" style={{ marginTop: 0 }}>
          운동 {draft.items.length}개
          <button className="btn ghost sm" onClick={() => setReordering(true)}>
            <Icon name="sort" size={16} /> 순서 변경
          </button>
        </div>
      )}
      {draft.items.map((it, i) => (
        <RoutineItemCard
          key={it.id}
          item={it}
          first={i === 0}
          last={i === draft.items.length - 1}
          onChange={(fn) => updateItem(it.id, fn)}
          onMove={(dir) =>
            update((r) => {
              const items = [...r.items];
              const j = i + dir;
              [items[i], items[j]] = [items[j], items[i]];
              return { ...r, items };
            })
          }
          onRemove={() => update((r) => ({ ...r, items: r.items.filter((x) => x.id !== it.id) }))}
          onReorder={() => setReordering(true)}
        />
      ))}

      {reordering && (
        <ReorderSheet
          items={draft.items.map((it) => {
            const v = it.variantId ? maps.v.get(it.variantId) : undefined;
            return { id: it.id, title: maps.ex.get(it.exerciseId)?.name ?? '운동', sub: `${it.sets.length}세트 · ${v ? variantName(v) : '운동할 때 고르기'}` };
          })}
          onSave={(ids) =>
            update((r) => {
              const byId = new Map(r.items.map((x) => [x.id, x]));
              return { ...r, items: ids.map((id) => byId.get(id)!).filter(Boolean) };
            })
          }
          onClose={() => setReordering(false)}
        />
      )}

      <button className="btn soft block" onClick={() => setPicking(true)}>
        <Icon name="plus" size={18} /> 운동 추가
      </button>

      {!isNew && (
        <>
          <button
            className="btn primary block"
            style={{ marginTop: 10 }}
            disabled={!!active || draft.items.length === 0}
            onClick={() => {
              const r = save();
              startWorkout({ routineId: r.id });
              navigate('/workout');
            }}
          >
            <Icon name="play" size={16} /> 이 루틴으로 운동 시작
          </button>
          <button
            className="btn danger block"
            style={{ marginTop: 10 }}
            onClick={async () => {
              if (await ask({ title: '루틴 삭제', message: '이 루틴을 삭제할까요? 지난 운동 기록은 남아 있어요.', ok: '삭제', danger: true })) {
                deleteRoutine(draft.id);
                navigate('/routines', { replace: true });
              }
            }}
          >
            루틴 삭제
          </button>
        </>
      )}

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            const vs = useStore.getState().variants;
            update((r) => ({
              ...r,
              items: [
                ...r.items,
                ...ids.map((exerciseId) => {
                  // 기구가 하나뿐이거나 프리웨이트만 있으면 기본값으로, 머신이 섞여 있으면 "운동할 때 고르기"
                  const variantId = defaultVariantId(vs.filter((v) => v.exerciseId === exerciseId && !v.archived));
                  return {
                    id: uid(),
                    exerciseId,
                    variantId,
                    restSec: defaultRest,
                    sets: Array.from({ length: 3 }, () => ({ weight: null, reps: null, time: null })),
                  };
                }),
              ],
            }));
          }}
        />
      )}
    </div>
  );
}

function RoutineItemCard({
  item,
  first,
  last,
  onChange,
  onMove,
  onRemove,
  onReorder,
}: {
  item: RoutineItem;
  first: boolean;
  last: boolean;
  onChange: (fn: (it: RoutineItem) => RoutineItem) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onReorder: () => void;
}) {
  const maps = useMaps();
  const gyms = useStore((s) => s.gyms);
  const exercise = maps.ex.get(item.exerciseId);
  const variant = item.variantId ? maps.v.get(item.variantId) : undefined;
  const track = exercise?.track ?? 'weight';
  const [menu, setMenu] = useState(false);
  const [restMenu, setRestMenu] = useState(false);
  const [pickVariant, setPickVariant] = useState(false);
  const [replacing, setReplacing] = useState(false);

  /** 다른 운동으로 교체: 세트 수·횟수·휴식은 유지, 무게는 기구가 달라지므로 비움 */
  const replaceWith = (exerciseId: string) => {
    const vs = useStore.getState().variants.filter((v) => v.exerciseId === exerciseId && !v.archived);
    onChange((it) => ({
      ...it,
      exerciseId,
      variantId: defaultVariantId(vs),
      sets: it.sets.map((s) => ({ ...s, weight: null })),
    }));
  };

  return (
    <div className="ex-card">
      <div className="ex-card-head">
        <div className="grow">
          <div className="ex-name">{exercise?.name}</div>
          <div className="variant-row">
            <button className="variant-btn" onClick={() => setPickVariant(true)}>
              <Icon name="swap" size={15} />
              <span>{variant ? variantName(variant, gyms) : '운동할 때 고르기'}</span>
            </button>
            <GripChip
              grip={item.grip}
              hint={`${exercise?.name ?? ''} 그립`}
              onChange={(g) =>
                onChange((it) => {
                  const { grip: _old, ...rest } = it;
                  return g ? { ...rest, grip: g } : rest;
                })
              }
            />
          </div>
        </div>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="메뉴">
          <Icon name="more" />
        </button>
      </div>
      <table className="sets">
        <thead>
          <tr>
            <th style={{ width: 40 }}>세트</th>
            {track === 'weight' && <th>목표 {unitLabel(variant?.unit)}</th>}
            {track !== 'time' && <th>목표 회</th>}
            {track === 'time' && <th>목표 시간</th>}
            <th style={{ width: 42 }} />
          </tr>
        </thead>
        <tbody>
          {item.sets.map((s, i) => {
            const setAt = (patch: Partial<typeof s>) =>
              onChange((it) => ({ ...it, sets: it.sets.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
            return (
              <tr key={i}>
                <td>
                  <span className="set-no" style={{ display: 'inline-grid', placeItems: 'center' }}>
                    {i + 1}
                  </span>
                </td>
                {track === 'weight' && (
                  <td>
                    <NumInput value={s.weight} placeholder={variant ? '-' : '기구별'} onChange={(v) => setAt({ weight: v })} />
                  </td>
                )}
                {track !== 'time' && (
                  <td>
                    <NumInput value={s.reps} decimal={false} placeholder="-" onChange={(v) => setAt({ reps: v })} />
                  </td>
                )}
                {track === 'time' && (
                  <td>
                    <TimeInput value={s.time} onChange={(v) => setAt({ time: v })} />
                  </td>
                )}
                <td>
                  <button
                    className="icon-btn"
                    style={{ width: 34, height: 34 }}
                    onClick={() => onChange((it) => ({ ...it, sets: it.sets.filter((_, j) => j !== i) }))}
                    aria-label="세트 삭제"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!variant && track === 'weight' && (
        <div className="tiny faint" style={{ padding: '0 6px' }}>
          기구를 정하지 않으면 목표 무게 대신 그날 고른 기구의 지난 무게가 힌트로 보여요.
        </div>
      )}
      <div className="ex-foot">
        <button
          className="btn sm"
          onClick={() =>
            onChange((it) => ({ ...it, sets: [...it.sets, it.sets[it.sets.length - 1] ?? { weight: null, reps: null, time: null }] }))
          }
        >
          <Icon name="plus" size={16} /> 세트 추가
        </button>
        <button className="btn sm" onClick={() => setRestMenu(true)}>
          <Icon name="timer" size={16} /> {fmtRest(item.restSec)}
        </button>
      </div>

      {menu && (
        <ActionSheet
          title={exercise?.name ?? ''}
          onClose={() => setMenu(false)}
          actions={[
            { label: '운동 바꾸기', onClick: () => setReplacing(true) },
            ...(!(first && last) ? [{ label: '순서 바꾸기…', onClick: onReorder }] : []),
            ...(!first ? [{ label: '위로 이동', onClick: () => onMove(-1) }] : []),
            ...(!last ? [{ label: '아래로 이동', onClick: () => onMove(1) }] : []),
            { label: '운동 삭제', danger: true, onClick: onRemove },
          ]}
        />
      )}
      {restMenu && (
        <RestPicker value={item.restSec} onPick={(sec) => onChange((it) => ({ ...it, restSec: sec }))} onClose={() => setRestMenu(false)} />
      )}
      {replacing && (
        <ExercisePicker
          single
          title={`${exercise?.name ?? '운동'} 대신 할 운동`}
          excludeId={item.exerciseId}
          onPick={([id]) => id && replaceWith(id)}
          onClose={() => setReplacing(false)}
        />
      )}
      {pickVariant && (
        <VariantPicker
          exerciseId={item.exerciseId}
          currentId={item.variantId}
          gymId={null}
          allowNone
          onPick={(vid) =>
            onChange((it) => ({
              ...it,
              variantId: vid,
              // 기구가 바뀌면 목표 무게는 의미가 달라지므로 비웁니다.
              sets: vid !== it.variantId ? it.sets.map((x) => ({ ...x, weight: null })) : it.sets,
            }))
          }
          onClose={() => setPickVariant(false)}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ask, askText } from '../components/Dialog';
import { ExercisePicker } from '../components/ExercisePicker';
import { GripChip, gripText, withRo } from '../components/GripPicker';
import { Icon } from '../components/Icon';
import { NumInput, TimeInput } from '../components/NumInput';
import { ReorderSheet } from '../components/ReorderSheet';
import { RestPicker } from '../components/RestPicker';
import { ActionSheet } from '../components/Sheet';
import { VariantForm } from '../components/VariantForm';
import { VariantPicker } from '../components/VariantPicker';
import { findPrevious, loadMode } from '../lib/stats';
import { unlockAudio } from '../lib/sound';
import { fmtDuration, fmtNum, fmtRest, fmtShortDate, unitLabel, variantName } from '../lib/util';
import { useMaps, useStore } from '../store';
import type { SetEntry, SetKind, WorkoutExercise } from '../types';


export function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tnum">{fmtDuration((now - since) / 1000)}</span>;
}

export function ActiveWorkout() {
  const active = useStore((s) => s.active);
  const gyms = useStore((s) => s.gyms);
  const renameActive = useStore((s) => s.renameActive);
  const addExercises = useStore((s) => s.addExercises);
  const setActiveGym = useStore((s) => s.setActiveGym);
  const addGym = useStore((s) => s.addGym);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const setActiveBodyweight = useStore((s) => s.setActiveBodyweight);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [gymMenu, setGymMenu] = useState(false);
  const [reordering, setReordering] = useState(false);
  const reorderEntries = useStore((s) => s.reorderEntries);
  const maps = useMaps();

  if (!active) return <Navigate to="/" replace />;
  const gym = gyms.find((g) => g.id === active.gymId);
  // 맨몸·어시스트 운동이 있으면 체중이 볼륨에 필요
  const needsBw = active.exercises.some(
    (e) => loadMode(e, maps.ex.get(e.exerciseId), e.variantId ? maps.v.get(e.variantId) : undefined) !== 'external',
  );

  const askBodyweight = async () => {
    const v = await askText({
      title: '오늘 체중',
      message: '풀업·딥스 같은 맨몸 운동 볼륨(체중 × 횟수)에 써요. 다음 운동엔 이 값이 미리 채워져요.',
      value: active.bodyweightKg ? String(active.bodyweightKg) : '',
      placeholder: '예: 72.5',
      ok: '저장',
      allowEmpty: true,
      decimal: true,
    });
    if (v === null) return;
    const n = Number(v.replace(',', '.').replace(/[^0-9.]/g, ''));
    setActiveBodyweight(v.trim() && Number.isFinite(n) && n > 20 && n < 300 ? Math.round(n * 10) / 10 : null);
  };

  const finish = async () => {
    const pending = active.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
    const doneCount = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    if (doneCount === 0) {
      const ok = await ask({
        title: '완료한 세트가 없어요',
        message: '이 운동을 기록하지 않고 닫을까요?',
        ok: '기록 없이 닫기',
        cancel: '계속하기',
        danger: true,
      });
      if (ok) {
        discardWorkout();
        navigate('/', { replace: true });
      }
      return;
    }
    if (
      pending > 0 &&
      !(await ask({
        title: '운동을 끝낼까요?',
        message: `체크하지 않은 세트 ${pending}개는 저장되지 않아요.`,
        ok: '운동 끝내기',
        cancel: '계속하기',
      }))
    )
      return;
    const id = finishWorkout();
    if (id) navigate(`/history/${id}?done=1`, { replace: true });
  };

  const cancelWorkout = async () => {
    const ok = await ask({
      title: '운동을 취소할까요?',
      message: '입력한 내용이 모두 사라지고 기록에 남지 않아요.',
      ok: '운동 취소',
      cancel: '계속하기',
      danger: true,
    });
    if (ok) {
      discardWorkout();
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="최소화">
          <Icon name="down" />
        </button>
        <div className="grow">
          <input
            value={active.name}
            onChange={(e) => renameActive(e.target.value)}
            style={{ background: 'transparent', padding: '2px 0', fontSize: 17, fontWeight: 700 }}
            aria-label="운동 이름"
          />
          <div className="tiny muted">
            <Elapsed since={active.startedAt} />
          </div>
        </div>
        <button className="btn ok sm" onClick={finish}>
          완료
        </button>
      </div>

      <div className="chips" style={{ marginBottom: 12 }}>
        <button className="chip" onClick={() => setGymMenu(true)}>
          <Icon name="pin" size={15} />
          {gym ? gym.name : '헬스장 선택'}
          <Icon name="down" size={14} />
        </button>
        <button
          className="chip"
          onClick={askBodyweight}
          style={needsBw && !active.bodyweightKg ? { color: 'var(--warn)', borderColor: 'var(--warn)' } : undefined}
        >
          <Icon name="scale" size={15} />
          {active.bodyweightKg ? `체중 ${active.bodyweightKg}kg` : '오늘 체중'}
        </button>
      </div>
      {!gym && gyms.length === 0 && (
        <p className="tiny faint" style={{ margin: '-6px 2px 12px' }}>
          헬스장을 정해 두면 그곳에서 쓰던 기구를 자동으로 골라 줘요.
        </p>
      )}

      {active.exercises.length > 1 && (
        <div className="section-title" style={{ marginTop: 0 }}>
          운동 {active.exercises.length}개
          <button className="btn ghost sm" onClick={() => setReordering(true)}>
            <Icon name="sort" size={16} /> 순서 변경
          </button>
        </div>
      )}
      {active.exercises.map((e, i) => (
        <ExerciseCard
          key={e.id}
          entry={e}
          index={i}
          total={active.exercises.length}
          gymId={active.gymId}
          bw={active.bodyweightKg ?? null}
          onAskBw={askBodyweight}
          onReorder={() => setReordering(true)}
        />
      ))}
      {reordering && (
        <ReorderSheet
          items={active.exercises.map((e) => {
            const v = e.variantId ? maps.v.get(e.variantId) : undefined;
            const done = e.sets.filter((s) => s.done).length;
            return {
              id: e.id,
              title: maps.ex.get(e.exerciseId)?.name ?? '운동',
              sub: `${done}/${e.sets.length}세트 완료 · ${v ? variantName(v, gyms) : '기구 미지정'}`,
            };
          })}
          onSave={reorderEntries}
          onClose={() => setReordering(false)}
        />
      )}

      {active.exercises.length === 0 && (
        <div className="empty">
          아직 운동이 없어요.
          <br />
          아래 버튼으로 오늘 할 운동을 추가하세요.
        </div>
      )}

      <button className="btn soft block" style={{ marginTop: 4 }} onClick={() => setPicking(true)}>
        <Icon name="plus" size={18} /> 운동 추가
      </button>
      <button className="btn danger block" style={{ marginTop: 10 }} onClick={cancelWorkout}>
        운동 취소
      </button>

      {picking && <ExercisePicker onPick={addExercises} onClose={() => setPicking(false)} />}
      {gymMenu && (
        <ActionSheet
          title="오늘 운동하는 헬스장"
          onClose={() => setGymMenu(false)}
          actions={[
            ...gyms.map((g) => ({ label: g.name, active: g.id === active.gymId, onClick: () => setActiveGym(g.id) })),
            { label: '선택 안 함', active: active.gymId == null, onClick: () => setActiveGym(null) },
            {
              label: '+ 새 헬스장 추가',
              onClick: async () => {
                const name = await askText({ title: '새 헬스장', placeholder: '예: 회사 앞 OO짐', ok: '추가' });
                if (name) setActiveGym(addGym(name));
              },
            },
          ]}
        />
      )}
    </div>
  );
}

const KIND_LABEL: Record<SetKind, string> = { normal: '일반 세트', warmup: '워밍업', drop: '드롭 세트', failure: '실패 지점까지' };
const KIND_SHORT: Record<SetKind, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' };

function ExerciseCard({
  entry,
  index,
  total,
  gymId,
  bw,
  onAskBw,
  onReorder,
}: {
  entry: WorkoutExercise;
  index: number;
  total: number;
  gymId: string | null;
  bw: number | null;
  onAskBw: () => void;
  onReorder: () => void;
}) {
  const maps = useMaps();
  const workouts = useStore((s) => s.workouts);
  const gyms = useStore((s) => s.gyms);
  const a = useStore.getState;
  const exercise = maps.ex.get(entry.exerciseId);
  const variant = entry.variantId ? maps.v.get(entry.variantId) : undefined;
  const track = exercise?.track ?? 'weight';
  const unit = variant?.unit ?? 'kg';

  const [menu, setMenu] = useState(false);
  const [restMenu, setRestMenu] = useState(false);
  const [pickVariant, setPickVariant] = useState(false);
  const [editVariant, setEditVariant] = useState(false);
  const [setMenuFor, setSetMenuFor] = useState<SetEntry | null>(null);
  const [replacing, setReplacing] = useState(false);

  const replaceWith = async (exerciseId: string) => {
    const done = entry.sets.filter((s) => s.done).length;
    if (
      done > 0 &&
      !(await ask({
        title: '운동 바꾸기',
        message: `완료한 ${done}세트는 ${exercise?.name ?? '지금 운동'} 기록으로 남기고, 바로 아래에 새 운동을 추가할게요.`,
        ok: '바꾸기',
      }))
    )
      return;
    a().replaceEntry(entry.id, exerciseId);
  };
  const [showNote, setShowNote] = useState(!!entry.note);

  const prev = useMemo(
    () => findPrevious(workouts, entry.exerciseId, entry.variantId, entry.grip),
    [workouts, entry.exerciseId, entry.variantId, entry.grip],
  );
  const prevSets = prev?.entry.sets.filter((s) => s.done) ?? [];

  // 세트 번호: 워밍업은 W, 나머지는 1부터
  let n = 0;
  const labels = entry.sets.map((s) => (s.kind === 'warmup' ? 'W' : String(++n)));

  const check = (s: SetEntry) => {
    unlockAudio();
    const nowDone = a().toggleSet(entry.id, s.id);
    if (nowDone && entry.restSec > 0) a().startRest(entry.restSec, exercise?.name ?? '');
  };

  /** 마지막 세트 빼기. 완료한 세트면 한 번 물어봄 */
  const removeLastSet = async () => {
    const last = entry.sets[entry.sets.length - 1];
    if (!last || entry.sets.length <= 1) return;
    if (last.done && !(await ask({ title: '완료한 세트예요', message: '마지막 세트를 지울까요?', ok: '지우기', danger: true }))) return;
    a().removeSet(entry.id, last.id);
  };

  const fillFromPrev = (s: SetEntry, p: SetEntry) => a().updateSet(entry.id, s.id, { weight: p.weight, reps: p.reps, time: p.time });

  return (
    <div className="ex-card">
      <div className="ex-card-head">
        <div className="grow">
          <div className="ex-name">{exercise?.name ?? '삭제된 운동'}</div>
          <div className="variant-row">
            <button className={'variant-btn' + (variant ? '' : ' unset')} onClick={() => setPickVariant(true)}>
              <Icon name="swap" size={15} />
              <span>{variant ? variantName(variant, gyms) : '어떤 기구인가요? 선택'}</span>
            </button>
            <GripChip grip={entry.grip} onChange={(g) => a().setEntryGrip(entry.id, g)} hint={`${exercise?.name ?? ''} 그립`} />
          </div>
        </div>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="운동 메뉴">
          <Icon name="more" />
        </button>
      </div>

      {variant?.memo && (
        <button className="memo-line" onClick={() => setEditVariant(true)}>
          <Icon name="settings" size={14} />
          <span className="grow">{variant.memo}</span>
        </button>
      )}
      {prev && (
        <div className="tiny faint" style={{ padding: '4px 6px 0' }}>
          이 기구{entry.grip ? ` · ${gripText(entry.grip)}` : ''} 지난 기록 · {fmtShortDate(prev.workout.startedAt)}
        </div>
      )}
      {!bw && loadMode(entry, exercise, variant) !== 'external' && (
        <button className="tiny" style={{ display: 'block', padding: '4px 6px 0', color: 'var(--warn)', textAlign: 'left' }} onClick={onAskBw}>
          오늘 체중을 입력하면 이 운동도 볼륨에 들어가요 ›
        </button>
      )}
      {!prev && variant && (
        <div className="tiny faint" style={{ padding: '4px 6px 0' }}>
          {entry.grip ? `이 기구 · ${withRo(gripText(entry.grip))}는 첫 기록이에요` : '이 기구로는 첫 기록이에요'}
        </div>
      )}

      <table className="sets">
        <thead>
          <tr>
            <th style={{ width: 40 }}>세트</th>
            <th>이전</th>
            {track === 'weight' && <th style={{ width: 76 }}>{unitLabel(unit)}</th>}
            {track !== 'time' && <th style={{ width: 76 }}>회</th>}
            {track === 'time' && <th style={{ width: 90 }}>시간</th>}
            <th style={{ width: 42 }}>
              <Icon name="check" size={14} />
            </th>
          </tr>
        </thead>
        <tbody>
          {entry.sets.map((s, i) => {
            const p = prevSets[i];
            const above = entry.sets[i - 1];
            const lastPrev = prevSets[prevSets.length - 1];
            // 힌트: 지난번 같은 세트 → 바로 위 세트 → 지난번 마지막 세트
            const phW = p?.weight ?? above?.weight ?? lastPrev?.weight ?? null;
            const phR = p?.reps ?? above?.reps ?? lastPrev?.reps ?? null;
            return (
              <tr key={s.id} className={s.done ? 'done' : ''}>
                <td>
                  <button className={'set-no ' + s.kind} onClick={() => setSetMenuFor(s)} aria-label={`세트 ${labels[i]} 메뉴`}>
                    {s.kind === 'normal' || s.kind === 'warmup' ? labels[i] : KIND_SHORT[s.kind]}
                  </button>
                </td>
                <td>
                  {p ? (
                    <button className="prev-cell" onClick={() => fillFromPrev(s, p)} title="이전 값 채우기">
                      {track === 'time'
                        ? fmtDuration(p.time ?? 0)
                        : track === 'reps'
                          ? `${p.reps ?? '-'}회`
                          : `${fmtNum(p.weight) || 0}×${p.reps ?? '-'}`}
                    </button>
                  ) : (
                    <span className="prev-cell">–</span>
                  )}
                </td>
                {track === 'weight' && (
                  <td>
                    <NumInput
                      value={s.weight}
                      placeholder={phW != null ? fmtNum(phW) : unit === 'level' ? '칸' : '0'}
                      onChange={(v) => a().updateSet(entry.id, s.id, { weight: v })}
                      ariaLabel={`${labels[i]}세트 무게`}
                    />
                  </td>
                )}
                {track !== 'time' && (
                  <td>
                    <NumInput
                      value={s.reps}
                      decimal={false}
                      placeholder={phR != null ? String(phR) : '0'}
                      onChange={(v) => a().updateSet(entry.id, s.id, { reps: v })}
                      ariaLabel={`${labels[i]}세트 횟수`}
                    />
                  </td>
                )}
                {track === 'time' && (
                  <td>
                    <TimeInput
                      value={s.time}
                      placeholder={p?.time != null ? fmtDuration(p.time) : '0:00'}
                      onChange={(v) => a().updateSet(entry.id, s.id, { time: v })}
                    />
                  </td>
                )}
                <td>
                  <button className={'check' + (s.done ? ' on' : '')} onClick={() => check(s)} aria-label="세트 완료">
                    <Icon name="check" size={18} stroke={2.6} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showNote && (
        <textarea
          style={{ marginTop: 6, minHeight: 50 }}
          placeholder="이 운동 메모 (예: 그립 넓게, 왼쪽 어깨 조심)"
          value={entry.note ?? ''}
          onChange={(e) => a().setEntryNote(entry.id, e.target.value)}
        />
      )}

      <div className="ex-foot">
        <button className="btn sm minus" onClick={removeLastSet} disabled={entry.sets.length <= 1} aria-label="마지막 세트 빼기">
          <Icon name="minus" size={16} />
        </button>
        <button className="btn sm" onClick={() => a().addSet(entry.id)}>
          <Icon name="plus" size={16} /> 세트 추가
        </button>
        <button className="btn sm" onClick={() => setRestMenu(true)}>
          <Icon name="timer" size={16} /> {fmtRest(entry.restSec)}
        </button>
      </div>

      {menu && (
        <ActionSheet
          title={exercise?.name ?? ''}
          onClose={() => setMenu(false)}
          actions={[
            { label: '운동 바꾸기', onClick: () => setReplacing(true) },
            { label: '기구 바꾸기', onClick: () => setPickVariant(true) },
            ...(variant ? [{ label: '기구 세팅 메모 수정', onClick: () => setEditVariant(true) }] : []),
            { label: showNote ? '메모 숨기기' : '메모 추가', onClick: () => setShowNote((v) => !v) },
            { label: `휴식 시간 (${fmtRest(entry.restSec)})`, onClick: () => setRestMenu(true) },
            ...(total > 1 ? [{ label: '순서 바꾸기…', onClick: onReorder }] : []),
            ...(index > 0 ? [{ label: '위로 이동', onClick: () => a().moveEntry(entry.id, -1) }] : []),
            ...(index < total - 1 ? [{ label: '아래로 이동', onClick: () => a().moveEntry(entry.id, 1) }] : []),
            {
              label: '운동 삭제',
              danger: true,
              onClick: async () => {
                if (
                  !entry.sets.some((s) => s.done) ||
                  (await ask({
                    title: `${exercise?.name ?? '운동'} 삭제`,
                    message: '완료한 세트가 있어요. 이 운동을 오늘 기록에서 뺄까요?',
                    ok: '삭제',
                    danger: true,
                  }))
                )
                  a().removeEntry(entry.id);
              },
            },
          ]}
        />
      )}
      {restMenu && (
        <RestPicker value={entry.restSec} onPick={(sec) => a().setEntryRest(entry.id, sec)} onClose={() => setRestMenu(false)} />
      )}
      {setMenuFor && (
        <ActionSheet
          title={`세트 ${labels[entry.sets.indexOf(setMenuFor)] ?? ''}`}
          onClose={() => setSetMenuFor(null)}
          actions={[
            ...(['normal', 'warmup', 'drop', 'failure'] as SetKind[]).map((k) => ({
              label: KIND_LABEL[k],
              active: setMenuFor.kind === k,
              onClick: () => a().updateSet(entry.id, setMenuFor.id, { kind: k }),
            })),
            { label: '세트 삭제', danger: true, onClick: () => a().removeSet(entry.id, setMenuFor.id) },
          ]}
        />
      )}
      {replacing && (
        <ExercisePicker
          single
          title={`${exercise?.name ?? '운동'} 대신 할 운동`}
          excludeId={entry.exerciseId}
          onPick={([id]) => id && void replaceWith(id)}
          onClose={() => setReplacing(false)}
        />
      )}
      {pickVariant && (
        <VariantPicker
          exerciseId={entry.exerciseId}
          currentId={entry.variantId}
          gymId={gymId}
          onPick={(id) => a().setEntryVariant(entry.id, id)}
          onClose={() => setPickVariant(false)}
        />
      )}
      {editVariant && variant && (
        <VariantForm exerciseId={entry.exerciseId} variant={variant} onClose={() => setEditVariant(false)} />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ask } from '../components/Dialog';
import { ExerciseForm, MatchHint, MuscleChips, SearchBox, useExerciseSearch } from '../components/ExercisePicker';
import { exerciseEnglishName } from '../data/aliases';
import { userAliases } from '../lib/search';
import { Icon } from '../components/Icon';
import { LineChart, type Point } from '../components/LineChart';
import { VariantForm } from '../components/VariantForm';
import { summarizeVariant, topSet, variantSessions, type VariantSummary } from '../lib/stats';
import { fmtDate, fmtDuration, fmtNum, fmtSet, fmtShortDate, unitLabel, variantDetail, variantTitle } from '../lib/util';
import { useMaps, useStore } from '../store';
import { GRIP_LABEL, type Grip, type MuscleGroup, type Variant } from '../types';
import { MUSCLE_LABEL, MUSCLE_ORDER } from '../types';

// ─── 운동 목록 ───────────────────────────────────────────────
export function Library() {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const { list, hints } = useExerciseSearch(q, muscle);
  const variants = useStore((s) => s.variants);
  const workouts = useStore((s) => s.workouts);
  const navigate = useNavigate();

  const meta = useMemo(() => {
    const m = new Map<string, { brands: string[]; count: number; used: number }>();
    for (const v of variants) {
      if (v.archived) continue;
      const x = m.get(v.exerciseId) ?? { brands: [], count: 0, used: 0 };
      x.count++;
      x.brands.push(variantTitle(v));
      m.set(v.exerciseId, x);
    }
    for (const w of workouts) for (const e of w.exercises) if (m.has(e.exerciseId)) m.get(e.exerciseId)!.used++;
    return m;
  }, [variants, workouts]);

  const groups = MUSCLE_ORDER.map((mg) => ({ mg, items: list.filter((x) => x.muscle === mg) })).filter((g) => g.items.length);

  return (
    <div className="page">
      <div className="page-head">
        <h1>운동</h1>
        <button className="btn primary sm" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> 새 운동
        </button>
      </div>
      <SearchBox value={q} onChange={setQ} placeholder="예: 로우, seated row, hammer, 사레레" />
      <div style={{ margin: '10px 0 4px' }}>
        <MuscleChips value={muscle} onChange={setMuscle} />
      </div>

      {groups.map((g) => (
        <div key={g.mg}>
          <div className="section-title">{MUSCLE_LABEL[g.mg]}</div>
          <div className="list">
            {g.items.map((x) => {
              const mt = meta.get(x.id);
              return (
                <Link key={x.id} to={`/exercises/${x.id}`} className="list-item">
                  <div className="grow">
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <span className="title">{x.name}</span>
                      {mt && mt.used > 0 && <span className="tag ok">{mt.used}회</span>}
                      <MatchHint text={hints.get(x.id)} />
                    </div>
                    <div className="sub ellipsis">
                      {mt ? (mt.count > 1 ? `기구 ${mt.count}종 · ${mt.brands.slice(0, 4).join(', ')}${mt.count > 4 ? ' …' : ''}` : mt.brands[0]) : '기구 없음'}
                    </div>
                  </div>
                  <Icon name="chevron" size={18} />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {list.length === 0 && <div className="empty">검색 결과가 없어요.</div>}

      {creating && <ExerciseForm onClose={() => setCreating(false)} onSaved={(id) => navigate(`/exercises/${id}`)} />}
    </div>
  );
}

// ─── 운동 상세: 기구별 비교 ──────────────────────────────────
export function ExerciseDetail() {
  const { id = '' } = useParams();
  const exercise = useStore((s) => s.exercises.find((x) => x.id === id));
  const allVariants = useStore((s) => s.variants);
  const workouts = useStore((s) => s.workouts);
  const gyms = useStore((s) => s.gyms);
  const updateExercise = useStore((s) => s.updateExercise);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showUnused, setShowUnused] = useState(false);

  const rows = useMemo(() => {
    const track = exercise?.track ?? 'weight';
    return allVariants
      .filter((v) => v.exerciseId === id)
      .map((v) => ({ v, sum: summarizeVariant(variantSessions(workouts, v.id), track) }));
  }, [allVariants, workouts, id, exercise?.track]);

  if (!exercise) return <div className="empty">운동을 찾을 수 없어요.</div>;

  const englishName = exerciseEnglishName(exercise.id) ?? userAliases(exercise)[0];
  const used = rows.filter((r) => r.sum.sessions > 0).sort((a, b) => (b.sum.lastAt ?? 0) - (a.sum.lastAt ?? 0));
  const unused = rows.filter((r) => r.sum.sessions === 0);
  const unusedVisible = unused.filter((r) => !r.v.archived);
  const unusedHidden = unused.filter((r) => r.v.archived);
  const maxByUnit = new Map<string, number>();
  for (const r of used) if (r.sum.maxWeight != null) maxByUnit.set(r.v.unit, Math.max(maxByUnit.get(r.v.unit) ?? 0, r.sum.maxWeight));

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로">
          <Icon name="back" />
        </button>
        <div className="grow">
          <h1 className="small">{exercise.name}</h1>
          {englishName && <div className="tiny muted">{englishName}</div>}
        </div>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="운동 수정">
          <Icon name="edit" />
        </button>
      </div>
      <div className="row" style={{ gap: 6, marginBottom: 6 }}>
        <span className="tag">{MUSCLE_LABEL[exercise.muscle]}</span>
        <span className="tag">{exercise.track === 'weight' ? '무게 × 횟수' : exercise.track === 'reps' ? '횟수' : '시간'}</span>
        {exercise.archived && <span className="tag warn">숨김</span>}
      </div>

      <div className="section-title">
        기구별 기록
        <button className="btn ghost sm" onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> 기구 등록
        </button>
      </div>
      {used.length === 0 ? (
        <div className="card small muted">아직 기록이 없어요. 운동할 때 기구를 고르고 기록하면 기구별로 최고 기록이 쌓여요.</div>
      ) : (
        <>
          {used.map((r) => (
            <VariantCard key={r.v.id} v={r.v} sum={r.sum} track={exercise.track} max={maxByUnit.get(r.v.unit)} gymName={gyms.find((g) => g.id === r.v.gymId)?.name} />
          ))}
          {used.length > 1 && exercise.track === 'weight' && (
            <p className="tiny faint" style={{ margin: '4px 2px 0' }}>
              막대는 같은 단위 기구 중 최고 무게 대비 비율이에요. 기구마다 무게감이 달라 숫자를 직접 비교하긴 어려워요.
            </p>
          )}
        </>
      )}

      {unusedVisible.length > 0 && (
        <>
          <button className="section-title" style={{ width: '100%' }} onClick={() => setShowUnused((s) => !s)}>
            <span>기록 없는 기구 {unusedVisible.length}개</span>
            <Icon name={showUnused ? 'up' : 'down'} size={16} />
          </button>
          {showUnused && (
            <div className="list">
              {unusedVisible.map(({ v }) => (
                <Link key={v.id} to={`/exercises/${id}/v/${encodeURIComponent(v.id)}`} className="list-item">
                  <div className="grow">
                    <div className="title">{variantTitle(v)}</div>
                    <div className="sub">{[variantDetail(v), gyms.find((g) => g.id === v.gymId)?.name].filter(Boolean).join(' · ') || ' '}</div>
                  </div>
                  <Icon name="chevron" size={18} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {unusedHidden.length > 0 && (
        <p className="tiny faint" style={{ margin: '14px 2px 0' }}>
          숨긴 기구 {unusedHidden.length}개:{' '}
          {unusedHidden.map(({ v }, i) => (
            <span key={v.id}>
              {i > 0 && ', '}
              <Link to={`/exercises/${id}/v/${encodeURIComponent(v.id)}`} style={{ textDecoration: 'underline' }}>
                {variantTitle(v)}
              </Link>
            </span>
          ))}
        </p>
      )}

      {exercise.custom && (
        <button
          className="btn danger block"
          style={{ marginTop: 24 }}
          onClick={async () => {
            if (exercise.archived) updateExercise(exercise.id, { archived: false });
            else if (await ask({ title: '운동 숨기기', message: '이 운동을 목록에서 숨길까요? 기록은 남아 있어요.', ok: '숨기기', danger: true }))
              updateExercise(exercise.id, { archived: true });
          }}
        >
          {exercise.archived ? '다시 표시' : '운동 숨기기'}
        </button>
      )}

      {adding && <VariantForm exerciseId={id} onClose={() => setAdding(false)} onSaved={(vid) => navigate(`/exercises/${id}/v/${encodeURIComponent(vid)}`)} />}
      {editing && <ExerciseForm exercise={exercise} onClose={() => setEditing(false)} />}
    </div>
  );
}

function VariantCard({
  v,
  sum,
  track,
  max,
  gymName,
}: {
  v: Variant;
  sum: VariantSummary;
  track: 'weight' | 'reps' | 'time';
  max?: number;
  gymName?: string;
}) {
  const u = unitLabel(v.unit);
  const detail = variantDetail(v);
  return (
    <Link to={`/exercises/${v.exerciseId}/v/${encodeURIComponent(v.id)}`} className="variant-card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{variantTitle(v)}</span>
            {gymName && <span className="tag">{gymName}</span>}
            {v.archived && <span className="tag warn">숨김</span>}
          </div>
          {detail && <div className="small muted">{detail}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          {track === 'weight' && (
            <div className="vc-best">
              {fmtNum(sum.maxWeight)}
              <span className="small muted">{u}</span>
            </div>
          )}
          {track === 'reps' && <div className="vc-best">{sum.maxReps}회</div>}
          {track === 'time' && <div className="vc-best">{fmtDuration(sum.maxTime ?? 0)}</div>}
          <div className="tiny faint">최고</div>
        </div>
      </div>
      {track === 'weight' && max != null && sum.maxWeight != null && (
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${(sum.maxWeight / max) * 100}%` }} />
        </div>
      )}
      <div className="row tiny muted" style={{ marginTop: 8, gap: 10 }}>
        <span>{sum.sessions}회 수행</span>
        {sum.lastAt && <span>최근 {fmtShortDate(sum.lastAt)}</span>}
        {sum.lastBest && <span className="tnum">최근 {fmtSet(sum.lastBest, track, v.unit)}</span>}
        {track === 'weight' && sum.bestE1rm != null && <span className="tnum">1RM≈{Math.round(sum.bestE1rm)}{u}</span>}
      </div>
    </Link>
  );
}

// ─── 기구 상세 ───────────────────────────────────────────────
type Metric = 'e1rm' | 'max' | 'volume';

export function VariantDetail() {
  const { id = '', vid = '' } = useParams();
  const variantId = decodeURIComponent(vid);
  const exercise = useStore((s) => s.exercises.find((x) => x.id === id));
  const variant = useStore((s) => s.variants.find((x) => x.id === variantId));
  const workouts = useStore((s) => s.workouts);
  const gyms = useStore((s) => s.gyms);
  const updateVariant = useStore((s) => s.updateVariant);
  const navigate = useNavigate();
  const maps = useMaps();
  const [editing, setEditing] = useState(false);
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [memo, setMemo] = useState(variant?.memo ?? '');
  useEffect(() => {
    setMemo(variant?.memo ?? '');
  }, [variant?.memo]);

  const track = exercise?.track ?? 'weight';
  // 이 기구로 쓴 그립들 (2가지 이상이면 그립별로 걸러 볼 수 있게)
  const usedGrips = useMemo(() => {
    const set = new Set<Grip | 'default'>();
    for (const w of workouts) for (const e of w.exercises) if (e.variantId === variantId && e.sets.some((x) => x.done)) set.add(e.grip ?? 'default');
    return [...set];
  }, [workouts, variantId]);
  const [gripFilter, setGripFilter] = useState<Grip | 'default' | 'all'>('all');
  const sessions = useMemo(
    () => variantSessions(workouts, variantId, gripFilter === 'all' ? undefined : gripFilter === 'default' ? null : gripFilter),
    [workouts, variantId, gripFilter],
  );
  const sum = useMemo(() => summarizeVariant(sessions, track), [sessions, track]);

  const points: Point[] = useMemo(() => {
    const u = unitLabel(variant?.unit);
    return [...sessions]
      .reverse()
      .map((s) => {
        const top = topSet(s.sets, track);
        let y: number | null;
        if (track === 'reps') y = s.maxReps;
        else if (track === 'time') y = s.maxTime != null ? s.maxTime / 60 : null;
        else y = metric === 'e1rm' ? s.bestE1rm : metric === 'max' ? s.maxWeight : s.volume;
        return {
          x: s.date,
          y: y ?? NaN,
          date: fmtShortDate(s.date),
          tip: top ? `최고 세트 ${fmtSet(top, track, variant?.unit)}` : u,
        };
      })
      .filter((p) => Number.isFinite(p.y));
  }, [sessions, track, metric, variant?.unit]);

  if (!exercise || !variant) return <div className="empty">기구를 찾을 수 없어요.</div>;
  const u = unitLabel(variant.unit);
  const gymName = gyms.find((g) => g.id === variant.gymId)?.name;
  const chartUnit = track === 'reps' ? '회' : track === 'time' ? '분' : u;

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로">
          <Icon name="back" />
        </button>
        <div className="grow">
          <div className="tiny muted">{exercise.name}</div>
          <h1 className="small">{variantTitle(variant)}</h1>
        </div>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="기구 수정">
          <Icon name="edit" />
        </button>
      </div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {variantDetail(variant) && <span className="tag">{variantDetail(variant)}</span>}
        {gymName && <span className="tag accent">{gymName}</span>}
        <span className="tag">단위 {u}</span>
        {variant.archived && (
          <button className="tag warn" onClick={() => updateVariant(variant.id, { archived: false })}>
            숨김 · 탭해서 다시 표시
          </button>
        )}
      </div>

      <div className="field">
        <label>세팅 메모</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={() => memo !== (variant.memo ?? '') && updateVariant(variant.id, { memo: memo.trim() || undefined })}
          placeholder="예: 시트 4 / 가슴 패드 2 / 손잡이 넓은 쪽"
        />
      </div>

      {usedGrips.length > 1 && (
        <div className="chips wrap" style={{ marginBottom: 10 }}>
          <button className={'chip' + (gripFilter === 'all' ? ' on' : '')} onClick={() => setGripFilter('all')}>
            모든 그립
          </button>
          {usedGrips.map((g) => (
            <button key={g} className={'chip' + (gripFilter === g ? ' on' : '')} onClick={() => setGripFilter(g)}>
              {g === 'default' ? '기본 그립' : GRIP_LABEL[g]}
            </button>
          ))}
        </div>
      )}

      <div className="stats">
        {track === 'weight' ? (
          <>
            <div className="stat">
              <div className="label">최고 무게</div>
              <div className="value">
                {fmtNum(sum.maxWeight) || '-'}
                <small>{u}</small>
              </div>
            </div>
            <div className="stat">
              <div className="label">추정 1RM</div>
              <div className="value">
                {sum.bestE1rm != null ? Math.round(sum.bestE1rm) : '-'}
                <small>{u}</small>
              </div>
            </div>
          </>
        ) : (
          <div className="stat">
            <div className="label">{track === 'reps' ? '최다 횟수' : '최장 시간'}</div>
            <div className="value">{track === 'reps' ? `${sum.maxReps ?? '-'}회` : fmtDuration(sum.maxTime ?? 0)}</div>
          </div>
        )}
        <div className="stat">
          <div className="label">수행</div>
          <div className="value">
            {sum.sessions}
            <small>회</small>
          </div>
        </div>
        <div className="stat">
          <div className="label">최근</div>
          <div className="value" style={{ fontSize: 18 }}>
            {sum.lastAt ? fmtShortDate(sum.lastAt) : '-'}
          </div>
          {sum.lastBest && <div className="foot tnum">{fmtSet(sum.lastBest, track, variant.unit)}</div>}
        </div>
      </div>

      {points.length > 0 && (
        <>
          <div className="section-title">추이</div>
          <div className="card" style={{ padding: '12px 8px 6px' }}>
            {track === 'weight' && (
              <div className="seg" style={{ margin: '0 6px 10px' }}>
                <button className={metric === 'e1rm' ? 'on' : ''} onClick={() => setMetric('e1rm')}>
                  추정 1RM
                </button>
                <button className={metric === 'max' ? 'on' : ''} onClick={() => setMetric('max')}>
                  최고 무게
                </button>
                <button className={metric === 'volume' ? 'on' : ''} onClick={() => setMetric('volume')}>
                  볼륨
                </button>
              </div>
            )}
            <LineChart points={points} unit={chartUnit} />
          </div>
        </>
      )}

      <div className="section-title">기록 {sessions.length > 0 && `(${sessions.length})`}</div>
      {sessions.length === 0 && <div className="card small muted">이 기구로 한 기록이 아직 없어요.</div>}
      {sessions.map((s) => {
        const w = workouts.find((x) => x.id === s.workoutId);
        const grips = [...new Set(w?.exercises.filter((e) => e.variantId === variantId).map((e) => e.grip).filter(Boolean) as Grip[])];
        return (
          <Link key={s.workoutId} to={`/history/${s.workoutId}`} className="card" style={{ display: 'block' }}>
            <div className="row small">
              <span style={{ fontWeight: 600 }}>{fmtDate(s.date)}</span>
              {grips.map((g) => (
                <span key={g} className="tag">
                  {GRIP_LABEL[g]}
                </span>
              ))}
              <span className="grow" />
              <span className="faint ellipsis">{w?.gymId ? maps.gym.get(w.gymId)?.name : ''}</span>
            </div>
            <div style={{ marginTop: 4 }}>
              {s.sets.map((st, i) => (
                <div key={st.id} className="set-line">
                  <span className="n">{st.kind === 'warmup' ? 'W' : i + 1}</span>
                  <span>{fmtSet(st, track, variant.unit)}</span>
                </div>
              ))}
            </div>
          </Link>
        );
      })}

      {editing && <VariantForm exerciseId={id} variant={variant} onClose={() => setEditing(false)} />}
    </div>
  );
}

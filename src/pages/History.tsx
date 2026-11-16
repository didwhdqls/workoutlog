import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ask, askText } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { ReviewCard, reviewSummary } from '../components/ReviewCard';
import { findPRs, fmtVolume, latestBodyweight, workoutSetCount, workoutVolumeKg } from '../lib/stats';
import { fmtDate, fmtDurationLong, fmtSet, fmtTime, variantName } from '../lib/util';
import { useMaps, useStore } from '../store';
import { GRIP_LABEL, type Workout } from '../types';

export function WorkoutCard({ w }: { w: Workout }) {
  const maps = useMaps();
  const bw = useStore((st) => latestBodyweight(st.workouts));
  const volume = workoutVolumeKg(w, maps.v, maps.ex, bw);
  return (
    <Link to={`/history/${w.id}`} className="card" style={{ display: 'block' }}>
      <div className="row">
        <div className="grow">
          <div style={{ fontWeight: 700 }} className="ellipsis">
            {w.name}
          </div>
          <div className="tiny muted">
            {fmtDate(w.startedAt)}
            {w.gymId && maps.gym.get(w.gymId) && ` · ${maps.gym.get(w.gymId)!.name}`}
          </div>
        </div>
        <Icon name="chevron" size={18} />
      </div>
      <div className="row tiny muted" style={{ gap: 12, margin: '8px 0 6px' }}>
        <span>
          <Icon name="timer" size={13} /> {fmtDurationLong((w.endedAt ?? w.startedAt) - w.startedAt)}
        </span>
        <span>{workoutSetCount(w)}세트</span>
        {volume > 0 && <span>{fmtVolume(volume)}</span>}
      </div>
      {w.exercises.slice(0, 5).map((e) => {
        const v = e.variantId ? maps.v.get(e.variantId) : undefined;
        return (
          <div key={e.id} className="small ellipsis">
            <span className="faint">{e.sets.length} ×</span> {maps.ex.get(e.exerciseId)?.name ?? '?'}
            {v && <span className="faint"> · {variantName(v)}</span>}
          </div>
        );
      })}
      {w.exercises.length > 5 && <div className="tiny faint">외 {w.exercises.length - 5}개</div>}
      {(w.review || w.note) && (
        <div className="tiny muted" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line)' }}>
          {reviewSummary(w.review)}
          {w.review?.tags?.length ? <span className="faint">{reviewSummary(w.review) ? ' · ' : ''}{w.review.tags.join(', ')}</span> : null}
          {w.note && <div className="ellipsis faint">“{w.note}”</div>}
        </div>
      )}
    </Link>
  );
}

export function History() {
  const workouts = useStore((s) => s.workouts);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const { days, inMonth } = useMemo(() => {
    const days = new Set<number>();
    const inMonth: Workout[] = [];
    for (const w of workouts) {
      const d = new Date(w.startedAt);
      if (d.getFullYear() === cursor.y && d.getMonth() === cursor.m) {
        days.add(d.getDate());
        inMonth.push(w);
      }
    }
    return { days, inMonth };
  }, [workouts, cursor]);

  const first = new Date(cursor.y, cursor.m, 1).getDay();
  const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const today = new Date();
  const isThisMonth = today.getFullYear() === cursor.y && today.getMonth() === cursor.m;
  const move = (d: number) =>
    setCursor((c) => {
      const m = c.m + d;
      return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });

  return (
    <div className="page">
      <div className="page-head">
        <h1>기록</h1>
      </div>
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="icon-btn" onClick={() => move(-1)} aria-label="이전 달">
            <Icon name="back" size={18} />
          </button>
          <div className="grow" style={{ textAlign: 'center', fontWeight: 700 }}>
            {cursor.y}년 {cursor.m + 1}월
            <div className="tiny muted" style={{ fontWeight: 500 }}>
              {inMonth.length}회 운동
            </div>
          </div>
          <button className="icon-btn" onClick={() => move(1)} aria-label="다음 달">
            <Icon name="chevron" size={18} />
          </button>
        </div>
        <div className="cal">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d} className="dow">
              {d}
            </div>
          ))}
          {Array.from({ length: first }, (_, i) => (
            <div key={'b' + i} />
          ))}
          {Array.from({ length: count }, (_, i) => i + 1).map((d) => (
            <div key={d} className={'day' + (days.has(d) ? ' has' : '') + (isThisMonth && d === today.getDate() ? ' today' : '')}>
              {d}
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">{cursor.m + 1}월 운동</div>
      {inMonth.length === 0 && <div className="empty">이 달에는 기록이 없어요.</div>}
      {inMonth.map((w) => (
        <WorkoutCard key={w.id} w={w} />
      ))}
    </div>
  );
}

export function WorkoutDetail() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const justDone = params.get('done') === '1';
  const workouts = useStore((s) => s.workouts);
  const active = useStore((s) => s.active);
  const startWorkout = useStore((s) => s.startWorkout);
  const deleteWorkout = useStore((s) => s.deleteWorkout);
  const routineFromWorkout = useStore((s) => s.routineFromWorkout);
  const gyms = useStore((s) => s.gyms);
  const bw = useStore((s) => latestBodyweight(s.workouts));
  const maps = useMaps();
  const navigate = useNavigate();
  const w = workouts.find((x) => x.id === id);

  const prs = useMemo(() => (w ? findPRs(w, workouts, maps.tracks) : new Map<string, string[]>()), [w, workouts, maps.tracks]);
  if (!w) return <div className="empty">기록을 찾을 수 없어요.</div>;

  const volume = workoutVolumeKg(w, maps.v, maps.ex, bw);
  const gymName = w.gymId ? gyms.find((g) => g.id === w.gymId)?.name : null;

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => (justDone ? navigate('/', { replace: true }) : navigate(-1))} aria-label="뒤로">
          <Icon name={justDone ? 'x' : 'back'} />
        </button>
        <h1 className="small">{justDone ? '운동 완료!' : w.name}</h1>
        <Link to={`/history/${w.id}/edit`} className="btn ghost sm" style={{ marginLeft: 'auto' }}>
          <Icon name="edit" size={16} /> 수정
        </Link>
      </div>

      {justDone && (
        <div className="card" style={{ marginBottom: 12, textAlign: 'center', padding: '18px 14px' }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{w.name}</div>
          <div className="small muted">수고했어요. 기록이 기구별로 저장됐어요.</div>
          {prs.size > 0 && (
            <div className="pr-badge" style={{ marginTop: 10, fontSize: 13, padding: '4px 10px' }}>
              <Icon name="trophy" size={15} /> 신기록 {prs.size}개
            </div>
          )}
        </div>
      )}
      {justDone && <ReviewCard w={w} highlight />}

      <div className="small muted" style={{ marginBottom: 10 }}>
        {fmtDate(w.startedAt, true)} · {fmtTime(w.startedAt)}–{w.endedAt ? fmtTime(w.endedAt) : ''}
        {gymName && ` · ${gymName}`}
      </div>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat">
          <div className="label">시간</div>
          <div className="value" style={{ fontSize: 18 }}>
            {fmtDurationLong((w.endedAt ?? w.startedAt) - w.startedAt)}
          </div>
        </div>
        <div className="stat">
          <div className="label">세트</div>
          <div className="value" style={{ fontSize: 18 }}>
            {workoutSetCount(w)}
          </div>
        </div>
        <div className="stat">
          <div className="label">볼륨</div>
          <div className="value" style={{ fontSize: 18 }}>
            {fmtVolume(volume)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {w.exercises.map((e) => {
          const ex = maps.ex.get(e.exerciseId);
          const v = e.variantId ? maps.v.get(e.variantId) : undefined;
          let n = 0;
          return (
            <div key={e.id} className="card">
              <Link to={v ? `/exercises/${e.exerciseId}/v/${encodeURIComponent(v.id)}` : `/exercises/${e.exerciseId}`}>
                <div style={{ fontWeight: 700 }}>{ex?.name ?? '?'}</div>
                <div className="small" style={{ color: v ? 'var(--accent)' : 'var(--warn)' }}>
                  {variantName(v, gyms)}
                  {e.grip && <span className="muted"> · {GRIP_LABEL[e.grip]}</span>}
                </div>
              </Link>
              <div style={{ marginTop: 6 }}>
                {e.sets.map((s) => (
                  <div key={s.id} className="set-line">
                    <span className="n">{s.kind === 'warmup' ? 'W' : ++n}</span>
                    <span>{fmtSet(s, ex?.track ?? 'weight', v?.unit)}</span>
                    {s.kind === 'drop' && <span className="tag">드롭</span>}
                    {s.kind === 'failure' && <span className="tag">실패</span>}
                    {prs.get(s.id)?.map((l) => (
                      <span key={l} className="pr-badge">
                        <Icon name="trophy" size={12} /> {l}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              {e.note && <div className="small muted" style={{ marginTop: 6 }}>{e.note}</div>}
            </div>
          );
        })}
      </div>

      {!justDone && <ReviewCard w={w} />}

      <div className="stack" style={{ marginTop: 16 }}>
        <button
          className="btn soft block"
          disabled={!!active}
          onClick={() => {
            startWorkout({ copyOf: w.id });
            navigate('/workout');
          }}
        >
          <Icon name="copy" size={16} /> 이 운동 다시 하기
        </button>
        <button
          className="btn block"
          onClick={async () => {
            const name = await askText({ title: '루틴으로 저장', message: '루틴 이름을 정해 주세요.', value: w.name, ok: '저장' });
            if (name) navigate(`/routines/${routineFromWorkout(w.id, name)}`);
          }}
        >
          루틴으로 저장
        </button>
        <button
          className="btn danger block"
          onClick={async () => {
            if (await ask({ title: '기록 삭제', message: '이 운동 기록을 삭제할까요? 되돌릴 수 없어요.', ok: '삭제', danger: true })) {
              deleteWorkout(w.id);
              navigate('/history', { replace: true });
            }
          }}
        >
          기록 삭제
        </button>
      </div>
    </div>
  );
}

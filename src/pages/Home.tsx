import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { fmtVolume, latestBodyweight } from '../lib/stats';
import { dayKey, dayLabel, workoutsByDay } from '../lib/calendar';
import { computeWeek, startOfWeek } from '../lib/weekly';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
import { fmtDate, fmtDurationLong } from '../lib/util';
import { useMaps, useStore } from '../store';
import { MUSCLE_LABEL } from '../types';
import { Elapsed } from './ActiveWorkout';
import { WorkoutCard } from './History';

export function Home() {
  const active = useStore((s) => s.active);
  const routines = useStore((s) => s.routines);
  const workouts = useStore((s) => s.workouts);
  const startWorkout = useStore((s) => s.startWorkout);
  const maps = useMaps();
  const navigate = useNavigate();

  const weekStartDay = useStore((s) => s.settings.weekStart ?? 1);
  const bw = useStore((s) => latestBodyweight(s.workouts));
  // 통계 화면과 같은 규칙(워밍업·유산소 제외)으로 이번 주 집계
  const week = useMemo(
    () => computeWeek(workouts, startOfWeek(Date.now(), weekStartDay), maps.ex, maps.v, bw),
    [workouts, weekStartDay, maps, bw],
  );
  // 이번 주 7일 달력
  const weekStartTs = startOfWeek(Date.now(), weekStartDay);
  const byDay = useMemo(() => workoutsByDay(workouts, maps.ex), [workouts, maps.ex]);
  const routineMap = useMemo(() => new Map(routines.map((r) => [r.id, r])), [routines]);
  const todayKey = dayKey(Date.now());
  const activeKey = active ? dayKey(active.startedAt) : null;

  const topMuscles = [...week.muscles.entries()].filter(([, b]) => b.sets > 0).sort((a, b) => b[1].sets - a[1].sets);

  const quick = useMemo(
    () => [...routines].sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt)).slice(0, 4),
    [routines],
  );

  const start = (routineId?: string) => {
    startWorkout({ routineId });
    navigate('/workout');
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>머신로그</h1>
        <Link to="/settings" className="icon-btn" aria-label="설정">
          <Icon name="settings" />
        </Link>
      </div>
      <p className="muted small" style={{ margin: '-6px 2px 16px' }}>
        {fmtDate(Date.now())}
      </p>

      {active ? (
        <Link to="/workout" className="card" style={{ display: 'block', background: 'var(--accent)', color: 'var(--accent-ink)' }}>
          <div className="row">
            <span className="live-dot" />
            <span className="small" style={{ fontWeight: 600 }}>
              운동 진행 중
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{active.name}</div>
          <div className="row small" style={{ marginTop: 2, opacity: 0.9 }}>
            <Elapsed since={active.startedAt} /> · {active.exercises.length}개 운동
            <span className="grow" />
            이어하기 <Icon name="chevron" size={16} />
          </div>
        </Link>
      ) : (
        <button className="btn primary block" style={{ height: 54, fontSize: 16 }} onClick={() => start()}>
          <Icon name="plus" /> 빈 운동 시작
        </button>
      )}

      <div className="section-title">
        이번 주
        <Link to="/stats" className="btn ghost sm">
          통계 <Icon name="chevron" size={14} />
        </Link>
      </div>
      <div className="week-strip">
        {Array.from({ length: 7 }, (_, i) => {
          const day = new Date(weekStartTs);
          day.setDate(day.getDate() + i);
          const k = dayKey(day.getTime());
          const info = byDay.get(k);
          const cls = ['wd', info && 'has', k === todayKey && 'today', k === activeKey && 'live'].filter(Boolean).join(' ');
          const label = `${day.getMonth() + 1}월 ${day.getDate()}일${info ? ` ${dayLabel(info, routineMap)}` : ''}`;
          const body = (
            <>
              <span>{DOW[day.getDay()]}</span>
              <span className="n">{day.getDate()}</span>
              <span className="m">{info ? dayLabel(info, routineMap) : k === activeKey ? '진행' : ''}</span>
            </>
          );
          return info ? (
            <Link key={k} to={`/history?d=${k}`} className={cls} aria-label={label}>
              {body}
            </Link>
          ) : (
            <div key={k} className={cls} aria-label={label}>
              {body}
            </div>
          );
        })}
      </div>
      <Link to="/stats" className="stats" style={{ display: 'grid' }}>
        <div className="stat">
          <div className="label">운동</div>
          <div className="value">
            {week.workouts}
            <small>회</small>
          </div>
        </div>
        <div className="stat">
          <div className="label">시간</div>
          <div className="value" style={{ fontSize: week.durationMs >= 3600000 ? 18 : 22 }}>
            {week.durationMs ? fmtDurationLong(week.durationMs) : '0분'}
          </div>
        </div>
        <div className="stat">
          <div className="label">세트</div>
          <div className="value">
            {week.sets}
            <small>세트</small>
          </div>
          <div className="foot">워밍업 제외</div>
        </div>
        <div className="stat">
          <div className="label">볼륨</div>
          <div className="value">{fmtVolume(week.volumeKg)}</div>
          <div className="foot">무게 × 횟수 합계</div>
        </div>
      </Link>
      {topMuscles.length > 0 && (
        <Link to="/stats" className="chips" style={{ marginTop: 10 }}>
          {topMuscles.map(([m, b]) => (
            <span key={m} className="chip">
              {MUSCLE_LABEL[m]} <b className="tnum" style={{ color: 'var(--text)' }}>{b.sets}</b>
            </span>
          ))}
        </Link>
      )}

      <div className="section-title">
        루틴으로 시작
        <Link to="/routines" className="btn ghost sm">
          전체
        </Link>
      </div>
      {quick.length === 0 ? (
        <Link to="/routines/new" className="card" style={{ display: 'block' }}>
          <div className="title" style={{ fontWeight: 600 }}>
            첫 루틴 만들기
          </div>
          <div className="small muted">자주 하는 운동을 묶어 두면 한 번에 시작할 수 있어요.</div>
        </Link>
      ) : (
        <div className="list">
          {quick.map((r) => {
            const muscles = [...new Set(r.items.map((i) => maps.ex.get(i.exerciseId)?.muscle).filter(Boolean))];
            return (
              <div key={r.id} className="list-item">
                <Link to={`/routines/${r.id}`} className="grow">
                  <div className="title ellipsis">{r.name}</div>
                  <div className="sub">
                    {r.items.length}개 운동 · {muscles.map((m) => MUSCLE_LABEL[m!]).join(', ') || '비어 있음'}
                  </div>
                </Link>
                <button className="btn soft sm" disabled={!!active || r.items.length === 0} onClick={() => start(r.id)}>
                  <Icon name="play" size={14} /> 시작
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="section-title">
        최근 운동
        {workouts.length > 0 && (
          <Link to="/history" className="btn ghost sm">
            전체
          </Link>
        )}
      </div>
      {workouts.length === 0 ? (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>기구별로 따로 기록돼요</div>
          <div className="small muted">
            같은 시티드 로우라도 해머스트렝스 플레이트 머신, 라이프피트니스 핀 머신, 케이블은 무게감이 다르죠. 운동을 추가한 뒤{' '}
            <b style={{ color: 'var(--accent)' }}>기구</b>를 고르면 이전 기록과 최고 기록이 그 기구 기준으로만 보여요.
          </div>
        </div>
      ) : (
        workouts.slice(0, 3).map((w) => <WorkoutCard key={w.id} w={w} />)
      )}
    </div>
  );
}

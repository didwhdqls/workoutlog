import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart } from '../components/BarChart';
import { Icon } from '../components/Icon';
import { SUB_LABEL, SUBS_BY_GROUP } from '../data/muscles';
import { fmtGuide, GROUP_GUIDE, guideStatus, STATUS_LABEL, SUB_GUIDE, type GuideStatus, type VolumeGuide } from '../data/volumeGuide';
import { fmtVolume, latestBodyweight } from '../lib/stats';
import { fmtDurationLong } from '../lib/util';
import { computeWeek, deltaText, fmtWeekRange, shiftWeek, startOfWeek, weeklySeries, type MuscleBucket } from '../lib/weekly';
import { useMaps, useStore } from '../store';
import type { MuscleGroup } from '../types';
import { MUSCLE_LABEL } from '../types';

const WEEKS = 12;
/** 항상 보여 줄 주요 부위 (0세트여도 표시해서 빠진 부위가 보이게) */
const MAIN_GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core'];

type Metric = 'volume' | 'sets';

export function Stats() {
  const workouts = useStore((s) => s.workouts);
  const weekStartDay = useStore((s) => s.settings.weekStart ?? 1);
  const maps = useMaps();
  const thisWeek = startOfWeek(Date.now(), weekStartDay);
  const [selected, setSelected] = useState(thisWeek);
  const [metric, setMetric] = useState<Metric>('volume');
  const [open, setOpen] = useState<MuscleGroup | null>(null);

  // 주 시작 요일 설정이 바뀌면 선택 주도 다시 맞춤
  const sel = startOfWeek(selected, weekStartDay);

  const bw = useStore((s) => latestBodyweight(s.workouts));
  const week = useMemo(() => computeWeek(workouts, sel, maps.ex, maps.v, bw), [workouts, sel, maps, bw]);
  const prev = useMemo(() => computeWeek(workouts, shiftWeek(sel, -1), maps.ex, maps.v, bw), [workouts, sel, maps, bw]);

  // 그래프 창: 기본은 최근 12주, 더 옛날 주를 고르면 그 주가 오른쪽 끝에 오도록
  const windowEnd = sel < shiftWeek(thisWeek, -(WEEKS - 1)) ? sel : thisWeek;
  const series = useMemo(
    () => weeklySeries(workouts, windowEnd, WEEKS, weekStartDay, maps.ex, maps.v, bw),
    [workouts, windowEnd, weekStartDay, maps, bw],
  );
  const avgVolume = series.filter((p) => p.workouts > 0);
  const avg = avgVolume.length ? avgVolume.reduce((t, p) => t + (metric === 'volume' ? p.volumeKg : p.sets), 0) / avgVolume.length : 0;

  const groups: MuscleGroup[] = [...MAIN_GROUPS, ...(week.muscles.has('other') ? (['other'] as MuscleGroup[]) : [])];

  if (workouts.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <h1>통계</h1>
        </div>
        <div className="empty">
          운동을 기록하면 주간 볼륨과 부위별 세트 수가 여기에 쌓여요.
        </div>
      </div>
    );
  }

  const isThisWeek = sel === thisWeek;

  return (
    <div className="page">
      <div className="page-head">
        <h1>통계</h1>
      </div>

      <div className="card row" style={{ padding: '6px 6px', marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => setSelected(shiftWeek(sel, -1))} aria-label="이전 주">
          <Icon name="back" size={18} />
        </button>
        <div className="grow" style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{isThisWeek ? '이번 주' : sel === shiftWeek(thisWeek, -1) ? '지난주' : fmtWeekRange(sel)}</div>
          {(isThisWeek || sel === shiftWeek(thisWeek, -1)) && <div className="tiny muted">{fmtWeekRange(sel)}</div>}
        </div>
        <button className="icon-btn" disabled={isThisWeek} style={{ opacity: isThisWeek ? 0.3 : 1 }} onClick={() => setSelected(shiftWeek(sel, 1))} aria-label="다음 주">
          <Icon name="chevron" size={18} />
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">총 볼륨</div>
          <div className="value">{fmtVolume(week.volumeKg)}</div>
          <div className="foot">{deltaText(week.volumeKg, prev.volumeKg)}</div>
        </div>
        <div className="stat">
          <div className="label">총 세트</div>
          <div className="value">
            {week.sets}
            <small>세트</small>
          </div>
          <div className="foot">{deltaText(week.sets, prev.sets)}</div>
        </div>
        <div className="stat">
          <div className="label">운동</div>
          <div className="value">
            {week.workouts}
            <small>회</small>
          </div>
          <div className="foot">지난주 {prev.workouts}회</div>
        </div>
        <div className="stat">
          <div className="label">운동 시간</div>
          <div className="value" style={{ fontSize: 18, paddingTop: 3 }}>
            {week.durationMs ? fmtDurationLong(week.durationMs) : '0분'}
          </div>
          {week.cardioSec > 0 && <div className="foot">유산소 {Math.round(week.cardioSec / 60)}분</div>}
        </div>
      </div>

      <div className="section-title">주간 {metric === 'volume' ? '볼륨' : '세트'} 추이</div>
      <div className="card" style={{ padding: '12px 8px 8px' }}>
        <div className="seg" style={{ margin: '0 6px 10px' }}>
          <button className={metric === 'volume' ? 'on' : ''} onClick={() => setMetric('volume')}>
            볼륨 (kg)
          </button>
          <button className={metric === 'sets' ? 'on' : ''} onClick={() => setMetric('sets')}>
            세트 수
          </button>
        </div>
        <BarChart
          bars={series.map((p) => {
            const d = new Date(p.start);
            return {
              key: p.start,
              label: `${d.getMonth() + 1}/${d.getDate()}`,
              value: metric === 'volume' ? p.volumeKg : p.sets,
              tip: metric === 'volume' ? fmtVolume(p.volumeKg) : `${p.sets}세트`,
              tipSub: `${fmtWeekRange(p.start)} · ${p.workouts}회`,
            };
          })}
          selectedKey={sel}
          onSelect={setSelected}
          integer={metric === 'sets'}
          fmtAxis={(v) => (metric === 'sets' ? String(v) : v >= 1000 ? `${Math.round(v / 100) / 10}t` : String(Math.round(v)))}
        />
        <div className="tiny faint" style={{ padding: '4px 8px 0' }}>
          막대를 누르면 그 주를 봐요 · 운동한 주 평균 {metric === 'volume' ? fmtVolume(avg) : `${Math.round(avg)}세트`}
        </div>
      </div>

      <div className="section-title">부위별 세트 · 권장량</div>
      <div className="card" style={{ padding: '4px 14px' }}>
        {groups.map((g) => (
          <MuscleRow
            key={g}
            group={g}
            bucket={week.muscles.get(g)}
            prevSets={prev.muscles.get(g)?.sets ?? 0}
            open={open === g}
            onToggle={() => setOpen(open === g ? null : g)}
            exName={(id) => maps.ex.get(id)?.name ?? '?'}
          />
        ))}
      </div>
      <div className="row tiny faint" style={{ margin: '8px 2px 0', gap: 6 }}>
        <span style={{ width: 18, height: 8, borderRadius: 3, background: 'var(--accent-soft)', flex: 'none' }} />
        <span>
          옅은 구간: 부위별 주당 권장 세트 · 세로선: 회복이 어려워지기 쉬운 선
        </span>
      </div>
      <p className="tiny faint" style={{ margin: '6px 2px 0' }}>
        권장량은 근비대 목적의 참고값이에요 (RP 볼륨 랜드마크를 참고해 단순화). 하체는 대퇴사두+햄스트링, 팔은 이두+삼두 기준이고, 부위를 누르면 세부 부위별 권장량이 보여요.
        워밍업 세트는 빼고, 운동의 주 타깃 부위에만 1세트로 세요. 개인차가 크니 회복 상태에 맞춰 조절하세요.
      </p>

      <p className="tiny faint" style={{ margin: '14px 2px 0' }}>
        볼륨 = 무게 × 횟수의 합. lb 기구는 kg로 환산하고, "칸" 단위 기구는 빠져요. 풀업·딥스 같은 맨몸 운동은 체중 × 횟수, 어시스트 풀업은 (체중 − 보조 무게) × 횟수로 넣어요
        {' '}(체중은 운동 기록 화면에서 그날 입력한 값, 없으면 최근 값{bw ? ` ${bw}kg` : ' — 아직 입력한 적 없음'}). 복근 맨몸 운동은 빠져요.{' '}
        <Link to="/settings" style={{ textDecoration: 'underline' }}>
          주 시작 요일 설정
        </Link>
      </p>
    </div>
  );
}

const STATUS_COLOR: Record<GuideStatus, string> = {
  none: 'var(--text-3)',
  low: 'var(--warn)',
  ok: 'var(--ok)',
  high: 'var(--text-2)',
  over: 'var(--danger)',
};

/** 권장 구간(옅은 띠) + 최대선 + 현재 세트 막대 */
function GuideBar({ sets, guide, height = 10 }: { sets: number; guide?: VolumeGuide; height?: number }) {
  const scale = Math.max(guide?.max ?? 20, sets) * 1.08;
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
  return (
    <div style={{ position: 'relative', height, borderRadius: height / 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
      {guide && (
        <>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: pct(guide.lo), width: `calc(${pct(guide.hi)} - ${pct(guide.lo)})`, background: 'var(--accent-soft)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: pct(guide.max), width: 2, background: 'var(--text-3)', opacity: 0.6 }} />
        </>
      )}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: pct(sets), background: 'var(--accent)', borderRadius: height / 2 }} />
    </div>
  );
}

function StatusText({ sets, guide }: { sets: number; guide?: VolumeGuide }) {
  if (!guide) return null;
  const st = guideStatus(sets, guide);
  return (
    <span className="tiny">
      <span className="faint">권장 {fmtGuide(guide)}</span>
      {(sets > 0 || guide.lo > 0) && <b style={{ color: STATUS_COLOR[st], marginLeft: 4 }}>{STATUS_LABEL[st]}</b>}
    </span>
  );
}

function MuscleRow({
  group,
  bucket,
  prevSets,
  open,
  onToggle,
  exName,
}: {
  group: MuscleGroup;
  bucket?: MuscleBucket;
  prevSets: number;
  open: boolean;
  onToggle: () => void;
  exName: (id: string) => string;
}) {
  const sets = bucket?.sets ?? 0;
  const guide = GROUP_GUIDE[group];
  const subs = SUBS_BY_GROUP[group].map((s) => ({ s, n: bucket?.subs.get(s) ?? 0 })).filter((x) => x.n > 0);
  const unassigned = sets - subs.reduce((t, x) => t + x.n, 0);
  // "이두 10 · 삼두 8" (세부 부위를 모르는 직접 만든 운동은 "기타")
  const subText = [...subs.map((x) => `${SUB_LABEL[x.s]} ${x.n}`), ...(subs.length && unassigned > 0 ? [`기타 ${unassigned}`] : [])].join(' · ');
  const exercises = bucket ? [...bucket.exercises.entries()].sort((a, b) => b[1].sets - a[1].sets) : [];
  // 펼쳤을 때: 권장량이 있는 세부 부위 (안 한 부위도 보여서 빠진 곳이 보이게)
  const subGuides = SUBS_BY_GROUP[group]
    .filter((s) => SUB_GUIDE[s])
    .map((s) => ({ s, n: bucket?.subs.get(s) ?? 0, g: SUB_GUIDE[s]! }));
  const expandable = sets > 0 || subGuides.length > 0;

  return (
    <div style={{ borderBottom: '1px solid var(--line)', padding: '10px 0' }} className="muscle-row">
      <button style={{ width: '100%', textAlign: 'left' }} onClick={onToggle} disabled={!expandable} aria-expanded={open}>
        <div className="row" style={{ alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, color: sets ? 'var(--text)' : 'var(--text-3)' }}>{MUSCLE_LABEL[group]}</span>
          <StatusText sets={sets} guide={guide} />
          <span className="grow" />
          <span className="tnum" style={{ fontWeight: 800, fontSize: 18, color: sets ? 'var(--text)' : 'var(--text-3)' }}>
            {sets}
          </span>
          <span className="small muted">세트</span>
          {expandable && <Icon name={open ? 'up' : 'down'} size={16} />}
        </div>
        <div style={{ marginTop: 6 }}>
          <GuideBar sets={sets} guide={guide} />
        </div>
        <div className="row tiny muted" style={{ marginTop: 4 }}>
          <span className="grow">{sets > 0 ? subText : ''}</span>
          <span className="faint">지난주 {prevSets}</span>
          {bucket && bucket.volumeKg > 0 && <span className="faint tnum">· {fmtVolume(bucket.volumeKg)}</span>}
        </div>
      </button>
      {open && (
        <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid var(--line)' }}>
          {subGuides.length > 0 && (
            <div style={{ marginBottom: exercises.length ? 10 : 0 }}>
              {subGuides.map(({ s, n, g }) => (
                <div key={s} style={{ padding: '4px 0' }}>
                  <div className="row small">
                    <span className="grow">{SUB_LABEL[s]}</span>
                    <StatusText sets={n} guide={g} />
                    <span className="tnum" style={{ fontWeight: 600, width: 46, textAlign: 'right' }}>
                      {n}세트
                    </span>
                  </div>
                  <div style={{ marginTop: 3 }}>
                    <GuideBar sets={n} guide={g} height={6} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {exercises.map(([id, e]) => (
            <Link key={id} to={`/exercises/${id}`} className="row small" style={{ padding: '4px 0' }}>
              <span className="grow ellipsis">{exName(id)}</span>
              <span className="tnum" style={{ fontWeight: 600 }}>
                {e.sets}세트
              </span>
              {e.volumeKg > 0 && (
                <span className="tnum faint" style={{ width: 70, textAlign: 'right' }}>
                  {fmtVolume(e.volumeKg)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

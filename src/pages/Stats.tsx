import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart } from '../components/BarChart';
import { Icon } from '../components/Icon';
import { SUB_LABEL, SUBS_BY_GROUP } from '../data/muscles';
import { fmtGuide, GROUP_GUIDE, guideStatus, STATUS_LABEL, SUB_GUIDE, type GuideStatus, type VolumeGuide } from '../data/volumeGuide';
import { fmtVolume, latestBodyweight } from '../lib/stats';
import { fmtDurationLong } from '../lib/util';
import {
  computeWeek,
  deltaText,
  fmtPeriod,
  periodSeries,
  shiftPeriod,
  startOfPeriod,
  weeksIn,
  type MuscleBucket,
  type Period,
  type WeekPoint,
} from '../lib/weekly';
import { useMaps, useStore } from '../store';
import type { MuscleGroup } from '../types';
import { MUSCLE_LABEL } from '../types';

/** 그래프에 보여 줄 기간 수: 주간 12주, 월간 12개월 */
const SPAN: Record<Period, number> = { week: 12, month: 12 };
/** 항상 보여 줄 주요 부위 (0세트여도 표시해서 빠진 부위가 보이게) */
const MAIN_GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core'];

type Metric = 'volume' | 'sets' | 'workouts' | 'time';
const METRIC_LABEL: Record<Metric, string> = { volume: '볼륨', sets: '세트', workouts: '운동 횟수', time: '운동 시간' };

export function Stats() {
  const workouts = useStore((s) => s.workouts);
  const weekStartDay = useStore((s) => s.settings.weekStart ?? 1);
  const maps = useMaps();
  const [period, setPeriod] = useState<Period>('week');
  const thisP = startOfPeriod(Date.now(), period, weekStartDay);
  const [selected, setSelected] = useState(Date.now());
  const [metric, setMetric] = useState<Metric>('volume');
  const [trendMuscle, setTrendMuscle] = useState<MuscleGroup | 'all'>('all');
  const [open, setOpen] = useState<MuscleGroup | null>(null);

  // 선택한 날짜가 속한 주/달 (주 시작 요일이나 기간 단위가 바뀌어도 맞춰짐)
  const sel = startOfPeriod(selected, period, weekStartDay);
  const selEnd = shiftPeriod(sel, period, 1);
  const prevStart = shiftPeriod(sel, period, -1);
  const lastName = period === 'week' ? '지난주' : '지난달';
  // 지금 기간을 볼 땐 "지난주/지난달", 예전 기간을 볼 땐 그 바로 앞이라 "그 전 주/달"
  const prevLabel = sel === thisP ? lastName : period === 'week' ? '그 전 주' : '그 전 달';
  const unitWord = period === 'week' ? '주' : '달';

  const bw = useStore((s) => latestBodyweight(s.workouts));
  const cur = useMemo(() => computeWeek(workouts, sel, maps.ex, maps.v, bw, selEnd), [workouts, sel, selEnd, maps, bw]);
  const prev = useMemo(() => computeWeek(workouts, prevStart, maps.ex, maps.v, bw, sel), [workouts, prevStart, sel, maps, bw]);
  // 진행 중인 주/달은 지난 기간의 "같은 날짜까지"와 비교 (예: 11월 1–16일 vs 10월 1–16일)
  const ongoing = sel === thisP;
  const prevSameEnd = ongoing ? Math.min(prevStart + (Date.now() - sel), sel) : sel;
  const prevSame = useMemo(
    () => (ongoing ? computeWeek(workouts, prevStart, maps.ex, maps.v, bw, prevSameEnd) : prev),
    [ongoing, workouts, prevStart, prevSameEnd, maps, bw, prev],
  );
  const deltaLabel = ongoing ? `${prevLabel} 같은 기간` : prevLabel;
  // 월간일 때 부위별 세트는 "주 평균"으로 권장량과 비교
  const weeks = weeksIn(sel, period);
  const prevWeeks = weeksIn(prevStart, period);

  // 그래프 창: 기본은 최근 12주(12개월), 더 옛날을 고르면 그 기간이 오른쪽 끝에 오도록
  const span = SPAN[period];
  const windowEnd = sel < shiftPeriod(thisP, period, -(span - 1)) ? sel : thisP;
  const series = useMemo(
    () => periodSeries(workouts, period, windowEnd, span, weekStartDay, maps.ex, maps.v, bw, trendMuscle),
    [workouts, period, windowEnd, span, weekStartDay, maps, bw, trendMuscle],
  );
  const valueOf = (pt: WeekPoint) =>
    metric === 'volume' ? pt.volumeKg : metric === 'sets' ? pt.sets : metric === 'workouts' ? pt.workouts : pt.durationMs / 60000;
  const fmtValue = (v: number) =>
    metric === 'volume'
      ? fmtVolume(v)
      : metric === 'sets'
        ? `${Math.round(v)}세트`
        : metric === 'workouts'
          ? `${Math.round(v * 10) / 10}회`
          : fmtDurationLong(v * 60000);
  const activePts = series.filter((pt) => pt.workouts > 0);
  const avg = activePts.length ? activePts.reduce((t, pt) => t + valueOf(pt), 0) / activePts.length : 0;
  const best = series.reduce<WeekPoint | null>((b, pt) => (valueOf(pt) > (b ? valueOf(b) : 0) ? pt : b), null);
  // 앞 절반 대비 뒤 절반 평균 (추세)
  const half = Math.floor(series.length / 2);
  const avgOf = (pts: WeekPoint[]) => (pts.length ? pts.reduce((t, pt) => t + valueOf(pt), 0) / pts.length : 0);
  const before = avgOf(series.slice(0, half));
  const after = avgOf(series.slice(half));
  const trendPct = before > 0 ? Math.round(((after - before) / before) * 100) : null;

  const groups: MuscleGroup[] = [...MAIN_GROUPS, ...(cur.muscles.has('other') ? (['other'] as MuscleGroup[]) : [])];

  if (workouts.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <h1>통계</h1>
        </div>
        <div className="empty">운동을 기록하면 주간·월간 볼륨과 부위별 세트 수가 여기에 쌓여요.</div>
      </div>
    );
  }

  const isCurrent = sel === thisP;
  const isPrev = sel === shiftPeriod(thisP, period, -1);
  const title = isCurrent ? `이번 ${unitWord}` : isPrev ? lastName : fmtPeriod(sel, period);
  const axis = (v: number) => {
    if (metric === 'volume') return v >= 1000 ? `${Math.round(v / 100) / 10}t` : String(Math.round(v));
    if (metric === 'time') return v >= 60 ? `${Math.round((v / 60) * 10) / 10}h` : `${Math.round(v)}m`;
    return String(v);
  };
  const barLabel = (start: number) => {
    const d = new Date(start);
    if (period === 'week') return `${d.getMonth() + 1}/${d.getDate()}`;
    return d.getMonth() === 0 ? `${String(d.getFullYear()).slice(2)}년1월` : `${d.getMonth() + 1}월`;
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>통계</h1>
      </div>

      <div className="seg" style={{ marginBottom: 10 }}>
        <button className={period === 'week' ? 'on' : ''} onClick={() => setPeriod('week')}>
          주간
        </button>
        <button className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>
          월간
        </button>
      </div>

      <div className="card row" style={{ padding: '6px 6px', marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => setSelected(shiftPeriod(sel, period, -1))} aria-label={`이전 ${unitWord}`}>
          <Icon name="back" size={18} />
        </button>
        <div className="grow" style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          {(isCurrent || isPrev) && <div className="tiny muted">{fmtPeriod(sel, period)}</div>}
        </div>
        <button
          className="icon-btn"
          disabled={isCurrent}
          style={{ opacity: isCurrent ? 0.3 : 1 }}
          onClick={() => setSelected(shiftPeriod(sel, period, 1))}
          aria-label={`다음 ${unitWord}`}
        >
          <Icon name="chevron" size={18} />
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">총 볼륨</div>
          <div className="value">{fmtVolume(cur.volumeKg)}</div>
          <div className="foot">{deltaText(cur.volumeKg, prevSame.volumeKg, deltaLabel)}</div>
        </div>
        <div className="stat">
          <div className="label">총 세트</div>
          <div className="value">
            {cur.sets}
            <small>세트</small>
          </div>
          <div className="foot">{deltaText(cur.sets, prevSame.sets, deltaLabel)}</div>
        </div>
        <div className="stat">
          <div className="label">운동</div>
          <div className="value">
            {cur.workouts}
            <small>회</small>
          </div>
          <div className="foot">
            {prevLabel} {prev.workouts}회{period === 'month' && cur.workouts > 0 ? ` · 주 ${Math.round((cur.workouts / weeks) * 10) / 10}회` : ''}
          </div>
        </div>
        <div className="stat">
          <div className="label">운동 시간</div>
          <div className="value" style={{ fontSize: 18, paddingTop: 3 }}>
            {cur.durationMs ? fmtDurationLong(cur.durationMs) : '0분'}
          </div>
          {cur.cardioSec > 0 && <div className="foot">유산소 {Math.round(cur.cardioSec / 60)}분</div>}
        </div>
      </div>

      <div className="section-title">
        {period === 'week' ? '주간' : '월간'} {METRIC_LABEL[metric]} 추이
        {trendMuscle !== 'all' && <span className="tag accent">{MUSCLE_LABEL[trendMuscle]}</span>}
      </div>
      <div className="card" style={{ padding: '12px 8px 8px' }}>
        <div className="seg" style={{ margin: '0 6px 8px' }}>
          {(['volume', 'sets', 'workouts', 'time'] as Metric[]).map((m) => (
            <button key={m} className={metric === m ? 'on' : ''} onClick={() => setMetric(m)}>
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="chips" style={{ margin: '0 6px 10px' }}>
          <button className={'chip' + (trendMuscle === 'all' ? ' on' : '')} onClick={() => setTrendMuscle('all')}>
            전체
          </button>
          {MAIN_GROUPS.map((m) => (
            <button key={m} className={'chip' + (trendMuscle === m ? ' on' : '')} onClick={() => setTrendMuscle(m)}>
              {MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
        <BarChart
          bars={series.map((pt) => ({
            key: pt.start,
            label: barLabel(pt.start),
            value: valueOf(pt),
            tip: fmtValue(valueOf(pt)),
            tipSub: `${fmtPeriod(pt.start, period)} · ${pt.workouts}회`,
          }))}
          selectedKey={sel}
          onSelect={setSelected}
          integer={metric === 'sets' || metric === 'workouts'}
          fmtAxis={axis}
        />
        <div className="row tiny faint" style={{ padding: '6px 8px 0', gap: 10, flexWrap: 'wrap' }}>
          <span>
            운동한 {unitWord} 평균 <b style={{ color: 'var(--text-2)' }}>{fmtValue(avg)}</b>
          </span>
          {best && valueOf(best) > 0 && (
            <span>
              최고 <b style={{ color: 'var(--text-2)' }}>{fmtValue(valueOf(best))}</b> ({fmtPeriod(best.start, period)})
            </span>
          )}
          {trendPct != null && (
            <span>
              최근 {span - half}
              {period === 'week' ? '주' : '개월'}은 그 전보다{' '}
              <b style={{ color: 'var(--text-2)' }}>{trendPct === 0 ? '비슷' : `${trendPct > 0 ? '▲' : '▼'} ${Math.abs(trendPct)}%`}</b>
            </span>
          )}
        </div>
        <div className="tiny faint" style={{ padding: '2px 8px 0' }}>
          막대를 누르면 그 {unitWord}를 봐요
        </div>
      </div>

      <div className="section-title">
        부위별 세트 · 권장량
        {period === 'month' && <span className="tiny faint">주 평균으로 비교</span>}
      </div>
      <div className="card" style={{ padding: '4px 14px' }}>
        {groups.map((g) => (
          <MuscleRow
            key={g}
            group={g}
            bucket={cur.muscles.get(g)}
            prevSets={prev.muscles.get(g)?.sets ?? 0}
            prevLabel={prevLabel}
            weeks={weeks}
            prevWeeks={prevWeeks}
            open={open === g}
            onToggle={() => setOpen(open === g ? null : g)}
            exName={(id) => maps.ex.get(id)?.name ?? '?'}
          />
        ))}
      </div>
      <div className="row tiny faint" style={{ margin: '8px 2px 0', gap: 6 }}>
        <span style={{ width: 18, height: 8, borderRadius: 3, background: 'var(--accent-soft)', flex: 'none' }} />
        <span>옅은 구간: 부위별 주당 권장 세트 · 세로선: 회복이 어려워지기 쉬운 선</span>
      </div>
      <p className="tiny faint" style={{ margin: '6px 2px 0' }}>
        권장량은 근비대 목적의 참고값이에요 (RP 볼륨 랜드마크를 참고해 단순화). 하체는 대퇴사두+햄스트링, 팔은 이두+삼두 기준이고, 부위를 누르면 세부 부위별
        권장량이 보여요.
        {period === 'month' && ' 월간에서는 그 달 세트를 주 수로 나눈 주 평균으로 비교해요 (이번 달은 오늘까지).'} 워밍업 세트는 빼고, 운동의 주 타깃
        부위에만 1세트로 세요. 개인차가 크니 회복 상태에 맞춰 조절하세요.
      </p>

      <p className="tiny faint" style={{ margin: '14px 2px 0' }}>
        볼륨 = 무게 × 횟수의 합. lb 기구는 kg로 환산하고, "칸" 단위 기구는 빠져요. 풀업·딥스 같은 맨몸 운동은 체중 × 횟수, 어시스트 풀업은 (체중 − 보조
        무게) × 횟수로 넣어요 (체중은 운동 기록 화면에서 그날 입력한 값, 없으면 최근 값{bw ? ` ${bw}kg` : ' — 아직 입력한 적 없음'}). 복근 맨몸 운동은
        빠져요.{' '}
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
  prevLabel,
  weeks,
  prevWeeks,
  open,
  onToggle,
  exName,
}: {
  group: MuscleGroup;
  bucket?: MuscleBucket;
  prevSets: number;
  prevLabel: string;
  /** 기간 안의 주 수 (주간 = 1). 권장량은 주당 기준이라 세트를 이 값으로 나눠 비교 */
  weeks: number;
  prevWeeks: number;
  open: boolean;
  onToggle: () => void;
  exName: (id: string) => string;
}) {
  const sets = bucket?.sets ?? 0;
  const perWeek = (n: number) => Math.round((n / weeks) * 10) / 10;
  const monthly = weeks > 1;
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
          <StatusText sets={perWeek(sets)} guide={guide} />
          <span className="grow" />
          <span className="tnum" style={{ fontWeight: 800, fontSize: 18, color: sets ? 'var(--text)' : 'var(--text-3)' }}>
            {sets}
          </span>
          <span className="small muted">세트</span>
          {expandable && <Icon name={open ? 'up' : 'down'} size={16} />}
        </div>
        <div style={{ marginTop: 6 }}>
          <GuideBar sets={perWeek(sets)} guide={guide} />
        </div>
        <div className="row tiny muted" style={{ marginTop: 4 }}>
          <span className="grow">{sets > 0 ? subText : ''}</span>
          {monthly && sets > 0 && <span className="tnum">주 평균 {perWeek(sets)} ·</span>}
          <span className="faint">
            {prevLabel} {prevSets}
            {monthly && prevSets > 0 ? ` (주 ${Math.round((prevSets / prevWeeks) * 10) / 10})` : ''}
          </span>
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
                    <StatusText sets={perWeek(n)} guide={g} />
                    <span className="tnum" style={{ fontWeight: 600, width: monthly ? 78 : 46, textAlign: 'right' }}>
                      {n}세트{monthly && n > 0 ? ` (주 ${perWeek(n)})` : ''}
                    </span>
                  </div>
                  <div style={{ marginTop: 3 }}>
                    <GuideBar sets={perWeek(n)} guide={g} height={6} />
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

import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Score, Workout, WorkoutReview } from '../types';

type Metric = Exclude<keyof WorkoutReview, 'tags'>;

/** 운동 후 체크 항목. lo/hi는 1점·5점 쪽 설명 */
export const REVIEW_METRICS: { key: Metric; label: string; lo: string; hi: string; short: string }[] = [
  { key: 'condition', label: '컨디션', short: '컨디션', lo: '안 좋음', hi: '최상' },
  { key: 'focus', label: '집중도', short: '집중', lo: '산만', hi: '몰입' },
  { key: 'fatigue', label: '운동 후 피로도', short: '피로', lo: '거뜬', hi: '녹초' },
  { key: 'pump', label: '펌프감·자극', short: '자극', lo: '거의 없음', hi: '확실' },
  { key: 'satisfaction', label: '전체 만족도', short: '만족', lo: '아쉬움', hi: '최고' },
];

export const REVIEW_TAGS = ['잠 부족', '식사 부족', '통증·불편', '시간 쫓김', '헬스장 붐빔', '개인 기록', '스트레스'];

/** 기록 목록용 한 줄 요약: "컨디션 4 · 피로 3 · 집중 5" */
export function reviewSummary(r?: WorkoutReview): string {
  if (!r) return '';
  return REVIEW_METRICS.filter((m) => r[m.key])
    .map((m) => `${m.short} ${r[m.key]}`)
    .join(' · ');
}

/** 운동 후 돌아보기: 항목별 1–5점 + 상황 태그 + 메모. 누르는 즉시 저장 */
export function ReviewCard({ w, highlight = false }: { w: Workout; highlight?: boolean }) {
  const setReview = useStore((s) => s.setWorkoutReview);
  const review = w.review ?? {};
  const [note, setNote] = useState(w.note ?? '');
  useEffect(() => {
    setNote(w.note ?? '');
  }, [w.id, w.note]);

  // 빠르게 연달아 눌러도 앞의 체크가 덮이지 않게 항상 저장소의 최신 값에서 시작
  const latest = (): WorkoutReview => useStore.getState().workouts.find((x) => x.id === w.id)?.review ?? {};

  const setScore = (key: Metric, v: Score) => {
    const next: WorkoutReview = { ...latest() };
    if (next[key] === v) delete next[key]; // 같은 점수를 다시 누르면 지움
    else next[key] = v;
    setReview(w.id, next);
  };
  const toggleTag = (t: string) => {
    const cur = latest();
    const tags = cur.tags ?? [];
    const nextTags = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
    const next: WorkoutReview = { ...cur };
    if (nextTags.length) next.tags = nextTags;
    else delete next.tags;
    setReview(w.id, next);
  };
  const filled = REVIEW_METRICS.filter((m) => review[m.key]).length;

  return (
    <div className={'card review' + (highlight ? ' highlight' : '')}>
      <div className="row" style={{ marginBottom: 4 }}>
        <div className="grow" style={{ fontWeight: 700 }}>
          오늘 운동 돌아보기
        </div>
        <span className="tiny faint">{filled ? `${filled}/${REVIEW_METRICS.length} 체크` : '선택 입력'}</span>
      </div>
      {highlight && filled === 0 && <div className="tiny muted" style={{ marginBottom: 6 }}>나중에 기록을 보면 왜 잘됐는지·안됐는지 알 수 있어요.</div>}

      {REVIEW_METRICS.map((m) => (
        <div key={m.key} className="review-metric">
          <div className="row tiny">
            <span className="grow" style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: 13 }}>
              {m.label}
            </span>
            {review[m.key] && <span className="tnum" style={{ fontWeight: 700 }}>{review[m.key]}/5</span>}
          </div>
          <div className="review-scale" role="radiogroup" aria-label={m.label}>
            {([1, 2, 3, 4, 5] as Score[]).map((v) => (
              <button
                key={v}
                role="radio"
                aria-checked={review[m.key] === v}
                aria-label={`${m.label} ${v}점`}
                className={(review[m.key] ?? 0) >= v ? 'on' : ''}
                onClick={() => setScore(m.key, v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="row tiny faint" style={{ marginTop: 2 }}>
            <span className="grow">{m.lo}</span>
            <span>{m.hi}</span>
          </div>
        </div>
      ))}

      <div className="tiny" style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: 13, margin: '10px 0 6px' }}>
        오늘 상황
      </div>
      <div className="chips wrap">
        {REVIEW_TAGS.map((t) => (
          <button key={t} className={'chip' + (review.tags?.includes(t) ? ' on' : '')} onClick={() => toggleTag(t)}>
            {t}
          </button>
        ))}
      </div>

      <textarea
        style={{ marginTop: 10, minHeight: 60 }}
        placeholder="메모 (예: 어깨가 뻐근해서 무게를 낮춤, 다음엔 벤치 먼저)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (w.note ?? '') && setReview(w.id, latest(), note)}
      />
    </div>
  );
}

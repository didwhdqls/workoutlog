import { useState } from 'react';
import { notify } from './Dialog';
import { Sheet } from './Sheet';
import { fmtDate, fmtTime } from '../lib/util';

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateInput = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const toTimeInput = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromInputs = (date: string, time: string) => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0).getTime();
};
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateInput(d.getTime());
};

/** 진행 중 운동의 언제 표시: 지난 날짜로 기록 중이면 "11월 15일 (토) 19:00–20:00" */
export const whenText = (startedAt: number, endedAt: number) => `${fmtDate(startedAt)} ${fmtTime(startedAt)}–${fmtTime(endedAt)}`;

/**
 * 언제 한 운동인지 고르는 시트.
 * - '지금 하는 중': 지금부터 타이머 (endedAt = null)
 * - '지난 운동': 날짜와 시작·끝 시각을 직접 입력
 */
export function WhenSheet({
  title = '언제 한 운동인가요?',
  okLabel = '확인',
  allowLive = true,
  initial,
  defaultDate,
  onConfirm,
  onClose,
}: {
  title?: string;
  okLabel?: string;
  allowLive?: boolean;
  /** 이미 정해 둔 시간 (endedAt null = 지금 하는 중) */
  initial?: { startedAt: number; endedAt: number | null };
  /** 지난 운동 모드의 기본 날짜 (YYYY-MM-DD). 없으면 어제 */
  defaultDate?: string;
  onConfirm: (startedAt: number, endedAt: number | null) => void;
  onClose: () => void;
}) {
  const wasPast = initial ? initial.endedAt != null : !allowLive;
  const [past, setPast] = useState(wasPast || !!defaultDate);
  const [date, setDate] = useState(
    initial?.endedAt != null ? toDateInput(initial.startedAt) : (defaultDate ?? daysAgo(1)),
  );
  const [start, setStart] = useState(
    initial?.endedAt != null ? toTimeInput(initial.startedAt) : initial ? toTimeInput(initial.startedAt) : '19:00',
  );
  const [end, setEnd] = useState(() => {
    if (initial?.endedAt != null) return toTimeInput(initial.endedAt);
    if (initial) return toTimeInput(Math.max(initial.startedAt + 3600_000, Date.now()));
    return '20:00';
  });
  const today = toDateInput(Date.now());

  const confirm = async () => {
    if (!past) {
      // 지금 하는 중으로 바꾸면 이미 지난 시간부터 이어서 재지 않고, 지금부터 다시 잼
      onConfirm(initial && initial.endedAt == null ? initial.startedAt : Date.now(), null);
      return;
    }
    if (!date) return notify('날짜를 골라 주세요', '');
    const startedAt = fromInputs(date, start || '00:00');
    let endedAt = fromInputs(date, end || start || '00:00');
    if (endedAt < startedAt) endedAt += 24 * 3600 * 1000; // 자정을 넘긴 운동
    if (startedAt > Date.now()) return notify('아직 오지 않은 시간이에요', '오늘 이전의 날짜나 이미 지난 시각을 골라 주세요.');
    onConfirm(startedAt, endedAt);
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <button className="btn primary block" onClick={confirm}>
          {okLabel}
        </button>
      }
    >
      {allowLive && (
        <div className="seg" style={{ marginBottom: 12 }}>
          <button className={!past ? 'on' : ''} onClick={() => setPast(false)}>
            지금 하는 중
          </button>
          <button className={past ? 'on' : ''} onClick={() => setPast(true)}>
            지난 운동 기록
          </button>
        </div>
      )}
      {past ? (
        <>
          <div className="chips" style={{ marginBottom: 10 }}>
            {[
              ['오늘', 0],
              ['어제', 1],
              ['그제', 2],
            ].map(([label, n]) => {
              const v = daysAgo(n as number);
              return (
                <button key={v} className={'chip' + (date === v ? ' on' : '')} onClick={() => setDate(v)}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="card edit-when" style={{ margin: 0 }}>
            <label>
              <span>날짜</span>
              <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              <span>시작</span>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              <span>끝</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <p className="tiny faint" style={{ margin: '10px 2px 0' }}>
            세트를 다 적고 완료를 누르면 이 날짜로 저장돼요. 이전 기록 힌트도 이 날짜 전의 기록으로 보여 줘요.
          </p>
        </>
      ) : (
        <p className="small muted" style={{ margin: '4px 2px' }}>
          지금부터 운동 시간을 재요. 끝나면 완료를 누른 시각으로 저장돼요.
        </p>
      )}
    </Sheet>
  );
}

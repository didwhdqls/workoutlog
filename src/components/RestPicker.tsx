import { useState } from 'react';
import { fmtRest } from '../lib/util';
import { Sheet } from './Sheet';

const PRESETS = [30, 45, 60, 90, 120, 150, 180, 240, 300];
const MAX = 60 * 60;

/** 휴식 시간 고르기: 자주 쓰는 값 + ±버튼 + 분/초 직접 입력 (1초 단위) */
export function RestPicker({
  title = '휴식 시간',
  value,
  onPick,
  onClose,
}: {
  title?: string;
  value: number;
  onPick: (sec: number) => void;
  onClose: () => void;
}) {
  const [sec, setSec] = useState(value);
  const clamp = (v: number) => Math.min(MAX, Math.max(0, Math.round(v)));
  const m = Math.floor(sec / 60);
  const s = sec % 60;

  const num = (v: string) => (v.trim() === '' ? 0 : Number(v.replace(/[^0-9]/g, '')) || 0);

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <button
          className="btn primary block"
          onClick={() => {
            onPick(sec);
            onClose();
          }}
        >
          {sec > 0 ? `${fmtRest(sec)}로 저장` : '휴식 타이머 끄기'}
        </button>
      }
    >
      <div className="rest-pick">
        <div className="rest-pick-value tnum">{fmtRest(sec)}</div>

        <div className="rest-pick-inputs">
          <label>
            <input
              inputMode="numeric"
              value={String(m)}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setSec(clamp(num(e.target.value) * 60 + s))}
              aria-label="분"
            />
            분
          </label>
          <label>
            <input
              inputMode="numeric"
              value={String(s)}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setSec(clamp(m * 60 + Math.min(59, num(e.target.value))))}
              aria-label="초"
            />
            초
          </label>
        </div>

        <div className="rest-pick-steps">
          {[-30, -5, 5, 30].map((d) => (
            <button key={d} className="btn sm" onClick={() => setSec((v) => clamp(v + d))}>
              {d > 0 ? '+' : '−'}
              {Math.abs(d)}초
            </button>
          ))}
        </div>

        <div className="chips wrap" style={{ justifyContent: 'center' }}>
          {PRESETS.map((p) => (
            <button key={p} className={'chip' + (sec === p ? ' on' : '')} onClick={() => setSec(p)}>
              {fmtRest(p)}
            </button>
          ))}
          <button className={'chip' + (sec === 0 ? ' on' : '')} onClick={() => setSec(0)}>
            끔
          </button>
        </div>
      </div>
    </Sheet>
  );
}

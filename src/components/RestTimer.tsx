import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { beep, buzz, cancelChime, scheduleChime } from '../lib/sound';
import { fmtDuration } from '../lib/util';

/** 화면 하단에 떠 있는 휴식 타이머. 종료 시각(endAt)을 저장하므로 화면을 꺼도 시간이 맞습니다. */
export function RestTimer({ overTab }: { overTab: boolean }) {
  const rest = useStore((s) => s.rest);
  const settings = useStore((s) => s.settings);
  const adjust = useStore((s) => s.adjustRest);
  const stop = useStore((s) => s.stopRest);
  const [now, setNow] = useState(Date.now());
  const [finishedFor, setFinishedFor] = useState<number | null>(null);
  const firedFor = useRef<number | null>(null);

  // 끝나는 시각에 알림음 미리 예약 (+15초 등으로 바뀌면 다시 예약, 휴식을 끄면 취소)
  const endAtKey = rest?.endAt ?? null;
  useEffect(() => {
    if (endAtKey != null && settings.sound) scheduleChime(endAtKey);
    else cancelChime();
  }, [endAtKey, settings.sound]);

  useEffect(() => {
    if (!rest) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [rest]);

  useEffect(() => {
    if (!rest) return;
    const endAt = rest.endAt;
    const remaining = endAt - now;
    if (remaining > 0 || firedFor.current === endAt) return;
    firedFor.current = endAt;
    const stale = -remaining > 5000; // 앱을 다시 열었을 때 이미 한참 지났다면 조용히 정리
    if (!stale) {
      if (settings.sound) beep(endAt);
      if (settings.vibrate) buzz();
      setFinishedFor(endAt);
    }
    // 그 사이 새 휴식이 시작됐다면 건드리지 않습니다.
    window.setTimeout(
      () => {
        if (useStore.getState().rest?.endAt === endAt) useStore.getState().stopRest();
      },
      stale ? 0 : 2500,
    );
  }, [rest, now, settings.sound, settings.vibrate]);

  if (!rest) return null;
  const finished = finishedFor === rest.endAt;
  const remaining = Math.max(0, Math.ceil((rest.endAt - now) / 1000));
  const pct = Math.min(100, Math.max(0, (remaining / rest.total) * 100));

  return (
    <div className={'rest' + (overTab ? ' over-tab' : '') + (finished ? ' finished' : '')} role="timer" aria-live="polite">
      <div className="rest-inner">
        <div className="rest-progress" style={{ width: `${pct}%` }} />
        <div className="rest-row">
          <div className="grow">
            <div className="tiny" style={{ opacity: 0.75 }}>
              {finished ? '휴식 끝! 다음 세트' : `휴식 · ${rest.label}`}
            </div>
            <div className="rest-time">{finished ? '0:00' : fmtDuration(remaining)}</div>
          </div>
          {!finished && (
            <>
              <button className="btn sm" onClick={() => adjust(-15)}>
                −15
              </button>
              <button className="btn sm" onClick={() => adjust(15)}>
                +15
              </button>
              <button className="btn sm primary" onClick={stop}>
                건너뛰기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

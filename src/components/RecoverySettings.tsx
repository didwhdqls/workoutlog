import { useState } from 'react';
import { SUB_LABEL, SUBS_BY_GROUP } from '../data/muscles';
import { RECOVERY_HOURS, RECOVERY_MAX, RECOVERY_MIN, recoveryHours } from '../lib/fatigue';
import { useStore } from '../store';
import { MUSCLE_LABEL, MUSCLE_ORDER } from '../types';
import { Icon } from './Icon';

const STEP = 12;
const fmtH = (h: number) => (h % 24 === 0 ? `${h / 24}일` : h > 24 ? `${(h / 24).toFixed(1)}일` : `${h}시간`);

/** 설정: 근육 피로도의 부위별 회복 시간 조절 (12시간 단위) */
export function RecoverySettings() {
  const overrides = useStore((s) => s.settings.recoveryHours);
  const update = useStore((s) => s.updateSettings);
  const [open, setOpen] = useState(false);
  const changed = Object.keys(overrides ?? {}).length;

  const set = (sub: keyof typeof RECOVERY_HOURS, h: number) => {
    const next = { ...(overrides ?? {}) };
    if (h === RECOVERY_HOURS[sub]) delete next[sub];
    else next[sub] = h;
    update({ recoveryHours: next });
  };

  return (
    <>
      <button className="list-item" onClick={() => setOpen((x) => !x)}>
        <span className="grow">
          부위별 회복 시간
          <div className="tiny faint">근육 피로도에서 다 회복되기까지 걸리는 시간{changed ? ` · ${changed}개 바꿈` : ''}</div>
        </span>
        <Icon name={open ? 'up' : 'down'} size={16} />
      </button>
      {open && (
        <div style={{ padding: '4px 12px 10px' }}>
          {MUSCLE_ORDER.filter((g) => SUBS_BY_GROUP[g].length).map((g) => (
            <div key={g} style={{ marginTop: 8 }}>
              <div className="tiny faint" style={{ marginBottom: 2 }}>
                {MUSCLE_LABEL[g]}
              </div>
              {SUBS_BY_GROUP[g].map((sub) => {
                const h = recoveryHours(sub, overrides);
                const isDefault = h === RECOVERY_HOURS[sub];
                return (
                  <div key={sub} className="row" style={{ gap: 6, padding: '3px 0' }}>
                    <span className="grow small">
                      {SUB_LABEL[sub]}
                      {!isDefault && (
                        <button className="tiny faint" style={{ background: 'none', marginLeft: 6, textDecoration: 'underline' }} onClick={() => set(sub, RECOVERY_HOURS[sub])}>
                          기본 {fmtH(RECOVERY_HOURS[sub])}
                        </button>
                      )}
                    </span>
                    <button className="btn soft sm" style={{ width: 34, padding: 0 }} disabled={h <= RECOVERY_MIN} onClick={() => set(sub, Math.max(RECOVERY_MIN, h - STEP))} aria-label={`${SUB_LABEL[sub]} 회복 시간 줄이기`}>
                      −
                    </button>
                    <span className="tnum small" style={{ width: 52, textAlign: 'center', fontWeight: isDefault ? 500 : 700, color: isDefault ? undefined : 'var(--accent)' }}>
                      {fmtH(h)}
                    </span>
                    <button className="btn soft sm" style={{ width: 34, padding: 0 }} disabled={h >= RECOVERY_MAX} onClick={() => set(sub, Math.min(RECOVERY_MAX, h + STEP))} aria-label={`${SUB_LABEL[sub]} 회복 시간 늘리기`}>
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="row" style={{ marginTop: 10 }}>
            <span className="tiny faint grow">12시간 단위 · 최소 12시간, 최대 5일</span>
            {changed > 0 && (
              <button className="btn ghost sm" onClick={() => update({ recoveryHours: {} })}>
                모두 기본값으로
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

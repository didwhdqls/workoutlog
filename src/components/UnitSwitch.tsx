import { useState } from 'react';
import { convertWeight } from '../lib/stats';
import { unitLabel } from '../lib/util';
import { useStore } from '../store';
import type { Variant, WeightUnit } from '../types';
import { ask, notify } from './Dialog';
import { Icon } from './Icon';
import { ActionSheet } from './Sheet';

/**
 * 세트 표 머리의 무게 단위 버튼. 누르면 kg·lb·칸 중에서 고름.
 * 단위는 기구에 저장되므로 다음 기록에도 그대로 쓰임.
 * 그 기구의 지난 기록이 있으면 새 단위로 환산할지 물어봄 (kg ↔ lb).
 * onConverted: 환산했을 때 화면에서 고치던 초안(완료 기록 수정 중)도 같은 방식으로 바꾸라고 알려 줌
 */
export function UnitSwitch({
  variant,
  prefix = '',
  onConverted,
}: {
  variant: Variant | undefined;
  prefix?: string;
  onConverted?: (variantId: string, from: WeightUnit, to: WeightUnit) => void;
}) {
  const workouts = useStore((s) => s.workouts);
  const changeVariantUnit = useStore((s) => s.changeVariantUnit);
  const [open, setOpen] = useState(false);
  const unit = variant?.unit ?? 'kg';

  const change = async (to: WeightUnit) => {
    setOpen(false);
    if (!variant || to === unit) return;
    const past = workouts.filter((w) => w.exercises.some((e) => e.variantId === variant.id && e.sets.some((x) => x.done))).length;
    let convert = false;
    if (past > 0 && unit !== 'level' && to !== 'level') {
      const ex = unit === 'kg' ? '50kg → 110.2lb' : '110lb → 49.9kg';
      convert = await ask({
        title: `지난 기록 ${past}번을 ${unitLabel(to)}로 환산할까요?`,
        message: `지금까지 ${unitLabel(unit)}로 적은 기록이면 환산하세요 (${ex}). 원래 ${unitLabel(to)} 숫자를 ${unitLabel(unit)}로 잘못 표시했던 거라면 숫자는 그대로 두세요.`,
        ok: '환산하기',
        cancel: '숫자 그대로',
      });
    }
    changeVariantUnit(variant.id, to, convert);
    if (convert) onConverted?.(variant.id, unit, to);
  };

  return (
    <>
      <button
        className="unit-btn"
        onClick={() =>
          variant
            ? setOpen(true)
            : notify('기구를 먼저 골라 주세요', '무게 단위는 기구마다 정해져요. 기구를 고른 뒤 바꿔 주세요.')
        }
        aria-label="무게 단위 바꾸기"
      >
        {prefix}
        {unitLabel(unit)}
        <Icon name="down" size={10} />
      </button>
      {open && (
        <ActionSheet
          title="무게 단위"
          onClose={() => setOpen(false)}
          actions={(['kg', 'lb', 'level'] as WeightUnit[]).map((u) => ({
            label: u === 'kg' ? 'kg (킬로그램)' : u === 'lb' ? 'lb (파운드)' : '칸 (핀 번호)',
            active: unit === u,
            onClick: () => change(u),
          }))}
        />
      )}
    </>
  );
}

/** 초안의 무게를 단위에 맞게 바꾸기 (스토어 환산과 같은 반올림) */
export const convertSets = <T extends { weight: number | null }>(sets: T[], from: WeightUnit, to: WeightUnit): T[] =>
  sets.map((s) => ({ ...s, weight: convertWeight(s.weight, from, to) }));

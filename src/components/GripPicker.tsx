import { useState } from 'react';
import { GRIP_LABEL, GRIP_ORDER, type Grip } from '../types';
import { Icon } from './Icon';
import { ActionSheet } from './Sheet';

/** "그립: 뉴트럴" 칩. 누르면 그립 선택 시트 */
export function GripChip({ grip, onChange, hint }: { grip?: Grip; onChange: (g: Grip | undefined) => void; hint?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={'grip-btn' + (grip ? ' on' : '')} onClick={() => setOpen(true)}>
        <Icon name="grip" size={13} stroke={3} />
        {grip ? GRIP_LABEL[grip] : '기본 그립'}
      </button>
      {open && (
        <ActionSheet
          title={hint ?? '그립'}
          onClose={() => setOpen(false)}
          actions={[
            { label: '기본 그립 (지정 안 함)', active: !grip, onClick: () => onChange(undefined) },
            ...GRIP_ORDER.map((g) => ({ label: GRIP_LABEL[g], active: grip === g, onClick: () => onChange(g) })),
          ]}
        />
      )}
    </>
  );
}

export const gripText = (grip?: Grip) => (grip ? GRIP_LABEL[grip] : '');

/** "뉴트럴 그립으로", "로프로" (받침에 따라 조사) */
export function withRo(word: string): string {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return `${word}로`;
  const jong = (c - 0xac00) % 28;
  return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`; // 받침 없음·ㄹ → 로
}

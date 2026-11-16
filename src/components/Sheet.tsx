import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export function Sheet({
  title,
  onClose,
  children,
  footer,
  headerExtra,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 className="ellipsis">{title}</h2>
          {headerExtra}
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** 간단한 선택지 시트 */
export function ActionSheet({
  title,
  actions,
  onClose,
}: {
  title: ReactNode;
  actions: { label: ReactNode; onClick: () => void; danger?: boolean; active?: boolean }[];
  onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="list">
        {actions.map((a, i) => (
          <button
            key={i}
            className="list-item"
            style={{ color: a.danger ? 'var(--danger)' : a.active ? 'var(--accent)' : undefined, fontWeight: a.active ? 700 : 500 }}
            onClick={() => {
              onClose();
              a.onClick();
            }}
          >
            <span className="grow">{a.label}</span>
            {a.active && <Icon name="check" size={18} />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

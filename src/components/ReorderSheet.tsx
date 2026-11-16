import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

export interface ReorderItem {
  id: string;
  title: string;
  sub?: string;
}

/**
 * 운동 순서 바꾸기. 왼쪽 ⠿ 손잡이를 끌거나 ▲▼ 버튼으로 옮기고 "완료"를 누르면 저장.
 */
export function ReorderSheet({
  items,
  onSave,
  onClose,
}: {
  items: ReorderItem[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [order, setOrder] = useState(items);
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null);
  // 이벤트가 렌더보다 빨리 와도 최신 값을 쓰도록 ref로 보관
  const start = useRef({ y: 0, rowH: 56, id: null as string | null });
  const orderRef = useRef(order);
  orderRef.current = order;

  const move = (from: number, to: number) =>
    setOrder((o) => {
      if (to < 0 || to >= o.length || from === to) return o;
      const next = [...o];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return next;
    });

  const end = () => {
    start.current.id = null;
    setDrag(null);
  };

  const changed = order.some((x, i) => x.id !== items[i]?.id);

  return (
    <Sheet
      title="운동 순서 바꾸기"
      onClose={onClose}
      footer={
        <button
          className="btn primary block"
          onClick={() => {
            if (changed) onSave(order.map((x) => x.id));
            onClose();
          }}
        >
          완료
        </button>
      }
    >
      <p className="tiny faint" style={{ margin: '0 2px 10px' }}>
        ⠿ 손잡이를 위아래로 끌거나 화살표로 옮기세요.
      </p>
      <div className="list reorder">
        {order.map((x, i) => {
          const dragging = drag?.id === x.id;
          return (
            <div
              key={x.id}
              className={'list-item reorder-row' + (dragging ? ' dragging' : '')}
              style={dragging ? { transform: `translateY(${drag.dy}px)` } : undefined}
            >
              <span
                className="reorder-handle"
                aria-hidden
                onPointerDown={(e) => {
                  e.preventDefault();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    /* 캡처 실패해도 이동은 동작 */
                  }
                  const row = e.currentTarget.parentElement as HTMLElement;
                  start.current = { y: e.clientY, rowH: row.getBoundingClientRect().height, id: x.id };
                  setDrag({ id: x.id, dy: 0 });
                }}
                onPointerMove={(e) => {
                  if (start.current.id !== x.id) return;
                  let dy = e.clientY - start.current.y;
                  const h = start.current.rowH;
                  const cur = orderRef.current;
                  const idx = cur.findIndex((o) => o.id === x.id);
                  // 반 칸 넘게 끌면 한 칸 이동하고 기준점도 그만큼 옮김
                  if (dy > h / 2 && idx < cur.length - 1) {
                    orderRef.current = swap(cur, idx, idx + 1);
                    move(idx, idx + 1);
                    start.current.y += h;
                    dy -= h;
                  } else if (dy < -h / 2 && idx > 0) {
                    orderRef.current = swap(cur, idx, idx - 1);
                    move(idx, idx - 1);
                    start.current.y -= h;
                    dy += h;
                  }
                  setDrag({ id: x.id, dy });
                }}
                onPointerUp={end}
                onPointerCancel={end}
              >
                <Icon name="grip" size={20} stroke={3} />
              </span>
              <span className="reorder-no tnum">{i + 1}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="title ellipsis">{x.title}</div>
                {x.sub && <div className="sub ellipsis">{x.sub}</div>}
              </div>
              <button className="icon-btn" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`${x.title} 위로`}>
                <Icon name="up" size={18} />
              </button>
              <button className="icon-btn" disabled={i === order.length - 1} onClick={() => move(i, i + 1)} aria-label={`${x.title} 아래로`}>
                <Icon name="down" size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function swap<T>(list: T[], i: number, j: number): T[] {
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

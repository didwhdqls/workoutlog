import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

/**
 * 브라우저 기본 confirm()/prompt()/alert() 대신 쓰는 앱 안 확인 창.
 * 일부 환경(앱 안 웹뷰, 일부 PWA)은 기본 대화상자를 막아 버려서
 * confirm()이 항상 false를 돌려주므로 버튼이 아무 반응이 없는 것처럼 보입니다.
 *
 *   if (await ask({ title: '삭제할까요?', ok: '삭제', danger: true })) ...
 *   const name = await askText({ title: '헬스장 이름' });
 */

interface Base {
  id: number;
  title: string;
  message?: string;
  ok: string;
}
type Req =
  | (Base & { kind: 'confirm'; cancel: string; danger?: boolean; resolve: (v: boolean) => void })
  | (Base & { kind: 'prompt'; value: string; placeholder?: string; allowEmpty?: boolean; decimal?: boolean; resolve: (v: string | null) => void })
  | (Base & { kind: 'alert'; resolve: () => void });

const useDialogs = create<{ queue: Req[] }>(() => ({ queue: [] }));
let seq = 0;

type Omit2<T> = T extends unknown ? Omit<T, 'id'> : never;
function push(r: Omit2<Req>) {
  useDialogs.setState((s) => ({ queue: [...s.queue, { ...r, id: ++seq } as Req] }));
}

export function ask(o: { title: string; message?: string; ok?: string; cancel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) =>
    push({ kind: 'confirm', title: o.title, message: o.message, ok: o.ok ?? '확인', cancel: o.cancel ?? '취소', danger: o.danger, resolve }),
  );
}

/** 취소면 null, 아니면 앞뒤 공백을 뺀 값. allowEmpty가 아니면 빈 값도 null */
export function askText(o: {
  title: string;
  message?: string;
  value?: string;
  placeholder?: string;
  ok?: string;
  /** 빈 값으로 저장(지우기) 허용: 빈 문자열을 돌려줌 */
  allowEmpty?: boolean;
  /** 숫자 키패드 */
  decimal?: boolean;
}): Promise<string | null> {
  return new Promise((resolve) =>
    push({
      kind: 'prompt',
      title: o.title,
      message: o.message,
      value: o.value ?? '',
      placeholder: o.placeholder,
      allowEmpty: o.allowEmpty,
      decimal: o.decimal,
      ok: o.ok ?? '확인',
      resolve,
    }),
  );
}

export function notify(title: string, message?: string): Promise<void> {
  return new Promise((resolve) => push({ kind: 'alert', title, message, ok: '확인', resolve }));
}

/** App에 한 번만 둡니다. 여러 요청이 오면 순서대로 하나씩 보여 줍니다. */
export function DialogHost() {
  const req = useDialogs((s) => s.queue[0]);
  if (!req) return null;
  return createPortal(<DialogView key={req.id} req={req} />, document.body);
}

function DialogView({ req }: { req: Req }) {
  const [text, setText] = useState(req.kind === 'prompt' ? req.value : '');

  const close = (ok: boolean) => {
    useDialogs.setState((s) => ({ queue: s.queue.filter((r) => r.id !== req.id) }));
    if (req.kind === 'confirm') req.resolve(ok);
    else if (req.kind === 'prompt') req.resolve(ok && (text.trim() || req.allowEmpty) ? text.trim() : null);
    else req.resolve();
  };

  useEffect(() => {
    // 캡처 단계에서 막아야 아래 깔린 시트가 Esc로 같이 닫히지 않음
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const danger = req.kind === 'confirm' && req.danger;
  return (
    <div className="dialog-backdrop" onClick={() => close(false)}>
      <form
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          close(true);
        }}
      >
        <h2 id="dialog-title">{req.title}</h2>
        {req.message && <p>{req.message}</p>}
        {req.kind === 'prompt' && (
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={req.placeholder} autoFocus enterKeyHint="done" inputMode={req.decimal ? 'decimal' : undefined} />
        )}
        <div className="dialog-actions">
          {req.kind !== 'alert' && (
            <button type="button" className="btn" onClick={() => close(false)} autoFocus={req.kind === 'confirm'}>
              {req.kind === 'confirm' ? req.cancel : '취소'}
            </button>
          )}
          <button
            type="submit"
            className={'btn ' + (danger ? 'danger solid' : 'primary')}
            disabled={req.kind === 'prompt' && !req.allowEmpty && !text.trim()}
          >
            {req.ok}
          </button>
        </div>
      </form>
    </div>
  );
}

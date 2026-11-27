import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ask, askText, notify } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { RestPicker } from '../components/RestPicker';
import { previewChime } from '../lib/sound';
import { saveBackupNative } from '../lib/native';
import { fmtRest } from '../lib/util';
import { exportData, useStore, type DataState } from '../store';

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className="list-item" onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="grow">{label}</span>
      <span
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          background: on ? 'var(--ok)' : 'var(--surface-3)',
          position: 'relative',
          transition: 'background .15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: on ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: 10,
            background: '#fff',
            transition: 'left .15s',
          }}
        />
      </span>
    </button>
  );
}

export function Settings() {
  const settings = useStore((s) => s.settings);
  const gyms = useStore((s) => s.gyms);
  const counts = { w: useStore((s) => s.workouts.length), r: useStore((s) => s.routines.length) };
  const update = useStore((s) => s.updateSettings);
  const addGym = useStore((s) => s.addGym);
  const renameGym = useStore((s) => s.renameGym);
  const deleteGym = useStore((s) => s.deleteGym);
  const importData = useStore((s) => s.importData);
  const resetAll = useStore((s) => s.resetAll);
  const navigate = useNavigate();
  const [restMenu, setRestMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    const d = new Date();
    const name = `workoutlog-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    // 안드로이드 앱: 공유 창으로 (드라이브·카톡·파일 앱 등에 저장)
    try {
      if (await saveBackupNative(name, exportData())) return;
    } catch {
      await notify('백업을 만들지 못했어요', '다시 시도해 주세요.');
      return;
    }
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<DataState> & { app?: string };
      if (data.app !== 'machinelog' || !Array.isArray(data.workouts)) throw new Error('운동기록 백업 파일 형식이 아니에요.');
      const ok = await ask({
        title: '백업 가져오기',
        message: `운동 ${data.workouts.length}개가 든 백업이에요. 지금 데이터를 이 백업으로 바꿀까요?`,
        ok: '바꾸기',
        danger: true,
      });
      if (!ok) return;
      importData(data);
      await notify('가져오기 완료');
    } catch (e) {
      await notify('가져오기 실패', (e as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로">
          <Icon name="back" />
        </button>
        <h1 className="small">설정</h1>
      </div>

      <div className="section-title">운동</div>
      <div className="list">
        <button className="list-item" onClick={() => setRestMenu(true)}>
          <span className="grow">기본 휴식 시간</span>
          <span className="muted">{fmtRest(settings.defaultRestSec)}</span>
          <Icon name="chevron" size={18} />
        </button>
        <button className="list-item" onClick={() => update({ weekStart: settings.weekStart === 0 ? 1 : 0 })}>
          <span className="grow">주 시작 요일 (주간 통계 기준)</span>
          <span className="muted">{settings.weekStart === 0 ? '일요일' : '월요일'}</span>
          <Icon name="swap" size={16} />
        </button>
        <Toggle label="휴식 종료 알림음" on={settings.sound} onChange={(v) => update({ sound: v })} />
        <button className="list-item" onClick={() => previewChime()}>
          <span className="grow">
            알림음 미리 듣기
            <div className="tiny faint">짧은 두 음이에요. 이어폰을 끼고 있으면 이어폰으로 나와요.</div>
          </span>
          <Icon name="play" size={16} />
        </button>
        <Toggle label="휴식 종료 진동 (안드로이드)" on={settings.vibrate} onChange={(v) => update({ vibrate: v })} />
      </div>

      <div className="section-title">
        헬스장
        <button
          className="btn ghost sm"
          onClick={async () => {
            const name = await askText({ title: '새 헬스장', placeholder: '예: 회사 앞 OO짐', ok: '추가' });
            if (name) addGym(name);
          }}
        >
          <Icon name="plus" size={16} /> 추가
        </button>
      </div>
      <div className="list">
        {gyms.length === 0 && (
          <div className="list-item small muted">
            다니는 헬스장을 등록하면, 운동할 때 그 헬스장에서 마지막으로 쓴 기구가 자동으로 선택돼요.
          </div>
        )}
        {gyms.map((g) => (
          <div key={g.id} className="list-item">
            <Icon name="pin" size={18} />
            <span className="grow">{g.name}</span>
            <button
              className="icon-btn"
              aria-label="이름 바꾸기"
              onClick={async () => {
                const name = await askText({ title: '헬스장 이름 바꾸기', value: g.name, ok: '저장' });
                if (name) renameGym(g.id, name);
              }}
            >
              <Icon name="edit" size={18} />
            </button>
            <button
              className="icon-btn"
              aria-label="삭제"
              onClick={async () => {
                if (await ask({ title: '헬스장 삭제', message: `"${g.name}"을(를) 삭제할까요? 기록은 남아요.`, ok: '삭제', danger: true }))
                  deleteGym(g.id);
              }}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="section-title">데이터</div>
      <p className="tiny faint" style={{ margin: '-2px 2px 8px' }}>
        기록은 이 기기의 브라우저에만 저장돼요. 폰을 바꾸거나 브라우저 데이터를 지우기 전에 백업하세요. (운동 {counts.w}개 · 루틴 {counts.r}개)
      </p>
      <div className="list">
        <button className="list-item" onClick={doExport}>
          <Icon name="download" size={18} />
          <span className="grow">백업 파일로 내보내기</span>
        </button>
        <button className="list-item" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={18} />
          <span className="grow">백업 파일 가져오기</span>
        </button>
        <button
          className="list-item"
          style={{ color: 'var(--danger)' }}
          onClick={async () => {
            if (
              (await ask({ title: '전체 초기화', message: '모든 기록·루틴·직접 등록한 기구를 지울까요? 되돌릴 수 없어요.', ok: '다음', danger: true })) &&
              (await ask({ title: '정말 지울까요?', message: '백업하지 않았다면 기록을 되찾을 방법이 없어요.', ok: '모두 지우기', danger: true }))
            ) {
              resetAll();
              navigate('/', { replace: true });
            }
          }}
        >
          <Icon name="trash" size={18} />
          <span className="grow">전체 초기화</span>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void doImport(f);
          e.target.value = '';
        }}
      />

      <p className="tiny faint" style={{ textAlign: 'center', marginTop: 28 }}>
        운동기록 v0.1 · 홈 화면에 추가하면 앱처럼 쓸 수 있어요
      </p>

      {restMenu && (
        <RestPicker
          title="기본 휴식 시간"
          value={settings.defaultRestSec}
          onPick={(sec) => update({ defaultRestSec: sec })}
          onClose={() => setRestMenu(false)}
        />
      )}
    </div>
  );
}

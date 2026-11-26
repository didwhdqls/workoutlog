// 안드로이드 앱(APK)에서만 쓰는 기능.
// 웹(홈 화면 앱)에서는 아무것도 하지 않습니다.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNative = () => Capacitor.isNativePlatform();

const REST_ID = 7001;
const CHANNEL = 'rest-end';

// ─── 휴식 끝 알림 ───────────────────────────────────────────
// 화면이 켜져 있을 때는 앱 안 알림음이 울리므로, 앱이 화면에서 사라질 때(화면 꺼짐·다른 앱)만
// 휴식이 끝나는 시각에 폰 알림을 예약하고, 앱으로 돌아오면 취소합니다.
let current: { endAt: number; label: string } | null = null;
let ready: Promise<boolean> | null = null;

function prepare(): Promise<boolean> {
  if (!ready) {
    ready = (async () => {
      try {
        let p = await LocalNotifications.checkPermissions();
        if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await LocalNotifications.requestPermissions();
        if (p.display !== 'granted') return false;
        await LocalNotifications.createChannel({
          id: CHANNEL,
          name: '휴식 끝 알림',
          description: '휴식 타이머가 끝나면 짧게 알려요',
          importance: 4,
          visibility: 1,
          vibration: true,
        });
        return true;
      } catch {
        return false;
      }
    })();
  }
  return ready;
}

async function schedule() {
  if (!current) return;
  const { endAt, label } = current;
  if (endAt - Date.now() < 1000) return;
  if (!(await prepare())) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_ID,
          title: '휴식 끝!',
          body: label ? `다음 세트 · ${label}` : '다음 세트를 시작하세요',
          channelId: CHANNEL,
          smallIcon: 'ic_stat_rest',
          schedule: { at: new Date(endAt), allowWhileIdle: true },
          autoCancel: true,
        },
      ],
    });
  } catch {
    /* 알림 권한 없음 등: 조용히 넘어감 */
  }
}

async function cancel() {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] });
  } catch {
    /* 없음 */
  }
}

let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener('visibilitychange', () => {
    if (!current) return;
    if (document.hidden) void schedule();
    else void cancel();
  });
}

/** 휴식 타이머 상태를 알려 줌 (시작·변경 시 endAt, 끝나거나 끄면 null) */
export function syncRestNotification(rest: { endAt: number; label: string } | null) {
  if (!isNative()) return;
  listen();
  current = rest;
  if (!rest) {
    void cancel();
    return;
  }
  // 첫 휴식 때 알림 권한을 미리 물어봄 (화면이 켜져 있을 때)
  void prepare();
  if (document.hidden) void schedule();
}

// ─── 백업 파일 저장 (앱에서는 다운로드 링크가 안 돼서 공유 창으로) ───
export async function saveBackupNative(fileName: string, json: string): Promise<boolean> {
  if (!isNative()) return false;
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const res = await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({ title: '운동기록 백업', files: [res.uri], dialogTitle: '백업 파일 저장·보내기' });
  return true;
}

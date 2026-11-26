// 휴식 종료 알림음.
// - 브라우저 정책상 사용자가 한 번 탭한 뒤에야 소리를 낼 수 있어서, 앱 어디든 탭할 때마다 unlockAudio()로 깨워 둡니다.
// - 휴식을 시작하면 끝나는 시각에 맞춰 소리를 미리 예약합니다(scheduleChime). 다른 앱을 잠깐 보느라
//   화면 코드가 멈춰 있어도 오디오가 살아 있으면 제때 울립니다.
// - 아이폰(사파리 16.4+)은 '짧은 알림음' 오디오 세션을 써서 이어폰으로 듣던 음악 위에 살짝 겹쳐 나오게 합니다.
let ctx: AudioContext | null = null;

type AudioSessionNav = Navigator & { audioSession?: { type: string } };

function setTransientSession() {
  try {
    const s = (navigator as AudioSessionNav).audioSession;
    if (s && s.type !== 'transient') s.type = 'transient';
  } catch {
    /* 지원 안 함 */
  }
}

export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx && AC) {
      setTransientSession();
      ctx = new AC();
      // iOS: 첫 탭에서 아주 짧은 무음을 한 번 재생해야 이후 예약한 소리가 납니다
      const b = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.connect(ctx.destination);
      src.start(0);
    }
    if (ctx && ctx.state !== 'running') void ctx.resume();
  } catch {
    /* 소리 없이 진행 */
  }
}

/** 짧은 두 음 알림 (약 0.35초). at = AudioContext 시각. 만든 노드를 돌려줘서 취소할 수 있게 함 */
function chimeAt(at: number): OscillatorNode[] {
  if (!ctx) return [];
  const notes: [number, number][] = [
    [0, 988], // B5
    [0.13, 1319], // E6
  ];
  return notes.map(([dt, freq]) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = at + dt;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t);
    osc.stop(t + 0.22);
    return osc;
  });
}

let scheduled: { endAt: number; startAt: number; nodes: OscillatorNode[] } | null = null;
/** 오디오가 깨어나길 기다리는 예약 (그 사이 취소되면 null) */
let wanted: number | null = null;

export function cancelChime() {
  wanted = null;
  if (!scheduled) return;
  for (const n of scheduled.nodes) {
    try {
      n.stop();
    } catch {
      /* 이미 끝남 */
    }
  }
  scheduled = null;
}

/** 휴식이 끝나는 시각(endAt, ms)에 알림음을 미리 예약. 휴식 시간을 바꾸면 다시 부르면 됨 */
export function scheduleChime(endAt: number) {
  cancelChime();
  if (!ctx) return;
  wanted = endAt;
  // 방금 탭해서 깨우는 중이면 깨어난 뒤 예약
  if (ctx.state !== 'running') {
    void ctx.resume().then(() => {
      if (wanted === endAt && ctx?.state === 'running') scheduleChime(endAt);
    }, () => {});
    return;
  }
  const delay = (endAt - Date.now()) / 1000;
  if (delay < 0.3) return;
  setTransientSession();
  const startAt = ctx.currentTime + delay;
  scheduled = { endAt, startAt, nodes: chimeAt(startAt) };
}

/**
 * 휴식 종료 시 알림음. 예약해 둔 소리가 이미(또는 지금) 울렸다면 다시 울리지 않음.
 * 오디오가 멈춰 있어서 예약이 울리지 못했다면 깨워서 지금 울림.
 */
export function beep(endAt?: number) {
  if (!ctx) return;
  if (scheduled && scheduled.endAt === endAt) {
    const played = ctx.state === 'running' && ctx.currentTime >= scheduled.startAt - 0.05;
    if (played) {
      scheduled = null;
      return;
    }
    cancelChime();
  }
  setTransientSession();
  const play = () => chimeAt(ctx!.currentTime + 0.02);
  if (ctx.state === 'running') play();
  else void ctx.resume().then(play, () => {});
}

/** 설정에서 미리 듣기 */
export function previewChime() {
  unlockAudio();
  if (!ctx) return;
  const play = () => chimeAt(ctx!.currentTime + 0.05);
  if (ctx.state === 'running') play();
  else void ctx.resume().then(play, () => {});
}

export function buzz() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* 지원 안 함 */
  }
}

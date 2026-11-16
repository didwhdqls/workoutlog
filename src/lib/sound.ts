// 휴식 종료 알림음. 브라우저 정책상 사용자가 한 번 탭한 뒤에야 소리를 낼 수 있어서
// 세트 완료 체크를 누를 때 unlockAudio() 를 호출해 둡니다.
let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx && AC) ctx = new AC();
    if (ctx?.state === 'suspended') void ctx.resume();
  } catch {
    /* 소리 없이 진행 */
  }
}

export function beep() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [0, 0.18, 0.36].forEach((dt, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, t0 + dt);
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + dt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.15);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t0 + dt);
    osc.stop(t0 + dt + 0.16);
  });
}

export function buzz() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* 지원 안 함 */
  }
}

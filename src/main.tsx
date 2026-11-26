import { Capacitor } from '@capacitor/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useStore } from './store';
import './styles.css';

// 개발 중 디버깅용: 콘솔에서 __store.getState() 로 데이터 확인
if (import.meta.env.DEV) (window as unknown as { __store: typeof useStore }).__store = useStore;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 배포(빌드)된 앱에서만 서비스 워커 등록 → 오프라인에서도 열림
// 안드로이드 앱(APK)은 화면 파일이 앱 안에 들어 있어 필요 없음
if (import.meta.env.PROD && 'serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

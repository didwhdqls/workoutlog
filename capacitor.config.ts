import type { CapacitorConfig } from '@capacitor/cli';

// 안드로이드 앱(APK) 설정. 화면은 웹 앱(dist)을 그대로 씁니다.
const config: CapacitorConfig = {
  appId: 'io.github.didwhdqls.workoutlog',
  appName: '운동기록',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_rest',
      iconColor: '#6b8afd',
    },
  },
};

export default config;

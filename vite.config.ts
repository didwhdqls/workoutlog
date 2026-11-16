import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' 로 두면 GitHub Pages 같은 하위 경로에도 그대로 배포할 수 있습니다.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base를 상대 경로로 두어 Electron의 file:// 로딩과 웹 호스팅 양쪽에서 같은 빌드를 쓴다.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5183, strictPort: true },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});

import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 웹 배포 때 Google 사이트 소유 확인 값을 넣는다(환경 변수 GOOGLE_SITE_VERIFICATION, 공백으로 여러 개).
function siteVerification(): Plugin {
  return {
    name: 'site-verification',
    transformIndexHtml() {
      const values = (process.env.GOOGLE_SITE_VERIFICATION ?? '').split(/\s+/).filter(Boolean);
      return values.map((content) => ({
        tag: 'meta', attrs: { name: 'google-site-verification', content }, injectTo: 'head' as const,
      }));
    },
  };
}

// base를 상대 경로로 두어 Electron의 file:// 로딩과 웹 호스팅 양쪽에서 같은 빌드를 쓴다.
export default defineConfig({
  base: './',
  plugins: [react(), siteVerification()],
  server: { port: 5183, strictPort: true },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});

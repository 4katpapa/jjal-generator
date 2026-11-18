import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadSystemFonts } from './editor/fonts';
import { boot } from './editor/session';
import { desktop } from './io/desktop';
import { useEditor } from './editor/store';
import { ensureFont } from './render/assets';
import './styles.css';

async function start() {
  const root = createRoot(document.getElementById('root')!);
  await ensureFont('Nanum Gothic');
  if (new URLSearchParams(location.search).has('selftest')) {
    const { runSelfTest, SelfTestView } = await import('./selftest');
    const report = await runSelfTest();
    (window as unknown as { __selftest: unknown }).__selftest = report;
    root.render(<SelfTestView report={report} />);
    return;
  }
  // 자동 조작 검사가 편집 상태를 읽을 수 있게 내준다.
  (window as unknown as { __editor: typeof useEditor }).__editor = useEditor;
  try {
    const saved = localStorage.getItem('jjal-backdrop');
    if (saved && (saved === 'checker' || /^#[0-9a-f]{6}$/i.test(saved))) useEditor.getState().set({ backdrop: saved });
  } catch { /* 기본 바탕으로 시작 */ }
  await boot();
  // Windows 앱에서는 설치된 글꼴을 시작할 때 바로 불러온다. 브라우저는 권한 확인이 필요해서 글꼴 목록에서 직접 고른다.
  if (desktop) void loadSystemFonts();
  root.render(<StrictMode><App /></StrictMode>);
}

void start();

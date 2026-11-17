import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { boot } from './editor/session';
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
  await boot();
  root.render(<StrictMode><App /></StrictMode>);
}

void start();

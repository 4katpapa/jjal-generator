'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { readSpecs, listFonts } = require('./system.cjs');

// 앱 이름이 '자짤 스튜디오'였던 0.x 버전의 저장 데이터를 새 이름의 저장소로 한 번 옮긴다.
function migrateUserData() {
  try {
    const next = app.getPath('userData');
    const prev = path.join(app.getPath('appData'), '자짤 스튜디오');
    if (!fs.existsSync(path.join(next, 'IndexedDB')) && fs.existsSync(path.join(prev, 'IndexedDB'))) {
      fs.cpSync(prev, next, { recursive: true });
    }
  } catch (err) {
    console.error('이전 저장 데이터를 옮기지 못했습니다:', err);
  }
}

const args = process.argv.slice(1);
const smoke = args.includes('--smoke');
const scriptArg = args.find((a) => a.startsWith('--script='));
const checking = smoke || !!scriptArg;

// 자동 검사 실행은 사용자의 저장 데이터와 섞이지 않도록 임시 저장소를 쓴다.
if (checking) {
  app.setPath('userData', path.join(app.getPath('temp'), `jjal-studio-check-${process.pid}`));
}

function load(win, query) {
  const dev = process.env.JJAL_DEV_URL;
  if (dev) return win.loadURL(`${dev}${query ? `?${query}` : ''}`);
  return win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), query ? { search: query } : undefined);
}

async function runSmoke(win) {
  const started = Date.now();
  let report = null;
  while (Date.now() - started < 120000) {
    report = await win.webContents.executeJavaScript('window.__selftest ? JSON.stringify(window.__selftest) : null');
    if (report) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const parsed = report ? JSON.parse(report) : { passed: 0, failed: 1, results: [{ name: '검사 실행', ok: false, detail: '시간 초과' }] };
  const desktop = await readSpecs();
  const fonts = await listFonts();
  const result = {
    passed: parsed.passed,
    failed: parsed.failed,
    ms: parsed.ms,
    failures: parsed.results.filter((r) => !r.ok),
    desktop: { specRows: desktop.rows, specError: desktop.error ?? null, fontCount: fonts.length },
  };
  fs.writeFileSync(path.join(process.cwd(), 'smoke-result.json'), JSON.stringify(result, null, 2));
  app.exit(parsed.failed === 0 ? 0 : 1);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    show: !smoke,
    backgroundColor: '#17181c',
    autoHideMenuBar: true,
    title: '자짤생성툴 v2',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: !checking,
    },
  });
  win.setMenuBarVisibility(false);
  // 앱 안에서 다른 사이트로 넘어가지 않게 한다. 바깥 링크는 기본 브라우저로 연다.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (smoke) {
    void load(win, 'selftest=1').then(() => runSmoke(win));
  } else if (scriptArg) {
    void load(win).then(async () => {
      try {
        await require(path.resolve(scriptArg.slice('--script='.length)))(win);
        app.exit(0);
      } catch (err) {
        console.error(err);
        app.exit(1);
      }
    });
  } else {
    void load(win);
  }
}

ipcMain.handle('specs:read', () => readSpecs());
ipcMain.handle('fonts:list', () => listFonts());

// 자동 검사 중에 화면을 못 불러오면 멈춰 있지 말고 실패로 끝낸다.
process.on('unhandledRejection', (err) => {
  console.error(err);
  if (checking) app.exit(1);
});

if (!checking) migrateUserData();

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

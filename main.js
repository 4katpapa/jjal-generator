'use strict';
const { app, BrowserWindow, ipcMain, dialog, session, shell, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { readSpecs } = require('./specReader');

// 개발 실행(name: speccard)과 포터블 빌드(productName: 자짤 생성툴)가
// 같은 저장 폴더를 쓰도록 userData 경로 고정
// 자동 QA는 실제 사용자 데이터를 절대 건드리지 않도록 명시적 격리 경로를 받을 수 있다.
const isolatedUserData = process.env.SPECCARD_USER_DATA;
app.setPath('userData', isolatedUserData
  ? path.resolve(isolatedUserData)
  : path.join(app.getPath('appData'), 'speccard'));

const MAX_IMAGE_BYTES = 64 * 1024 * 1024;
const RECOVERY_FILE = 'recovery-v2.json';
let mainWindow = null;

function writeJsonAtomic(fullPath, payload) {
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  const temp = path.join(dir, `.${path.basename(fullPath)}.${process.pid}.${Date.now()}.tmp`);
  const backup = `${fullPath}.bak`;
  fs.writeFileSync(temp, JSON.stringify(payload, null, 2), 'utf8');
  try {
    if (fs.existsSync(fullPath)) fs.copyFileSync(fullPath, backup);
    fs.copyFileSync(temp, fullPath);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

function designsDir() {
  const dir = path.join(app.getPath('userData'), 'designs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'untitled';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 940,
    minHeight: 640,
    backgroundColor: '#1e1e24',
    title: '자짤 생성툴',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.__speccardDirty = false;
  win.on('close', (event) => {
    if (!win.__speccardDirty) return;
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      title: '저장하지 않은 변경사항',
      message: '저장하지 않은 변경사항이 있습니다.',
      detail: '창을 닫으면 마지막 자동 복구본은 남지만, 먼저 디자인을 저장하는 편이 안전합니다.',
      buttons: ['닫기', '취소'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (choice === 1) event.preventDefault();
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow = win;
  win.on('closed', () => { if (mainWindow === win) mainWindow = null; });
}

// ---- IPC ----

ipcMain.handle('specs:read', async () => {
  return readSpecs();
});

ipcMain.handle('image:pick', async () => {
  const res = await dialog.showOpenDialog({
    title: '이미지 선택',
    properties: ['openFile'],
    filters: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
  });
  if (res.canceled || !res.filePaths.length) return null;
  const file = res.filePaths[0];
  const stat = fs.statSync(file);
  if (stat.size > MAX_IMAGE_BYTES) {
    throw new Error(`이미지는 64MB 이하만 불러올 수 있습니다. 현재 ${(stat.size / 1024 / 1024).toFixed(1)}MB`);
  }
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const data = fs.readFileSync(file).toString('base64');
  return `data:image/${mime};base64,${data}`;
});

ipcMain.handle('store:list', async () => {
  const dir = designsDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const full = path.join(dir, f);
      let name = f.replace(/\.json$/, '');
      let thumbnail = null;
      try {
        const j = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (j && j.name) name = j.name;
        if (j && typeof j._thumbnail === 'string' && j._thumbnail.startsWith('data:image/')) {
          thumbnail = j._thumbnail;
        }
      } catch (_) {}
      return { file: f, name, thumbnail, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
});

ipcMain.handle('store:load', async (_e, file) => {
  const full = path.join(designsDir(), path.basename(file));
  return JSON.parse(fs.readFileSync(full, 'utf8'));
});

ipcMain.handle('store:save', async (_e, payload) => {
  const dir = designsDir();
  const name = safeName(payload.name || 'untitled');
  const file = payload.file ? path.basename(payload.file) : `${name}-${Date.now()}.json`;
  writeJsonAtomic(path.join(dir, file), payload);
  return { file, name };
});

ipcMain.handle('store:delete', async (_e, file) => {
  const full = path.join(designsDir(), path.basename(file));
  if (fs.existsSync(full)) await shell.trashItem(full);
  return true;
});

ipcMain.handle('export:png', async (_e, { dataUrl, suggestedName }) => {
  const res = await dialog.showSaveDialog({
    title: 'PNG로 내보내기',
    defaultPath: `${safeName(suggestedName || 'speccard')}.png`,
    filters: [{ name: 'PNG', extensions: ['png'] }],
  });
  if (res.canceled || !res.filePath) return null;
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(res.filePath, Buffer.from(base64, 'base64'));
  return res.filePath;
});

ipcMain.handle('export:webp', async (_e, { dataBase64, suggestedName }) => {
  const res = await dialog.showSaveDialog({
    title: 'WebP로 내보내기',
    defaultPath: `${safeName(suggestedName || 'speccard')}.webp`,
    filters: [{ name: 'WebP', extensions: ['webp'] }],
  });
  if (res.canceled || !res.filePath) return null;
  fs.writeFileSync(res.filePath, Buffer.from(dataBase64, 'base64'));
  return res.filePath;
});

ipcMain.handle('project:export', async (_e, payload) => {
  const res = await dialog.showSaveDialog({
    title: '편집 가능한 프로젝트 저장',
    defaultPath: `${safeName(payload.name || 'speccard')}.speccard`,
    filters: [{ name: 'SpecCard 프로젝트', extensions: ['speccard'] }],
  });
  if (res.canceled || !res.filePath) return null;
  writeJsonAtomic(res.filePath, payload);
  return res.filePath;
});

ipcMain.handle('project:import', async () => {
  const res = await dialog.showOpenDialog({
    title: 'SpecCard 프로젝트 열기',
    properties: ['openFile'],
    filters: [{ name: 'SpecCard 프로젝트', extensions: ['speccard', 'json'] }],
  });
  if (res.canceled || !res.filePaths.length) return null;
  const file = res.filePaths[0];
  const stat = fs.statSync(file);
  if (stat.size > MAX_IMAGE_BYTES) throw new Error('프로젝트 파일이 64MB를 초과합니다.');
  return { file, state: JSON.parse(fs.readFileSync(file, 'utf8')) };
});

ipcMain.handle('autosave:write', async (_e, payload) => {
  const full = path.join(app.getPath('userData'), RECOVERY_FILE);
  writeJsonAtomic(full, { savedAt: Date.now(), state: payload });
  return true;
});

ipcMain.handle('autosave:read', async () => {
  const full = path.join(app.getPath('userData'), RECOVERY_FILE);
  if (!fs.existsSync(full)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    return parsed && parsed.state ? parsed : null;
  } catch (_) {
    return null;
  }
});

ipcMain.handle('autosave:clear', async () => {
  const full = path.join(app.getPath('userData'), RECOVERY_FILE);
  writeJsonAtomic(full, { clearedAt: Date.now(), state: null });
  return true;
});

ipcMain.handle('clipboard:write-image', async (_e, dataUrl) => {
  const image = nativeImage.createFromDataURL(String(dataUrl || ''));
  if (image.isEmpty()) throw new Error('클립보드에 복사할 이미지가 없습니다.');
  clipboard.writeImage(image);
  return true;
});

ipcMain.handle('clipboard:read-image', async () => {
  const image = clipboard.readImage();
  return image.isEmpty() ? null : image.toDataURL();
});

ipcMain.on('state:dirty', (event, dirty) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.__speccardDirty = !!dirty;
});

app.whenReady().then(() => {
  // 권한은 시스템 폰트 조회(local-fonts)만 허용, 나머지는 전부 거부
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    cb(permission === 'local-fonts');
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

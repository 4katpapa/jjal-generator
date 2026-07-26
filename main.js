'use strict';
const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { readSpecs } = require('./specReader');

// 개발 실행(name: speccard)과 포터블 빌드(productName: 자짤 생성툴)가
// 같은 저장 폴더를 쓰도록 userData 경로 고정
app.setPath('userData', path.join(app.getPath('appData'), 'speccard'));

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
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
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
      try {
        const j = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (j && j.name) name = j.name;
      } catch (_) {}
      return { file: f, name, mtime: fs.statSync(full).mtimeMs };
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
  fs.writeFileSync(path.join(dir, file), JSON.stringify(payload, null, 2), 'utf8');
  return { file, name };
});

ipcMain.handle('store:delete', async (_e, file) => {
  const full = path.join(designsDir(), path.basename(file));
  if (fs.existsSync(full)) fs.unlinkSync(full);
  return true;
});

// ---- PNG 메타데이터(tEXt 청크) 헬퍼 ----
const META_KEYWORD = 'speccard';
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}
// IEND 직전에 tEXt 청크로 디자인 JSON(base64) 삽입
function pngWithMeta(pngBuf, jsonStr) {
  const data = Buffer.from(Buffer.from(jsonStr, 'utf8').toString('base64'), 'latin1');
  const content = Buffer.concat([Buffer.from(META_KEYWORD, 'latin1'), Buffer.from([0]), data]);
  const typed = Buffer.concat([Buffer.from('tEXt', 'latin1'), content]);
  const chunk = Buffer.alloc(12 + content.length);
  chunk.writeUInt32BE(content.length, 0);
  typed.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(typed), 8 + content.length);
  const iendStart = pngBuf.length - 12; // 표준 PNG의 IEND 청크(12바이트)는 항상 마지막
  return Buffer.concat([pngBuf.slice(0, iendStart), chunk, pngBuf.slice(iendStart)]);
}
function readPngMeta(buf) {
  let pos = 8; // PNG 시그니처 스킵
  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    if (type === 'tEXt') {
      const content = buf.slice(pos + 8, pos + 8 + len);
      const nul = content.indexOf(0);
      if (nul > 0 && content.toString('latin1', 0, nul) === META_KEYWORD) {
        return Buffer.from(content.toString('latin1', nul + 1), 'base64').toString('utf8');
      }
    }
    pos += 12 + len;
  }
  return null;
}

ipcMain.handle('export:png', async (_e, { dataUrl, suggestedName, meta }) => {
  const res = await dialog.showSaveDialog({
    title: 'PNG로 내보내기',
    defaultPath: `${safeName(suggestedName || 'speccard')}.png`,
    filters: [{ name: 'PNG', extensions: ['png'] }],
  });
  if (res.canceled || !res.filePath) return null;
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  let buf = Buffer.from(base64, 'base64');
  if (meta) {
    try { buf = pngWithMeta(buf, meta); } catch (_) { /* 메타 실패해도 이미지 저장은 진행 */ }
  }
  fs.writeFileSync(res.filePath, buf);
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

ipcMain.handle('import:png', async () => {
  const res = await dialog.showOpenDialog({
    title: '내보냈던 PNG에서 디자인 불러오기',
    properties: ['openFile'],
    filters: [{ name: 'PNG', extensions: ['png'] }],
  });
  if (res.canceled || !res.filePaths.length) return null;
  const meta = readPngMeta(fs.readFileSync(res.filePaths[0]));
  if (!meta) throw new Error('no-meta');
  return JSON.parse(meta);
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

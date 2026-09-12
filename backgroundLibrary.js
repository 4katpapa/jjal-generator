'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readJsonWithBackup, writeJsonAtomic } = require('./jsonStore');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_FILES = 2000;
const MAX_ENTRIES = 20000;

function defaultBackgroundRoot({ packaged, portableDir, executable, appPath }) {
  const base = packaged ? (portableDir || path.dirname(executable)) : appPath;
  return path.resolve(base, 'Backgrounds');
}

function bundledBackgroundRoot({ packaged, resourcesPath, appPath }) {
  return packaged ? path.resolve(resourcesPath, 'backgrounds') : path.resolve(appPath, 'assets', 'backgrounds');
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function imageMime(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  throw new Error('지원하는 이미지가 아니거나 파일이 손상되었습니다.');
}

class BackgroundLibrary {
  constructor({ defaultRoot, bundledRoot = null, settingsFile, thumbnail, onChange = () => {} }) {
    this.defaultRoot = path.resolve(defaultRoot);
    this.bundledRoot = bundledRoot ? path.resolve(bundledRoot) : null;
    this.settingsFile = settingsFile;
    this.thumbnail = thumbnail;
    this.onChange = onChange;
    this.customRoot = null;
    this.revision = 0;
    this.entries = new Map();
    this.cache = new Map();
    this.watcher = null;
    this.watchRoot = null;
    try {
      const value = readJsonWithBackup(settingsFile, (v) => v && (v.root === null || (typeof v.root === 'string' && path.isAbsolute(v.root)))).value;
      this.customRoot = value.root;
    } catch (_) { /* 첫 실행 또는 읽을 수 없는 설정은 기본 폴더로 시작한다. */ }
  }

  get root() { return this.customRoot || this.defaultRoot; }

  async selectRoot(root) {
    let canonical = null;
    if (root !== null) {
      canonical = await fs.promises.realpath(root);
      if (!(await fs.promises.stat(canonical)).isDirectory()) throw new Error('이미지 폴더를 선택해 주세요.');
    }
    writeJsonAtomic(this.settingsFile, { root: canonical });
    this.customRoot = canonical;
    this.revision++;
    this.entries.clear();
    this.cache.clear();
    this.stopWatch();
    return this.list();
  }

  async list() {
    const root = this.root;
    const startingRevision = this.revision;
    const entries = new Map();
    let visited = 0;
    let skipped = 0;
    let limited = false;
    const scan = async (folder, source) => {
      let canonical;
      try {
        canonical = await fs.promises.realpath(folder);
        if (!(await fs.promises.stat(canonical)).isDirectory()) throw new Error('폴더가 아닙니다.');
        const walk = async (directory, depth) => {
          const children = await fs.promises.readdir(directory, { withFileTypes: true });
          children.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
          for (const child of children) {
            if (++visited > MAX_ENTRIES || entries.size >= MAX_FILES) { limited = true; return; }
            const full = path.join(directory, child.name);
            if (child.isSymbolicLink()) { skipped++; continue; }
            if (child.isDirectory()) {
              if (depth >= 5) { limited = true; continue; }
              try { await walk(full, depth + 1); } catch (_) { skipped++; }
            } else if (child.isFile() && IMAGE_EXTENSIONS.has(path.extname(child.name).toLowerCase())) {
              try {
                const stat = await fs.promises.lstat(full);
                if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES || stat.size === 0) { skipped++; continue; }
                const real = await fs.promises.realpath(full);
                if (!inside(canonical, real)) { skipped++; continue; }
                const file = path.relative(canonical, full).split(path.sep).join('/');
                const id = source === 'builtin' ? `builtin:${file}` : file;
                const parent = path.posix.dirname(file);
                entries.set(id, {
                  id, name: path.basename(child.name, path.extname(child.name)).replace(/_/g, ' '),
                  category: parent === '.' ? '분류 없음' : parent.replace(/_/g, ' '),
                  file, source, bytes: stat.size, mtime: stat.mtimeMs, full, real, ino: stat.ino, root: canonical,
                });
              } catch (_) { skipped++; }
            }
          }
        };
        await walk(canonical, 0);
        return { canonical, status: 'ready' };
      } catch (error) {
        return { canonical, status: error.code === 'ENOENT' ? 'missing' : 'error' };
      }
    };
    const bundled = this.bundledRoot ? await scan(this.bundledRoot, 'builtin') : null;
    const bundledCount = entries.size;
    const external = await scan(root, 'external');
    let status = bundledCount ? 'ready' : external.status;
    let message = '';
    if (external.status === 'missing') {
      message = bundledCount ? '' : '아직 개인 배경 폴더가 없거나 이동되었습니다.';
    } else if (external.status === 'error') {
      message = '개인 배경 폴더를 읽을 수 없습니다. 접근 가능한 폴더를 선택해 주세요.';
    }
    if (bundled && bundled.status !== 'ready') {
      message = `내장 배경을 읽을 수 없습니다. 앱 파일을 확인해 주세요. ${message}`.trim();
      if (!entries.size) status = 'error';
    }
    if (root !== this.root || startingRevision !== this.revision) return this.list();
    this.entries = entries;
    const token = ++this.revision;
    this.watch(external.status === 'ready' ? external.canonical : null);
    if (limited) message += ` 최대 ${MAX_FILES.toLocaleString()}장, 하위 5단계까지 표시합니다.`;
    if (skipped) message += ` 읽을 수 없거나 용량 제한(64MB)을 넘는 파일·연결 폴더 ${skipped}개를 건너뛰었습니다.`;
    return {
      root, defaultRoot: this.defaultRoot, isDefault: !this.customRoot, token, status, message: message.trim(),
      bundledCount, externalStatus: external.status,
      items: Array.from(entries.values(), ({ full, real, ino, root: _root, ...item }) => item),
    };
  }

  async read({ id, token }) {
    const entry = this.entries.get(id);
    if (token !== this.revision || !entry) throw new Error('목록이 변경되었습니다. 새로고침 후 다시 선택해 주세요.');
    const stat = await fs.promises.lstat(entry.full);
    const real = await fs.promises.realpath(entry.full);
    if (!stat.isFile() || stat.isSymbolicLink() || !inside(entry.root, real) || real !== entry.real
      || stat.size !== entry.bytes || stat.mtimeMs !== entry.mtime || stat.ino !== entry.ino || stat.size > MAX_BYTES) {
      throw new Error('이미지 파일이 이동되거나 변경되었습니다. 새로고침해 주세요.');
    }
    const buffer = await fs.promises.readFile(real);
    if (buffer.length !== stat.size || buffer.length > MAX_BYTES) throw new Error('이미지 파일이 변경되었습니다. 새로고침해 주세요.');
    const mime = imageMime(buffer);
    return { buffer, mime, entry };
  }

  async getImage(request) {
    const { buffer, mime } = await this.read(request);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  async getThumbnail(request) {
    const entry = this.entries.get(request.id);
    if (request.token !== this.revision || !entry) throw new Error('목록이 변경되었습니다.');
    const key = `${entry.real}|${entry.bytes}|${entry.mtime}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const { buffer } = await this.read(request);
    const value = await this.thumbnail(buffer);
    if (this.cache.size >= 80) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, value);
    return value;
  }

  async openFolder(openPath) {
    if (!this.customRoot) await fs.promises.mkdir(this.defaultRoot, { recursive: true });
    const root = await fs.promises.realpath(this.root);
    if (!(await fs.promises.stat(root)).isDirectory()) throw new Error('폴더를 다시 선택해 주세요.');
    const error = await openPath(root);
    if (error) throw new Error(error);
    return this.list();
  }

  watch(root) {
    if (this.watchRoot === root) return;
    this.stopWatch();
    if (!root) return;
    try {
      this.watcher = fs.watch(root, { recursive: true }, () => {
        clearTimeout(this.changeTimer);
        this.changeTimer = setTimeout(() => this.onChange(), 400);
        this.changeTimer.unref();
      });
      this.watchRoot = root;
      this.watcher.on('error', () => { this.stopWatch(); this.onChange(); });
      this.watcher.unref();
    } catch (_) { /* 감시를 지원하지 않는 드라이브는 창을 다시 열거나 새로고침하면 갱신된다. */ }
  }

  stopWatch() {
    clearTimeout(this.changeTimer);
    this.watcher?.close();
    this.watcher = null;
    this.watchRoot = null;
  }
}

module.exports = { BackgroundLibrary, defaultBackgroundRoot, bundledBackgroundRoot, imageMime };

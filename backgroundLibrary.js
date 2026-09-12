'use strict';

const fs = require('node:fs');
const path = require('node:path');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_FILES = 2000;
const MAX_ENTRIES = 20000;

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
  constructor({ bundledRoot, thumbnail }) {
    this.bundledRoot = path.resolve(bundledRoot);
    this.thumbnail = thumbnail;
    this.revision = 0;
    this.entries = new Map();
    this.cache = new Map();
    this.pendingList = null;
  }

  list() {
    if (!this.pendingList) {
      this.pendingList = this.scan().finally(() => { this.pendingList = null; });
    }
    return this.pendingList;
  }

  async scan() {
    const entries = new Map();
    let visited = 0;
    let skipped = 0;
    let limited = false;
    const scan = async (folder) => {
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
                const id = `builtin:${file}`;
                const parent = path.posix.dirname(file);
                entries.set(id, {
                  id, name: path.basename(child.name, path.extname(child.name)).replace(/_/g, ' '),
                  category: parent === '.' ? '분류 없음' : parent.replace(/_/g, ' '),
                  file, source: 'builtin', bytes: stat.size, mtime: stat.mtimeMs, full, real, ino: stat.ino, root: canonical,
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
    const bundled = await scan(this.bundledRoot);
    this.entries = entries;
    const token = ++this.revision;
    let message = bundled.status === 'ready' ? '' : '내장 배경을 읽을 수 없습니다. 앱 파일을 확인해 주세요.';
    if (limited) message += ` 최대 ${MAX_FILES.toLocaleString()}장, 하위 5단계까지 표시합니다.`;
    if (skipped) message += ` 읽을 수 없거나 용량 제한(64MB)을 넘는 파일·연결 폴더 ${skipped}개를 건너뛰었습니다.`;
    return {
      token, status: bundled.status === 'ready' ? 'ready' : 'error', message: message.trim(),
      bundledCount: entries.size,
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

}

module.exports = { BackgroundLibrary, bundledBackgroundRoot, imageMime };

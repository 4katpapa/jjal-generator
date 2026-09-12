'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BackgroundLibrary, defaultBackgroundRoot, bundledBackgroundRoot, imageMime } = require('../backgroundLibrary');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE1kAAAAASUVORK5CYII=', 'base64');

function fixture(t) {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'speccard-background-test-'));
  const root = path.join(dir, 'Backgrounds');
  const settingsFile = path.join(dir, 'settings.json');
  const libraries = [];
  function library(options = {}) {
    const lib = new BackgroundLibrary({ defaultRoot: root, settingsFile, thumbnail: () => 'data:image/png;base64,thumbnail', ...options });
    libraries.push(lib);
    return lib;
  }
  const put = (file, data = PNG) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
    return target;
  };
  t.after(() => {
    libraries.forEach((lib) => lib.stopWatch());
    assert.equal(path.dirname(fs.realpathSync(dir)), parent);
    assert.ok(path.basename(dir).startsWith('speccard-background-test-'));
    fs.rmSync(dir, { recursive: true }); // 이 테스트가 만든 임시 입력만 정리한다.
  });
  return { dir, root, settingsFile, library, put };
}

test('portable backgrounds resolve beside the original EXE rather than its extraction directory', () => {
  const portableDir = path.resolve('downloads');
  assert.equal(defaultBackgroundRoot({ packaged: true, portableDir, executable: path.resolve('temp/app.exe') }), path.join(portableDir, 'Backgrounds'));
  assert.equal(defaultBackgroundRoot({ packaged: false, appPath: path.resolve('source') }), path.resolve('source/Backgrounds'));
  assert.equal(defaultBackgroundRoot({ packaged: true, executable: path.resolve('installed/app.exe') }), path.resolve('installed/Backgrounds'));
});

test('folder scanning recognizes nested categories and case-insensitive formats without a manifest', async (t) => {
  const f = fixture(t);
  f.put('01_자연/001_안개.PNG');
  f.put('02_SF/STAR.JpEg', Buffer.from([255, 216, 255, 0]));
  f.put('plain.webp', Buffer.from('RIFF1234WEBP'));
  f.put('ignored.gif'); f.put('notes.json', '{}'); f.put('zero.png', '');
  const lib = f.library();
  const list = await lib.list();
  assert.equal(list.status, 'ready');
  assert.equal(list.items.length, 3);
  assert.equal(list.items[0].category, '01 자연');
  assert.equal(list.items[0].name, '001 안개');
  assert.equal(await lib.getImage({ id: list.items[0].id, token: list.token }), `data:image/png;base64,${PNG.toString('base64')}`);
  assert.equal(fs.existsSync(f.settingsFile), false);
});

test('missing default folder is read-only until the user opens it', async (t) => {
  const f = fixture(t); const lib = f.library();
  assert.equal((await lib.list()).status, 'missing');
  assert.equal(fs.existsSync(f.root), false);
  let opened;
  assert.equal((await lib.openFolder(async (root) => { opened = root; return ''; })).status, 'ready');
  assert.equal(opened, fs.realpathSync(f.root));
});

test('selected folder persists across launches and resetting does not remove images', async (t) => {
  const f = fixture(t); const lib = f.library();
  const other = path.join(f.dir, '다운로드 팩');
  fs.mkdirSync(other); fs.writeFileSync(path.join(other, 'image.png'), PNG);
  assert.equal((await lib.selectRoot(other)).items.length, 1);
  const next = f.library();
  assert.equal(next.root, fs.realpathSync(other));
  assert.equal((await next.selectRoot(null)).isDefault, true);
  assert.equal(f.library().root, f.root);
  assert.deepEqual(fs.readFileSync(path.join(other, 'image.png')), PNG);
});

test('stale selections, traversal and externally changed files cannot read arbitrary content', async (t) => {
  const f = fixture(t); const file = f.put('image.png'); const lib = f.library();
  const first = await lib.list(); const request = { id: 'image.png', token: first.token };
  await assert.rejects(lib.getImage({ id: '../settings.json', token: first.token }), /목록/);
  fs.appendFileSync(file, 'changed');
  await assert.rejects(lib.getImage(request), /변경/);
  const next = await lib.list();
  await assert.rejects(lib.getImage(request), /목록/);
  assert.ok((await lib.getImage({ id: 'image.png', token: next.token })).startsWith('data:image/png;'));
  fs.unlinkSync(file);
  await assert.rejects(lib.getImage({ id: 'image.png', token: next.token }));
});

test('linked folders are not scanned and broken image bytes fail separately from the gallery list', async (t) => {
  const f = fixture(t); f.put('broken.png', 'not an image');
  const outside = path.join(f.dir, 'outside'); fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'private.png'), PNG);
  fs.symlinkSync(outside, path.join(f.root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const lib = f.library(); const list = await lib.list();
  assert.deepEqual(list.items.map((i) => i.id), ['broken.png']);
  await assert.rejects(lib.getThumbnail({ id: 'broken.png', token: list.token }), /손상/);
  assert.deepEqual(fs.readFileSync(path.join(outside, 'private.png')), PNG);
});

test('thumbnail cache is invalidated by file replacement while original bytes remain untouched', async (t) => {
  const f = fixture(t); const file = f.put('image.png'); let calls = 0;
  const lib = f.library({ thumbnail: () => `thumbnail-${++calls}` });
  const first = await lib.list(); const request = { id: 'image.png', token: first.token };
  assert.equal(await lib.getThumbnail(request), 'thumbnail-1');
  assert.equal(await lib.getThumbnail(request), 'thumbnail-1');
  assert.deepEqual(fs.readFileSync(file), PNG);
  fs.appendFileSync(file, 'new pixels');
  const next = await lib.list();
  assert.equal(await lib.getThumbnail({ id: 'image.png', token: next.token }), 'thumbnail-2');
});

test('content signatures determine MIME type rather than trusting file names', () => {
  assert.equal(imageMime(PNG), 'image/png');
  assert.equal(imageMime(Buffer.from([255, 216, 255])), 'image/jpeg');
  assert.equal(imageMime(Buffer.from('RIFF1234WEBP')), 'image/webp');
  assert.throws(() => imageMime(Buffer.from('<script>')), /손상/);
});

test('bundled resources resolve independently of the personal Backgrounds folder', () => {
  assert.equal(bundledBackgroundRoot({ packaged: true, resourcesPath: path.resolve('app/resources') }), path.resolve('app/resources/backgrounds'));
  assert.equal(bundledBackgroundRoot({ packaged: false, appPath: path.resolve('source') }), path.resolve('source/assets/backgrounds'));
});

test('bundled images work on first launch without creating a personal folder or settings', async (t) => {
  const f = fixture(t);
  const bundledRoot = path.join(f.dir, 'bundled'); fs.mkdirSync(bundledRoot);
  fs.writeFileSync(path.join(bundledRoot, 'forest.png'), PNG);
  const lib = f.library({ bundledRoot });
  const list = await lib.list();
  assert.equal(list.status, 'ready');
  assert.equal(list.externalStatus, 'missing');
  assert.equal(list.bundledCount, 1);
  assert.equal(list.items[0].source, 'builtin');
  assert.equal(fs.existsSync(f.root), false);
  assert.equal(fs.existsSync(f.settingsFile), false);
  assert.equal(await lib.getImage({ id: 'builtin:forest.png', token: list.token }), `data:image/png;base64,${PNG.toString('base64')}`);
  assert.equal(Object.hasOwn(list.items[0], 'root'), false);
});

test('same-named built-in and personal images remain distinct and confined to their source roots', async (t) => {
  const f = fixture(t); f.put('same.png');
  const bundledRoot = path.join(f.dir, 'bundled'); fs.mkdirSync(bundledRoot);
  const bundledBytes = Buffer.concat([PNG, Buffer.from('bundled')]);
  fs.writeFileSync(path.join(bundledRoot, 'same.png'), bundledBytes);
  const lib = f.library({ bundledRoot }); const list = await lib.list();
  assert.deepEqual(list.items.map(i => [i.id, i.source]), [['builtin:same.png', 'builtin'], ['same.png', 'external']]);
  assert.equal(await lib.getImage({ id: 'builtin:same.png', token: list.token }), `data:image/png;base64,${bundledBytes.toString('base64')}`);
  assert.equal(await lib.getImage({ id: 'same.png', token: list.token }), `data:image/png;base64,${PNG.toString('base64')}`);
  await assert.rejects(lib.getImage({ id: 'builtin:../settings.json', token: list.token }), /목록/);
  await lib.openFolder(async root => { assert.equal(root, f.root); return ''; });
  assert.deepEqual(fs.readFileSync(path.join(bundledRoot, 'same.png')), bundledBytes);
});

test('personal folder changes and restarts retain the built-in collection', async (t) => {
  const f = fixture(t);
  const bundledRoot = path.join(f.dir, 'bundled'); fs.mkdirSync(bundledRoot);
  fs.writeFileSync(path.join(bundledRoot, 'one.png'), PNG);
  const other = path.join(f.dir, 'personal'); fs.mkdirSync(other); fs.writeFileSync(path.join(other, 'two.png'), PNG);
  const lib = f.library({ bundledRoot });
  const selected = await lib.selectRoot(other);
  assert.equal(selected.items.length, 2); assert.equal(selected.bundledCount, 1);
  const restarted = f.library({ bundledRoot });
  assert.equal((await restarted.list()).items.length, 2);
  const reset = await restarted.selectRoot(null);
  assert.equal(reset.items.length, 1); assert.equal(reset.items[0].source, 'builtin');
  assert.deepEqual(fs.readFileSync(path.join(other, 'two.png')), PNG);
});

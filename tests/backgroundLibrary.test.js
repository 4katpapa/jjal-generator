'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BackgroundLibrary, bundledBackgroundRoot, imageMime } = require('../backgroundLibrary');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE1kAAAAASUVORK5CYII=', 'base64');

function fixture(t) {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, 'speccard-background-test-'));
  const root = path.join(dir, 'Backgrounds');
  const settingsFile = path.join(dir, 'settings.json');
  const libraries = [];
  function library(options = {}) {
    const lib = new BackgroundLibrary({ bundledRoot: root, thumbnail: () => 'data:image/png;base64,thumbnail', ...options });
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
    assert.equal(path.dirname(fs.realpathSync(dir)), parent);
    assert.ok(path.basename(dir).startsWith('speccard-background-test-'));
    fs.rmSync(dir, { recursive: true }); // 이 테스트가 만든 임시 입력만 정리한다.
  });
  return { dir, root, settingsFile, library, put };
}

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

test('missing built-in assets produce an error without creating a folder', async (t) => {
  const f = fixture(t); const lib = f.library();
  assert.equal((await lib.list()).status, 'error');
  assert.equal(fs.existsSync(f.root), false);
  assert.equal(fs.existsSync(f.settingsFile), false);
});

test('stale selections, traversal and externally changed files cannot read arbitrary content', async (t) => {
  const f = fixture(t); const file = f.put('image.png'); const lib = f.library();
  const first = await lib.list(); const request = { id: 'builtin:image.png', token: first.token };
  await assert.rejects(lib.getImage({ id: '../settings.json', token: first.token }), /목록/);
  fs.appendFileSync(file, 'changed');
  await assert.rejects(lib.getImage(request), /변경/);
  const next = await lib.list();
  await assert.rejects(lib.getImage(request), /목록/);
  assert.ok((await lib.getImage({ id: 'builtin:image.png', token: next.token })).startsWith('data:image/png;'));
  fs.unlinkSync(file);
  await assert.rejects(lib.getImage({ id: 'builtin:image.png', token: next.token }));
});

test('linked folders are not scanned and broken image bytes fail separately from the gallery list', async (t) => {
  const f = fixture(t); f.put('broken.png', 'not an image');
  const outside = path.join(f.dir, 'outside'); fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'private.png'), PNG);
  fs.symlinkSync(outside, path.join(f.root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const lib = f.library(); const list = await lib.list();
  assert.deepEqual(list.items.map((i) => i.id), ['builtin:broken.png']);
  await assert.rejects(lib.getThumbnail({ id: 'builtin:broken.png', token: list.token }), /손상/);
  assert.deepEqual(fs.readFileSync(path.join(outside, 'private.png')), PNG);
});

test('thumbnail cache is invalidated by file replacement while original bytes remain untouched', async (t) => {
  const f = fixture(t); const file = f.put('image.png'); let calls = 0;
  const lib = f.library({ thumbnail: () => `thumbnail-${++calls}` });
  const first = await lib.list(); const request = { id: 'builtin:image.png', token: first.token };
  assert.equal(await lib.getThumbnail(request), 'thumbnail-1');
  assert.equal(await lib.getThumbnail(request), 'thumbnail-1');
  assert.deepEqual(fs.readFileSync(file), PNG);
  fs.appendFileSync(file, 'new pixels');
  const next = await lib.list();
  assert.equal(await lib.getThumbnail({ id: 'builtin:image.png', token: next.token }), 'thumbnail-2');
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

test('old personal folder preferences are ignored without changing their settings or images', async (t) => {
  const f = fixture(t); f.put('built-in.png');
  const personal = path.join(f.dir, 'personal'); fs.mkdirSync(personal);
  const image = path.join(personal, 'private.png'); fs.writeFileSync(image, PNG);
  const settings = JSON.stringify({ root: personal }); fs.writeFileSync(f.settingsFile, settings);
  const lib = f.library({ defaultRoot: personal, settingsFile: f.settingsFile });
  const list = await lib.list();
  assert.equal(list.status, 'ready');
  assert.deepEqual(list.items.map(i => i.id), ['builtin:built-in.png']);
  assert.equal(list.bundledCount, 1);
  assert.equal(Object.hasOwn(list, 'root'), false);
  assert.equal(Object.hasOwn(list.items[0], 'root'), false);
  assert.equal(typeof lib.selectRoot, 'undefined');
  assert.equal(typeof lib.openFolder, 'undefined');
  assert.equal(fs.readFileSync(f.settingsFile, 'utf8'), settings);
  assert.deepEqual(fs.readFileSync(image), PNG);
});

test('concurrent list requests share a scan and receive a usable selection token', async (t) => {
  const f = fixture(t); f.put('one.png'); const lib = f.library();
  const [a, b, c] = await Promise.all([lib.list(), lib.list(), lib.list()]);
  assert.equal(a.token, b.token); assert.equal(b.token, c.token);
  assert.ok((await lib.getImage({ id: a.items[0].id, token: a.token })).startsWith('data:image/png;'));
});

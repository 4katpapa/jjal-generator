'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { IDBFactory } = require('fake-indexeddb');
const source = fs.readFileSync(path.join(__dirname, '../browser-api.js'), 'utf8');
const sample = () => ({ schemaVersion: 2, name: '보존할 디자인', file: null, card: { width: 850, height: 300 }, rows: [{ label: 'CPU', value: 'Ryzen', icon: 'cpu', iconSeries: 'pixel' }], texts: [{ text: '한글', outline: true }], stickers: [] });

function createApi(factory = new IDBFactory(), session = new Map(), fetchImpl = async () => { throw new Error('Unexpected network access'); }) {
  const listeners = {};
  const window = { addEventListener: (event, fn) => { listeners[event] = fn; } };
  vm.runInNewContext(source, { window, crypto: webcrypto, indexedDB: factory, console, structuredClone,
    sessionStorage: { getItem: (key) => session.get(key), setItem: (key, value) => session.set(key, value) },
    fetch: fetchImpl, AbortSignal, Blob, Uint8Array, atob, setTimeout, URL, navigator: {}, document: { getElementById: () => null },
  });
  return { api: window.api, session, factory, listeners };
}
const json = (value) => JSON.parse(JSON.stringify(value));

test('Browser design transactions persist across adapter instances without changing embedded fields', async () => {
  const first = createApi();
  const payload = sample();
  const saved = await first.api.saveDesign(payload);
  const second = createApi(first.factory);
  assert.deepEqual(json(await second.api.loadDesign(saved.file)), { ...payload, file: saved.file });
  assert.equal(payload.file, null);
  assert.equal((await second.api.listDesigns()).length, 1);
  const overwritten = await second.api.saveDesign({ ...payload, file: saved.file, name: '바뀐 이름' });
  assert.equal(overwritten.file, saved.file);
  assert.equal((await second.api.listDesigns()).length, 1);
  await second.api.deleteDesign(saved.file);
  await assert.rejects(second.api.loadDesign(saved.file), /찾지 못/);
});
test('Autosave survives reload and a consumed recovery does not return forever', async () => {
  const first = createApi();
  await first.api.writeAutosave(sample());
  const reload = createApi(first.factory, first.session);
  assert.equal((await reload.api.readAutosave()).state.name, '보존할 디자인');
  const newVisit = createApi(first.factory);
  await newVisit.api.readAutosave();
  await newVisit.api.clearAutosave();
  assert.equal(await createApi(first.factory).api.readAutosave(), null);
});
test('Saving after recovery selection never clears a newer recovery written by its original tab', async () => {
  const first = createApi();
  await first.api.writeAutosave(sample());
  const second = createApi(first.factory);
  await second.api.readAutosave();
  await first.api.writeAutosave({ ...sample(), name: '새 편집 내용' });
  await second.api.clearAutosave();
  assert.equal((await first.api.readAutosave()).state.name, '새 편집 내용');
});
test('Background listing fetches only the manifest and rejects a stale selection', async () => {
  const calls = [];
  const manifest = { token: 'version-1', items: [{ id: 'builtin:001.png' }] };
  const { api } = createApi(undefined, undefined, async (url) => {
    calls.push(url); return { ok: true, json: async () => manifest };
  });
  await Promise.all([api.listBackgrounds(), api.listBackgrounds()]);
  assert.deepEqual(calls, ['backgrounds/manifest.json']);
  await assert.rejects(api.backgroundImage({ token: 'old-version', id: 'builtin:001.png' }), /새로고침/);
  assert.equal(calls.length, 1);
});
test('Unsupported browser clipboard and invalid project images fail with actionable messages', async () => {
  const { api } = createApi();
  await assert.rejects(api.copyImage('data:image/png;base64,'), /PNG/);
  await assert.rejects(api.pasteImage(), /이미지 넣기/);
  await assert.rejects(api.saveDesign({ ...sample(), image: { dataUrl: 'https://example.com/private.png' } }), /내장/);
  await assert.rejects(api.saveDesign({ name: 'not a project' }), /프로젝트/);
});
test('Leaving a dirty document requests a browser prompt and a clean one does not', () => {
  const { api, listeners } = createApi();
  let prevented = 0;
  const event = { preventDefault: () => { prevented++; } };
  listeners.beforeunload(event);
  api.setDirty(true); listeners.beforeunload(event);
  api.setDirty(false); listeners.beforeunload(event);
  assert.equal(prevented, 1);
});

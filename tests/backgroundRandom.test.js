'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../renderer/background-library.js'), 'utf8');

function fixture(ids) {
  const selected = [], reads = [];
  const items = ids.map(id => ({ id, name: id }));
  const context = { window: { api: {
    listBackgrounds: async () => ({ items, token: 7 }),
    backgroundImage: async ({ id, token }) => { assert.equal(token, 7); reads.push(id); return id; },
  } }, Math: Object.assign(Object.create(Math), { random: () => 0.999999 }),
  Image: class { async decode() { if (this.src.startsWith('broken')) throw new Error('broken'); } } };
  vm.runInNewContext(source, context);
  return { selected, reads, ui: context.window.BackgroundPresetUI,
    options: { isCurrent: () => true, currentUrl: null, onApply: async url => { selected.push(url); return true; } } };
}

test('outside random button selects the whole collection repeatedly without repeating the current image', async () => {
  const f = fixture(['A', 'B', 'C']);
  await f.ui.random(f.options);
  await f.ui.random({ ...f.options, currentUrl: 'A' });
  await f.ui.random({ ...f.options, currentUrl: 'B' });
  assert.deepEqual(f.selected, ['A', 'B', 'A']);
});

test('random skips unreadable images and respects a background restored from a saved design', async () => {
  const f = fixture(['broken-one', 'A', 'B']);
  await f.ui.random({ ...f.options, currentUrl: 'A' });
  assert.deepEqual(f.selected, ['B']);
});

test('empty and corrupt-only collections fail without applying another background', async () => {
  for (const ids of [[], ['broken-one', 'broken-two']]) {
    const f = fixture(ids);
    await assert.rejects(f.ui.random(f.options), /내장 배경/);
    assert.equal(f.selected.length, 0);
  }
});

test('cancelled random requests do not read or apply images to another document', async () => {
  const f = fixture(['A']);
  assert.equal(await f.ui.random({ ...f.options, isCurrent: () => false }), false);
  assert.equal(f.reads.length, 0);
  assert.equal(f.selected.length, 0);
});

test('application errors are reported once instead of applying the next candidate', async () => {
  const f = fixture(['A', 'B']); let calls = 0;
  await assert.rejects(f.ui.random({ ...f.options, onApply: async () => { calls++; throw new Error('application failed'); } }), /application failed/);
  assert.equal(calls, 1);
});

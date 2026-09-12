'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { BackgroundLibrary } = require('../backgroundLibrary');

const project = path.resolve(__dirname, '..');
const root = path.join(project, 'assets/backgrounds');
const manifest = () => JSON.parse(fs.readFileSync(path.join(project, 'docs/BACKGROUND_EXPANSION_GENERATION.json'), 'utf8'));

test('64 expansion backgrounds retain their reviewed originals, dimensions and eight-image categories', () => {
  const pack = manifest();
  assert.equal(pack.items.length, 64);
  const originalPack = JSON.parse(fs.readFileSync(path.join(project, 'docs/BACKGROUND_GENERATION.json'), 'utf8'));
  const oldHashes = new Set(originalPack.items.map(row => row.sha256.toLowerCase()));
  const hashes = new Set(); const ids = new Set(); const files = new Set(); const groups = {};
  let bytesTotal = 0;
  for (const row of pack.items) {
    const full = path.resolve(project, row.file);
    assert.ok(full.startsWith(root + path.sep), row.id);
    assert.ok(!fs.lstatSync(full).isSymbolicLink(), row.id);
    assert.equal(row.review, 'passed', row.id);
    const bytes = fs.readFileSync(full);
    assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), row.id);
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [row.width, row.height], row.id);
    assert.ok(row.width >= 850 && row.height >= 300, row.id);
    assert.ok(Math.abs(row.width / row.height - 17 / 6) / (17 / 6) < 0.005, row.id);
    assert.equal(bytes.length, row.bytes, row.id);
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash, row.sha256, row.id);
    assert.ok(!oldHashes.has(hash), row.id);
    hashes.add(hash); ids.add(row.id); files.add(full);
    groups[row.group] = (groups[row.group] || 0) + 1;
    bytesTotal += bytes.length;
  }
  assert.equal(hashes.size, 64); assert.equal(ids.size, 64); assert.equal(files.size, 64);
  assert.deepEqual(groups, { MSI:8, GIGABYTE:8, ASUS:8, AMD:8, INTEL:8, NVIDIA:8, DESK:8, PIXEL:8 });
  assert.equal(bytesTotal, pack.total_bytes);
});

test('the built-in library discovers all 164 backgrounds and reads every expansion image', async () => {
  const library = new BackgroundLibrary({ bundledRoot: root, thumbnail: async () => '' });
  const list = await library.list();
  assert.equal(list.status, 'ready'); assert.equal(list.message, '');
  assert.equal(list.bundledCount, 164); assert.equal(list.items.length, 164);
  assert.equal(new Set(list.items.map(item => item.category)).size, 18);
  const entries = new Map(list.items.map(item => [item.id, item]));
  for (const row of manifest().items) {
    const id = 'builtin:' + row.file.slice('assets/backgrounds/'.length);
    assert.equal(entries.get(id)?.source, 'builtin', row.id);
    const { buffer, mime } = await library.read({ id, token:list.token });
    assert.equal(mime, 'image/png', row.id);
    assert.equal(createHash('sha256').update(buffer).digest('hex'), row.sha256, row.id);
  }
});

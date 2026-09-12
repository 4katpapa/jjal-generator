'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

test('all 100 bundled PNG originals match the generation record and package resource mapping', () => {
  const project = path.resolve(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(project, 'docs/BACKGROUND_GENERATION.json'), 'utf8'));
  const config = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
  assert.ok(config.build.extraResources.some(r => r.from === 'assets/backgrounds' && r.to === 'backgrounds'));
  assert.equal(manifest.items.length, 100);
  const hashes = new Set();
  for (const item of manifest.items) {
    assert.ok(item.file.startsWith('Backgrounds/'));
    const file = path.resolve(project, 'assets/backgrounds', item.file.slice('Backgrounds/'.length));
    assert.ok(file.startsWith(path.join(project, 'assets/backgrounds') + path.sep));
    const bytes = fs.readFileSync(file);
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash, item.sha256, item.id);
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [item.width, item.height]);
    hashes.add(hash);
  }
  assert.equal(hashes.size, 100);
});

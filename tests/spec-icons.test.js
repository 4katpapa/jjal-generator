'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const icons = require('../renderer/spec-icons');
const core = require('../renderer/v2-core');

test('automatic icons cover detected labels and manually named peripherals', () => {
  const pairs = {
    CPU: 'cpu', MB: 'motherboard', RAM: 'ram', VGA: 'gpu', GPU: 'gpu', PSU: 'psu', CHA: 'case', CS: 'cooler',
    'NVMe 2': 'ssd', 'M.2': 'ssd', HDD: 'hdd', 'CPU 쿨러': 'cooler', 'SSD-1': 'ssd',
    '보조 모니터': 'monitor', 'MONITOR 2': 'monitor', '스피커': 'speakers', '마우스': 'mouse',
    '키보드': 'keyboard', '헤드셋': 'headset', '헤드폰': 'headset', MIC: 'microphone',
    '커스텀 장비': 'generic', 'MBTI': 'generic', '': 'generic',
  };
  for (const [label, category] of Object.entries(pairs)) assert.equal(icons.inferCategory(label), category, label);
});

test('explicit choices override inference and survive renaming; none and global off suppress drawing', () => {
  const settings = { enabled: true, series: 'color', size: 1.15 };
  assert.deepEqual(icons.resolveIcon({ label: 'VGA' }, settings), { category: 'gpu', series: 'color', visible: true });
  const row = { label: '보조 장비', icon: 'monitor', iconSeries: 'pixel' };
  assert.deepEqual(icons.resolveIcon(row, settings), { category: 'monitor', series: 'pixel', visible: true });
  assert.equal(icons.resolveIcon({ ...row, label: '이름 변경' }, settings).category, 'monitor');
  assert.equal(icons.resolveIcon({ ...row, icon: 'none' }, settings).visible, false);
  assert.equal(icons.resolveIcon(row, { ...settings, enabled: false }).visible, false);
});

test('invalid icon paths and unknown series fall back to automatic built-in choices', () => {
  const row = { label: 'PSU', icon: '../../outside.png', iconSeries: 'external' };
  assert.deepEqual(icons.normalizeRowChoice(row), {});
  assert.deepEqual(icons.resolveIcon(row, { enabled: true, series: 'invalid' }), { category: 'psu', series: 'color', visible: true });
});

test('old designs keep icons off even when the new design default has icons on', () => {
  const defaults = { card: {}, text: {}, image: {}, rows: [], texts: [], stickers: [], bands: [], fxs: [], specIcons: { enabled: true, series: 'mono', size: 1.4 } };
  assert.equal(core.normalizeState({ schemaVersion: 2, rows: [{ label: 'CPU', value: 'old' }] }, defaults).specIcons.enabled, false);
  assert.equal(core.normalizeState(defaults, defaults).specIcons.enabled, true);
});

test('design and profile row round trips retain overrides, none, colors and long text', () => {
  const row = { label: '모니터', value: 'x'.repeat(1001), color: '#123456', icon: 'monitor', iconSeries: 'pixel' };
  assert.deepEqual(core.normalizeRow(JSON.parse(JSON.stringify(row))), row);
  assert.deepEqual(core.normalizeRow({ label: 'CPU', value: '', icon: 'none' }), { label: 'CPU', value: '', icon: 'none' });
  assert.deepEqual(core.normalizeRow({ label: 'CPU', value: '' }), { label: 'CPU', value: '' });
  const defaults = { card: {}, text: {}, image: {}, rows: [], texts: [], stickers: [], bands: [], fxs: [] };
  const saved = { rows: [row], specIcons: { enabled: true, series: 'mono', size: 1.4 } };
  const reopened = core.normalizeState(JSON.parse(JSON.stringify(core.normalizeState(saved, defaults))), defaults);
  assert.deepEqual(reopened.rows, [row]);
  assert.deepEqual(reopened.specIcons, icons.normalizeSettings(saved.specIcons));
});

test('automatic specification merge retains chosen icons and manual peripheral rows', () => {
  const rows = [{ label: 'CPU', value: '', icon: 'cpu', iconSeries: 'mono' }, { label: '메인 모니터', value: '수동 값', icon: 'monitor' }];
  const merged = core.mergeAutoSpecs(rows, [{ label: 'CPU', value: '자동 CPU' }, { label: 'VGA', value: '자동 GPU' }]);
  assert.deepEqual(merged[0], { ...rows[0], value: '자동 CPU' });
  assert.deepEqual(merged[1], rows[1]);
  assert.equal(icons.resolveIcon(merged[2], { enabled: true }).category, 'gpu');
});

test('icon layout reserves no space when hidden and scales with the fitted text', () => {
  assert.deepEqual(icons.metrics({ enabled: false }, 24, 300), { size: 0, gap: 0, width: 0, textOffset: 0 });
  const large = icons.metrics({ enabled: true, size: 1.4 }, 24, 300);
  const small = icons.metrics({ enabled: true, size: 1.4 }, 12, 300);
  assert.equal(large.size, small.size * 2);
  const narrow = icons.metrics({ enabled: true, size: 1.4 }, 24, 20);
  assert.ok(narrow.width < 20);
});

test('sprite lookup preserves artwork crossing an approximate quarter-cell divider', () => {
  const width = 160, height = 160, pixels = new Uint8ClampedArray(width * height * 4);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    // 마지막 행이 명목상 y=120 경계를 넘어도 투명한 실제 경계로 구분한다.
    const top = r === 3 ? 118 : r * 40 + 8;
    for (let y = top; y < top + 25; y++) for (let x = c * 40 + 8; x < c * 40 + 32; x++) pixels[(y * width + x) * 4 + 3] = 255;
  }
  const rects = icons.spriteRects(pixels, width, height);
  assert.equal(rects.length, 16);
  assert.equal(rects[12].y, 117);
  assert.equal(rects[12].h, 27);
  assert.throws(() => icons.spriteRects(new Uint8ClampedArray(width * height * 4), width, height), /비어/);
});

test('continuous icon ratios and explicit pixel sizes survive normalization and saving', () => {
  assert.equal(icons.normalizeSettings({ size: 1.65 }).size, 1.65);
  for (const size of [0.9, 1.15, 1.4]) assert.equal(icons.normalizeSettings({ size }).size, size);
  const settings = { enabled: true, series: 'pixel', size: 1.65, sizeMode: 'fixed', pixels: 47 };
  const saved = core.normalizeState({ specIcons: settings }, { card: {}, text: {}, image: {} });
  const loaded = core.normalizeState(JSON.parse(JSON.stringify(saved)), {});
  assert.deepEqual(loaded.specIcons, settings);
});

test('fixed pixel icons stay the same size when text changes and remain inside the column', () => {
  const settings = { enabled: true, sizeMode: 'fixed', pixels: 48 };
  assert.equal(icons.metrics(settings, 12, 300).size, 48);
  assert.equal(icons.metrics(settings, 36, 300).size, 48);
  assert.equal(icons.metrics(settings, 24, 300).textOffset, 12);
  assert.ok(icons.metrics(settings, 24, 35).width < 35);
  assert.equal(icons.metrics({ ...settings, enabled: false }, 24, 300).width, 0);
  assert.equal(icons.normalizeSettings({ pixels: Infinity }).pixels, 28);
  assert.equal(icons.normalizeSettings({ size: 900, pixels: 900 }).pixels, 96);
});

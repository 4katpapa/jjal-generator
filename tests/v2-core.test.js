'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../renderer/v2-core');

test('mergeAutoSpecs preserves manual values and fills only empty values', () => {
  const rows = [
    { label: 'CPU', value: '직접 적은 CPU', color: '#ff0000' },
    { label: 'RAM', value: '' },
    { label: 'PSU', value: '850W' },
  ];
  const detected = [
    { label: 'CPU', value: '자동 CPU' },
    { label: 'RAM', value: 'DDR5 32GB' },
    { label: 'PSU', value: '' },
  ];
  const merged = core.mergeAutoSpecs(rows, detected);
  assert.deepEqual(merged, [
    { label: 'CPU', value: '직접 적은 CPU', color: '#ff0000' },
    { label: 'RAM', value: 'DDR5 32GB' },
    { label: 'PSU', value: '850W' },
  ]);
});

test('mergeAutoSpecs inserts repeated hardware beside the matching group', () => {
  const rows = [
    { label: 'CPU', value: '' },
    { label: 'SSD', value: '' },
    { label: 'PSU', value: '850W' },
  ];
  const detected = [
    { label: 'CPU', value: 'Ryzen' },
    { label: 'SSD', value: 'Drive A' },
    { label: 'SSD', value: 'Drive B' },
  ];
  assert.deepEqual(core.mergeAutoSpecs(rows, detected), [
    { label: 'CPU', value: 'Ryzen' },
    { label: 'SSD', value: 'Drive A' },
    { label: 'SSD', value: 'Drive B' },
    { label: 'PSU', value: '850W' },
  ]);
});

test('mergeAutoSpecs treats NVMe, SSD, HDD, and DRIVE as one storage family', () => {
  const merged = core.mergeAutoSpecs(
    [{ label: 'SSD', value: '' }, { label: 'PSU', value: '850W' }],
    [{ label: 'NVMe', value: 'Fast Drive' }, { label: 'HDD', value: 'Archive Drive' }],
  );
  assert.deepEqual(merged, [
    { label: 'NVMe', value: 'Fast Drive' },
    { label: 'HDD', value: 'Archive Drive' },
    { label: 'PSU', value: '850W' },
  ]);
});

test('splitRows uses an explicit two-column break and keeps every row visible', () => {
  const rows = ['CPU', 'MB', 'RAM', 'VGA', 'SSD'].map((label) => ({ label, value: label }));
  rows[1].hidden = true;
  const [left, right] = core.splitRows(rows, 2, 3);
  assert.deepEqual(left.map((row) => row.label), ['CPU', 'MB', 'RAM']);
  assert.deepEqual(right.map((row) => row.label), ['VGA', 'SSD']);
});

test('wrapText respects explicit newlines and prefers word boundaries', () => {
  const measure = (value) => value.length;
  assert.deepEqual(core.wrapText('alpha beta\ngamma', 7, measure), ['alpha', 'beta', 'gamma']);
  assert.deepEqual(core.wrapText('ABCDEFGHI', 4, measure), ['ABCD', 'EFGH', 'I']);
});

test('normalizeState migrates to schema 2, clamps unsafe values, and assigns ids', () => {
  const defaults = {
    schemaVersion: 2,
    name: '', file: null,
    card: { width: 850, height: 300, radius: 18 },
    text: {}, image: {}, rows: [], texts: [], stickers: [], bands: [], fxs: [],
  };
  const state = core.normalizeState({
    card: { width: 99999, height: -1 },
    rows: [{ label: 'A'.repeat(40), value: 123, hidden: true }],
    texts: [{ text: 'hello' }, { text: 'world' }],
  }, defaults);
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.card.width, 2400);
  assert.equal(state.card.height, 120);
  assert.equal(state.rows[0].label.length, 24);
  assert.equal(state.rows[0].value, '123');
  assert.equal(state.rows[0].hidden, undefined);
  assert.ok(state.texts[0].id);
  assert.notEqual(state.texts[0].id, state.texts[1].id);
});

test('normalizeState removes retired shadow/lock state and migrates movable panels', () => {
  const defaults = {
    card: {}, text: {}, image: {}, shadow: {}, deco: {}, specPanel: {},
    rows: [], texts: [], stickers: [], bands: [], fxs: [],
  };
  const state = core.normalizeState({
    shadow: { on: true },
    image: { shape: 'rect', radius: 18, panelX: 120, panelY: 30, panelRotate: 999, hidden: true, locked: true },
    specPanel: { shape: 'rect', radius: 12, x: 40, y: 20, width: 300, height: 140, rotate: -35, hidden: true },
    texts: [{ text: 'A', hidden: true, locked: true }],
  }, defaults);
  assert.equal(state.shadow.on, false);
  assert.equal(state.image.shape, 'round');
  assert.equal(state.image.panelRotate, 180);
  assert.equal(state.image.hidden, false);
  assert.equal(state.image.locked, false);
  assert.equal(state.specPanel.shape, 'round');
  assert.equal(state.specPanel.width, 300);
  assert.equal(state.specPanel.rotate, -35);
  assert.equal(state.texts[0].hidden, false);
  assert.equal(state.texts[0].locked, false);
});

test('normalizeState enforces UI collection limits and migrates effect layers', () => {
  const defaults = {
    card: {}, text: {}, image: {}, shadow: {}, deco: {}, specPanel: {},
    rows: [], texts: [], stickers: [], bands: [], fxs: [],
  };
  const state = core.normalizeState({
    texts: Array.from({ length: 40 }, (_, i) => ({ text: `t${i}` })),
    stickers: Array.from({ length: 40 }, () => ({})),
    bands: Array.from({ length: 20 }, () => ({})),
    fxs: [
      { type: 'neon' },
      { type: 'sparkle' },
      ...Array.from({ length: 10 }, () => ({ type: 'rain' })),
    ],
  }, defaults);
  assert.equal(state.texts.length, 24);
  assert.equal(state.stickers.length, 32);
  assert.equal(state.bands.length, 12);
  assert.equal(state.fxs.length, 8);
  assert.equal(state.fxs[0].layer, 'border');
  assert.equal(state.fxs[1].layer, 'background');
});

test('normalizeState removes retired effects and assigns new effect categories', () => {
  const defaults = {
    card: {}, text: {}, image: {}, shadow: {}, deco: {}, specPanel: {},
    rows: [], texts: [], stickers: [], bands: [], fxs: [],
  };
  const state = core.normalizeState({
    fxs: [
      { type: 'float' }, { type: 'confetti' }, { type: 'fog' }, { type: 'wave' }, { type: 'breath' },
      { type: 'signalwave', direction: -1, waveCount: 9 }, { type: 'telemetrybars', layer: 'overlay' },
      { type: 'frequencyedge', layer: 'background' }, { type: 'ionodes' }, { type: 'segmentrail' },
    ],
  }, defaults);
  assert.deepEqual(state.fxs.map((fx) => fx.type), ['signalwave', 'telemetrybars', 'frequencyedge', 'ionodes', 'marquee']);
  assert.deepEqual(state.fxs.map((fx) => fx.layer), ['background', 'overlay', 'border', 'border', 'border']);
  assert.equal(state.fxs[0].direction, -1);
  assert.equal(state.fxs[0].waveCount, 4);
  assert.equal(state.fxs[4].variant, 'segments');
});

test('signal waveform shares one travel speed while speed controls angular morphing', () => {
  for (const time of [123, 387, 901]) {
    const slow = core.signalWavePhases(time, 0.5, 1);
    const fast = core.signalWavePhases(time, 3, 1);
    assert.ok(Math.abs(slow.travel - fast.travel) < 1e-12, '속도 설정이 수평 이동을 바꿈');
    assert.notEqual(slow.motion, fast.motion, '속도 설정이 파형 변화 속도를 바꾸지 않음');
  }
  assert.equal(core.signalWavePhases(0, 0.5, 1).motionCycles, 1);
  assert.equal(core.signalWavePhases(0, 3, 1).motionCycles, 6);
  assert.equal(core.signalWavePhases(core.SIGNAL_TRAVEL_LOOP_MS * 0.25, 1, 1).travel, 0.25);
  assert.equal(core.signalWavePhases(core.SIGNAL_TRAVEL_LOOP_MS * 0.25, 1, -1).travel, 0.75);
  for (const speed of [0.5, 1, 2, 3]) {
    assert.deepEqual(core.signalWavePhases(0, speed, 1), core.signalWavePhases(core.SIGNAL_TRAVEL_LOOP_MS, speed, 1));
  }

  for (const travel of [0, 0.13, 0.5, 0.93, 1]) {
    for (const channel of [0, 1, 2, 3]) {
      assert.ok(Math.abs(core.signalWaveSample(0, travel, channel, 0.37)
        - core.signalWaveSample(1, travel, channel, 0.37)) < 1e-12);
    }
  }

  // 같은 motionPhase에서 모든 줄은 travelPhase 차이만큼 정확히 평행 이동해야 한다.
  const delta = 0.137;
  for (const channel of [0, 1, 2, 3]) {
    for (const u of [0.02, 0.19, 0.41, 0.68, 0.91]) {
      const before = core.signalWaveSample(u, 0.11, channel, 0.42);
      const after = core.signalWaveSample((u + delta) % 1, (0.11 + delta) % 1, channel, 0.42);
      assert.ok(Math.abs(before - after) < 1e-10, `채널 ${channel}의 수평 이동 속도가 일치하지 않음`);
    }
  }

  const samples = 1024;
  const calm = Array.from({ length: samples }, (_, i) => core.signalWaveSample(i / samples, 0.2, 0, 0.05));
  const twitch = Array.from({ length: samples }, (_, i) => core.signalWaveSample(i / samples, 0.2, 0, 0.32));
  const meanMorphDelta = calm.reduce((sum, value, i) => sum + Math.abs(value - twitch[i]), 0) / samples;
  const peakDelta = Math.abs(Math.max(...calm) - Math.max(...twitch));
  assert.ok(meanMorphDelta > 0.01, `파형 모양 변화가 너무 작음: ${meanMorphDelta}`);
  assert.ok(peakDelta > 0.15, `파형 피크 변화가 너무 작음: ${peakDelta}`);
});

test('exportEstimate reports scaled dimensions, frames, and bounded working memory', () => {
  assert.deepEqual(core.exportEstimate(850, 300, 2, 2000, 30, true), {
    width: 1700,
    height: 600,
    frames: 60,
    rawBytes: 1700 * 600 * 4 * 3,
  });
});

test('contrastRatio distinguishes low and high contrast pairs', () => {
  assert.ok(core.contrastRatio('#000000', '#ffffff') > 20);
  assert.ok(core.contrastRatio('#777777', '#888888') < 2);
});

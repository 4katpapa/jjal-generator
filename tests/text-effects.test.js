'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../renderer/v2-core');
const defaults = { card: {}, text: {}, image: {}, texts: [], rows: [] };

test('legacy designs retain their text colors and outline while new effects default to off', () => {
  const old = { schemaVersion: 2, text: { labelColor: '#123456' }, texts: [{ text: 'old', outline: true, outlineWidth: 7, outlineColor: '#aabbcc' }] };
  const saved = core.normalizeState(old, defaults);
  assert.equal(saved.text.labelColor, old.text.labelColor);
  assert.equal(saved.text.labelEffects.outline, false);
  assert.equal(saved.text.valueEffects.glow, 'none');
  assert.equal(saved.texts[0].outline, true);
  assert.equal(saved.texts[0].outlineWidth, 7);
  assert.equal(saved.texts[0].outlineColor, '#aabbcc');
  assert.equal(saved.texts[0].glow, 'none');
});

test('label, value and independent text effects round-trip through design JSON without sharing state', () => {
  const saved = core.normalizeState({
    text: { labelEffects: { outline: true, glow: 'neon', glowColor: '#00ff00' }, valueEffects: { glow: 'soft', glowBlur: 27, glowStrength: 0.35 } },
    texts: [{ text: '가로\n두 줄', outline: true, outlineWidth: 8, glow: 'neon', glowColor: '#ff0088', glowStrength: 0.6 }, { text: '세로', vertical: true, glow: 'soft' }],
  }, defaults);
  const loaded = core.normalizeState(JSON.parse(JSON.stringify(saved)), defaults);
  assert.deepEqual(loaded.text, saved.text);
  assert.deepEqual(loaded.texts, saved.texts);
  loaded.text.labelEffects.glowColor = '#ffffff';
  assert.equal(loaded.text.valueEffects.glowColor, '#00e5ff');
  assert.equal(loaded.texts[0].glowColor, '#ff0088');
});

test('invalid effect values cannot inject a canvas filter or excessive geometry', () => {
  const normalized = core.normalizeTextEffects({ outline: 'yes', outlineColor: 'url(file:secret)', outlineWidth: -500, glow: 'url(secret)', glowColor: 'red) blur(500px)', glowBlur: Infinity, glowStrength: 500 });
  assert.deepEqual(normalized, { outline: false, outlineColor: '#ffffff', outlineWidth: 1, glow: 'none', glowColor: '#00e5ff', glowBlur: 12, glowStrength: 1 });
  assert.equal(core.normalizeTextEffects({ glowStrength: 0 }).glowStrength, 0);
  assert.equal(core.normalizeTextEffects({ outlineWidth: 999, glowBlur: 999 }).outlineWidth, 16);
  assert.equal(core.normalizeTextEffects({ glowBlur: 999 }).glowBlur, 60);
});

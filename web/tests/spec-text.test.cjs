'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('../spec-text');

test('Korean and English hardware names retain exact model strings', () => {
  assert.deepEqual(parse('CPU: AMD Ryzen 7 9800X3D\r\n그래픽카드：GeForce RTX 5080\n메모리\tDDR5 32GB\n모니터 - 27인치 QHD'), [
    { label: 'CPU', value: 'AMD Ryzen 7 9800X3D' },
    { label: 'VGA', value: 'GeForce RTX 5080' },
    { label: 'RAM', value: 'DDR5 32GB' },
    { label: '모니터', value: '27인치 QHD' },
  ]);
});
test('Numbered storage, custom labels and bullet lists are retained', () => {
  assert.deepEqual(parse('- SSD1: SN850X 2TB\n• SSD2: 990 PRO 1TB\n오디오 인터페이스: Scarlett 2i2\nPSU SF750'), [
    { label: 'SSD1', value: 'SN850X 2TB' }, { label: 'SSD2', value: '990 PRO 1TB' },
    { label: '오디오 인터페이스', value: 'Scarlett 2i2' }, { label: 'PSU', value: 'SF750' },
  ]);
});
test('Malformed and oversized paste is rejected without silently truncating content', () => {
  for (const text of ['', 'CPU', 'CPU: ' + 'x'.repeat(1001), Array(65).fill('CPU: value').join('\n')]) assert.throws(() => parse(text));
});

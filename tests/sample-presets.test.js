'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../renderer/sample-presets');
const V2 = require('../renderer/v2-core');

function fixture() {
  return V2.normalizeState({ schemaVersion: 2, name: '기존 디자인', file: 'existing.json',
    card: { width: 1100, height: 400, bgImageDataUrl: 'data:image/png;base64,old' },
    text: { columns: 2 }, image: { dataUrl: 'data:image/png;base64,image', x: 70, mirrorX: true },
    rows: [ { label: 'CPU', value: '매우 긴 부품 이름 '.repeat(120), icon: 'gpu', iconSeries: 'pixel' },
      { label: '모니터', value: '27인치 QHD', color: '#ff0000' }, { label: 'PSU', value: '' } ],
    texts: [{ id: 'user-text', text: '내가 추가한 문구', x: 30, y: 200 }],
    bands: [{ id: 'user-band', on: true, style: 'popup', x: 40, y: 100 }],
    stickers: [{ id: 'user-sticker', kind: 'emoji', text: '⭐' }],
    fxs: [{ id: 'user-fx', type: 'sparkle', layer: 'overlay', opacity: 0.2 }],
  }, {});
}

test('18 named samples use one bundled family and non-overlapping single-column panels', () => {
  assert.equal(P.CATALOG.length, 18);
  assert.equal(new Set(P.CATALOG.map((p) => p.id)).size, 18);
  assert.equal(new Set(P.CATALOG.map((p) => p.name)).size, 18);
  assert.equal(P.CATALOG.filter((p) => p.side === 'left').length, 9);
  for (const p of P.CATALOG) {
    assert.match(p.label, /^\d{2} .+ · 사양 (왼쪽|오른쪽)$/);
    assert.doesNotMatch(p.label, /심플|은은한 효과|화려한 효과/);
    const source = fixture(), s = P.apply(source, p.id, fixture(), 'nick');
    assert.equal(s.card.width, 850); assert.equal(s.card.height, 300);
    assert.equal(s.card.bgImageDataUrl, null);
    assert.equal(s.text.columns, 1); assert.equal(s.text.minFontSize, 16);
    assert.equal(s.text.hideEmptyRows, true); assert.equal(s.text.fontFamily, P.FONT);
    assert.equal(P.nickname(s).fontFamily, P.FONT);
    assert.equal(s.image.fit, 'contain'); assert.equal(s.preset.motion, !!p.motion);
    assert.equal(s.preset.version, 3);
    assert.equal(s.image.fitScale, true);
    if (p.border === 'none') assert.equal(s.card.borderWidth, 0);
    const sp = s.specPanel, im = s.image, iw = im.width * s.card.width;
    assert.ok(sp.x >= 0 && sp.x + sp.width <= s.card.width);
    assert.ok(im.panelX >= 0 && im.panelX + iw <= s.card.width);
    assert.ok(sp.x + sp.width < im.panelX || im.panelX + iw < sp.x);
    const nick = P.nickname(s);
    assert.ok(nick.y >= 0 && nick.y + nick.size * nick.lineHeight < s.card.height, p.label);
    assert.ok(sp.y >= 0 && sp.y + sp.height <= 300);
    assert.ok(im.panelY >= 0 && im.panelY + im.hFrac * 300 <= 300);
    const ih = im.hFrac * 300, a = im.panelRotate * Math.PI / 180;
    const rotatedW = Math.abs(iw * Math.cos(a)) + Math.abs(ih * Math.sin(a));
    const rotatedH = Math.abs(ih * Math.cos(a)) + Math.abs(iw * Math.sin(a));
    const left = im.panelX + (iw - rotatedW) / 2, top = im.panelY + (ih - rotatedH) / 2;
    assert.ok(left >= 0 && left + rotatedW <= 850 && top >= 0 && top + rotatedH <= 300, p.label);
    assert.ok(left + rotatedW < sp.x || left > sp.x + sp.width, p.label);
  }
});
test('applying a sample leaves source, all rows/overrides, file binding, user elements and image bytes intact', () => {
  const before = fixture(), copy = structuredClone(before);
  let s = P.apply(before, 'sp01', fixture(), 'nick');
  assert.deepEqual(before, copy);
  P.nickname(s).text = '테스트 닉네임';
  P.nickname(s).presetVisible = false;
  s = P.apply(s, 'sp18', fixture(), 'unused-new-id');
  assert.equal(s.file, before.file); assert.equal(s.name, before.name);
  assert.equal(s.image.dataUrl, before.image.dataUrl);
  for (const key of ['rows', 'stickers']) assert.deepEqual(s[key], before[key]);
  for (const key of ['bands', 'fxs']) assert.deepEqual(s[key].filter((e) => e.presetOwner !== P.OWNER), before[key]);
  assert.deepEqual(s.texts.find((t) => t.id === 'user-text'), before.texts[0]);
  assert.equal(P.nickname(s).text, '테스트 닉네임');
  assert.equal(P.nickname(s).presetVisible, false);
  assert.equal(s.texts.length, before.texts.length + 1);
});
test('normalization round trip retains preset linkage, minimum size, hidden nickname and saved custom geometry', () => {
  const s = P.apply(fixture(), 'sp09', fixture(), 'nick');
  s.specPanel.x = 72; s.specPanel.rotate = 7; s.text.columns = 2;
  P.nickname(s).presetVisible = false;
  const loaded = V2.normalizeState(JSON.parse(JSON.stringify(s)), fixture());
  assert.deepEqual(loaded.preset, s.preset);
  assert.equal(loaded.text.footerTextId, 'nick'); assert.equal(loaded.text.headerTextId, '');
  assert.equal(loaded.text.minFontSize, 16);
  assert.equal(loaded.text.columns, 2); assert.equal(loaded.specPanel.x, 72);
  assert.equal(loaded.specPanel.rotate, 7); assert.equal(P.nickname(loaded).presetVisible, false);
  assert.equal(P.nickname(loaded).fitWidth, P.nickname(s).fitWidth);
});
test('side changes keep all 18 identities and styles while moving linked elements and round tripping geometry', () => {
  for (const p of P.CATALOG) {
  const s = P.apply(fixture(), p.id, fixture(), 'nick');
  s.specPanel.x += 7; s.specPanel.width -= 12; s.image.x = 85; s.image.mirrorX = true;
  s.text.valueColor = '#ff22cc'; P.nickname(s).x += 8;
  assert.deepEqual(P.setSide(s, p.side), s);
  const otherSide = p.side === 'left' ? 'right' : 'left', moved = P.setSide(s, otherSide);
  assert.equal(moved.preset.id, p.id); assert.equal(P.sideOf(moved), otherSide);
  assert.match(P.label(moved), new RegExp(`${p.name} · 사양 ${otherSide === 'left' ? '왼쪽' : '오른쪽'}`));
  assert.deepEqual(P.settings(moved), P.settings(s));
  assert.deepEqual(moved.specIcons, s.specIcons); assert.deepEqual(moved.fxs, s.fxs);
  assert.equal(moved.image.panelRotate, s.image.panelRotate);
  assert.equal(moved.image.x, 85); assert.equal(moved.image.mirrorX, true);
  assert.equal(moved.text.valueColor, '#ff22cc');
  assert.deepEqual(P.setSide(moved, p.side), s);
  }
});
test('effects only replace managed slots and reject full collections before modifying them', () => {
  const s = P.apply(fixture(), 'sp13', fixture(), 'nick');
  const userFx = structuredClone(s.fxs.filter((f) => f.presetOwner !== P.OWNER));
  P.setMotion(s, true); assert.equal(s.fxs.length, 3);
  P.setStrength(s, 25); assert.deepEqual(s.fxs[0], userFx[0]);
  assert.equal(s.fxs[1].opacity, s.fxs[1].presetOpacity * .25);
  P.setAccent(s, '#00ffcc'); assert.equal(s.fxs[0].color, userFx[0].color);
  P.setMotion(s, false); assert.deepEqual(s.fxs, userFx);
  s.fxs = Array.from({ length: 8 }, (_, i) => ({ id: `custom-${i}`, type: 'shine' }));
  const before = structuredClone(s);
  assert.throws(() => P.setMotion(s, true), /슬롯/); assert.deepEqual(s, before);
  s.texts = Array.from({ length: 24 }, (_, i) => ({ id: `text-${i}`, text: 'user' }));
  assert.throws(() => P.apply(s, 'sp01', fixture(), 'new'), /24개/);
});

test('both sides and each trio differ structurally with all colors and box coordinates ignored', () => {
  const variants = P.CATALOG.map((p) => {
    const s = P.apply(fixture(), p.id, fixture(), 'nick'), n = P.nickname(s);
    return [s.specIcons.enabled ? s.specIcons.series : 'none',
      `${n.presetAnchor}/${n.presetEdge}/${!!s.text.headerTextId}/${!!s.text.footerTextId}`,
      `${s.image.shape}/${s.image.panelRotate}`, `${s.specPanel.shape}/${s.specPanel.alpha}/${s.specPanel.border}`, s.image.frame,
      s.card.pattern, s.bands.filter((b) => b.presetOwner === P.OWNER).map((b) => `${b.style}/${b.presetAnchor}/${b.pos}`).join(),
      s.fxs.filter((f) => f.presetOwner === P.OWNER).map((f) => f.type).join()];
  });
  assert.equal(new Set(variants.map(JSON.stringify)).size, 18);
  const distinct = (a, b) => assert.ok(variants[a].filter((v, k) => v !== variants[b][k]).length >= 3,
    `recipes ${a + 1}/${b + 1} need at least three structural differences`);
  for (let i = 0; i < 18; i += 2) distinct(i, i + 1);
  for (let group = 0; group < 18; group += 6) {
    for (const offset of [0, 1]) for (let i = group + offset; i < group + 6; i += 2) {
      for (let j = i + 2; j < group + 6; j += 2) distinct(i, j);
    }
  }
  const animated = P.CATALOG.filter((p) => p.motion);
  assert.equal(animated.length, 8);
  assert.equal(new Set(animated.map((p) => p.motion.map((f) => f.type).join())).size, 8);
});

test('all nine left recipes remain identical to the version-two catalog', () => {
  for (const p of P.CATALOG.filter((p) => p.side === 'left')) assert.deepEqual(p, P.find(p.id, 2));
});

test('new decorations preserve user slots and ids and are removed cleanly on switching', () => {
  const source = fixture();
  source.bands[0].id = `${P.OWNER}-band`;
  source.fxs[0].id = `${P.OWNER}-fx-0`;
  for (const p of P.CATALOG) {
    const s = P.apply(source, p.id, fixture(), 'nick');
    assert.equal(new Set(s.bands.map((b) => b.id)).size, s.bands.length);
    assert.equal(new Set(s.fxs.map((f) => f.id)).size, s.fxs.length);
    const plain = P.apply(s, 'sp01', fixture(), 'unused');
    assert.deepEqual(plain.bands, source.bands); assert.deepEqual(plain.fxs, source.fxs);
  }
  const full = fixture(); full.bands = Array.from({ length: 12 }, (_, i) => ({ id: `user-${i}`, on: true }));
  const before = structuredClone(full);
  assert.throws(() => P.apply(full, 'sp05', fixture(), 'nick'), /도형 슬롯/); assert.deepEqual(full, before);
  full.fxs = Array.from({ length: 8 }, (_, i) => ({ id: `fx-${i}`, type: 'shine' }));
  const fullFx = structuredClone(full);
  assert.throws(() => P.apply(full, 'sp13', fixture(), 'nick'), /효과 슬롯/); assert.deepEqual(full, fullFx);
});

test('footer names and paper frames stay attached during growth, normalization and side changes', () => {
  for (const p of P.CATALOG) {
    const s = P.apply(fixture(), p.id, fixture(), 'nick'), grown = P.grow(s, 50), n = P.nickname(s);
    assert.equal(P.nickname(grown).y, n.y + (n.presetEdge === 'bottom' ? 50 : 0));
    for (const b of grown.bands.filter((b) => b.presetOwner === P.OWNER)) {
      const old = s.bands.find((old) => old.id === b.id);
      if (b.presetStretchY) assert.equal(b.height, old.height + 50);
      if (b.presetEdge === 'bottom') assert.equal(b.y, old.y + 50);
    }
    const loaded = V2.normalizeState(JSON.parse(JSON.stringify(grown)), fixture());
    assert.deepEqual(loaded.preset, grown.preset);
    assert.equal(P.nickname(loaded).presetAnchor, n.presetAnchor);
    assert.equal(loaded.text.footerTextId, grown.text.footerTextId);
    assert.equal(loaded.image.fitScale, true);
    const removed = structuredClone(grown); removed.texts = removed.texts.filter((t) => t.id !== n.id);
    const restored = P.restoreNickname(removed, 'replacement');
    assert.equal(restored.x, P.nickname(grown).x); assert.equal(restored.y, P.nickname(grown).y);
  }
});

test('saved version-one presets retain their appearance and old optional motion definitions', () => {
  const old = fixture();
  old.preset = { id: 'sp15', version: 1, nicknameId: 'old-name', side: 'left', effectStrength: 100, motion: false };
  old.texts.push({ id: 'old-name', text: '이전 골드', x: 36, y: 32 });
  const loaded = V2.normalizeState(JSON.parse(JSON.stringify(old)), fixture());
  assert.equal(loaded.preset.version, 1); assert.equal(loaded.card.width, 1100);
  assert.equal(loaded.image.fitScale, false);
  assert.equal(P.nickname(loaded).text, '이전 골드'); assert.match(P.label(loaded), /골드 프레임/);
  P.setMotion(loaded, true);
  assert.deepEqual(loaded.fxs.filter((f) => f.presetOwner === P.OWNER).map((f) => f.type), ['shine', 'dualkeyline']);
  assert.equal(loaded.card.width, 1100); assert.equal(loaded.text.columns, 2);
});

test('saved version-two right designs keep original names, geometry and effects after the catalog changes', () => {
  const names = ['여백 서명', '라벨 프로필', '와이드 타이틀', '메모 태그', '격자 노트', '픽셀 콘솔', '회로 HUD', '라이브 티켓', '오로라 쇼케이스'];
  for (let i = 0; i < names.length; i++) {
    const id = `sp${String(i * 2 + 2).padStart(2, '0')}`, old = fixture();
    old.preset = { id, version: 2, nicknameId: 'old-name', side: 'right', effectStrength: 100, motion: false };
    old.texts.push({ ...old.texts[0], id: 'old-name', text: '저장한 이름', x: 600, y: 35, presetAnchor: 'spec', presetEdge: 'top' });
    old.specPanel.x = 390; old.specPanel.width = 680; old.image.panelX = 20; old.image.side = 'left';
    const loaded = V2.normalizeState(JSON.parse(JSON.stringify(old)), fixture());
    assert.deepEqual(loaded, old);
    assert.equal(P.settings(loaded).name, names[i]); assert.match(P.label(loaded), new RegExp(names[i]));
    assert.notEqual(P.find(id).name, names[i]);
    P.setMotion(loaded, true);
    assert.deepEqual(loaded.fxs.filter((f) => f.presetOwner === P.OWNER).map((f) => f.type),
      P.find(id, 2).motion?.map((f) => f.type) || []);
    P.setStrength(loaded, 75);
    assert.equal(loaded.image.frame, P.find(id, 2).frame);
    assert.equal(loaded.specPanel.x, 390); assert.equal(loaded.image.panelX, 20);
    assert.equal(loaded.card.width, 1100); assert.equal(P.nickname(loaded).text, '저장한 이름');
    const moved = P.setSide(loaded, 'left');
    assert.equal(P.settings(moved).name, names[i]);
    assert.deepEqual(P.setSide(moved, 'right'), loaded);
  }
});

test('larger nicknames retain bottom clearance and reserve adjacent title/photo space', () => {
  for (const p of P.CATALOG) {
    const s = P.apply(fixture(), p.id, fixture(), 'nick'), before = structuredClone(s), n = P.nickname(s);
    const bottom = n.y + n.size * 1.15;
    P.setNicknameSize(s, 60);
    assert.equal(n.size, 60);
    assert.ok(n.y >= 0 && n.y + n.size * 1.15 <= 300, p.label);
    if (n.presetEdge === 'bottom') assert.ok(Math.abs(n.y + n.size * 1.15 - bottom) < .0001);
    if (n.presetAnchor === 'card') {
      const b = s.bands.find((b) => b.presetOwner === P.OWNER);
      assert.ok(n.y >= b.y && n.y + n.size * 1.15 <= b.y + b.height);
      if (n.presetEdge === 'top') assert.ok(s.image.panelY >= b.y + b.height);
      else assert.ok(s.image.panelY + s.image.hFrac * 300 <= b.y);
    }
    P.setNicknameSize(s, P.nickname(before).size);
    assert.ok(Math.abs(n.y - P.nickname(before).y) < .0001);
    assert.ok(Math.abs(s.image.hFrac - before.image.hFrac) < .0001);
    assert.deepEqual(s.rows, before.rows);
  }
});
test('height growth keeps font and single column intact and never exceeds the card limit', () => {
  const s = P.apply(fixture(), 'sp05', fixture(), 'nick'), taller = P.grow(s, 50);
  assert.equal(s.card.height, 300); assert.equal(taller.card.height, 350);
  assert.equal(taller.specPanel.height, s.specPanel.height + 50);
  assert.equal(taller.image.panelY, s.image.panelY); assert.equal(taller.text.fontSize, s.text.fontSize);
  assert.deepEqual(taller.rows, s.rows); assert.equal(taller.text.columns, 1);
  assert.equal(P.grow(taller, 10000).card.height, 1200);
  const reset = structuredClone(s);
  reset.specPanel.x = null; reset.specPanel.width = null; reset.specPanel.height = null;
  assert.equal(P.grow(reset, 50).specPanel.height, null);
  const flipped = P.setSide(reset, 'right');
  assert.ok(Number.isFinite(flipped.specPanel.x) && flipped.specPanel.x < flipped.card.width);
  assert.ok(flipped.specPanel.width > 100);
});

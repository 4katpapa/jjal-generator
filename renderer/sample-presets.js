'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SpecCardPresets = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const FONT = '"SpecCard Nanum Gothic",sans-serif';
  const OWNER = 'sample-preset';
  const clone = (value) => structuredClone(value);
  // Keep the nine left recipes intact. Version two also used them on the right.
  // Boxes are authored at 850 × 300; side is a placement setting, not an identity.
  const themes = [
    { name: '여백 서명', note: '아이콘 없이 넓은 여백 · 사진 아래 중앙 서명 · 테두리 없는 사진',
      bg: '#f3f1ed', bg2: '#f3f1ed', panel: '#f3f1ed', ink: '#303c45', accent: '#546878', second: '#bdc7cc',
      icons: false, frame: 'none', border: 'none', panelAlpha: 0, panelBorder: false, panelShape: 'rect', imageShape: 'rect',
      spec: [28, 22, 478, 256], image: [550, 24, 272, 208],
      nick: { anchor: 'image', edge: 'bottom', x: .5, y: 17, align: 'center', size: 24 } },
    { name: '라벨 프로필', note: '단색 아이콘 · 패널 안 밑줄 제목 · 원형 프로필 사진',
      bg: '#edf1f5', bg2: '#edf1f5', panel: '#ffffff', ink: '#2d3b4b', accent: '#40566c', second: '#b6c3d0',
      icons: 'mono', frame: 'solid', border: 'solid', panelShape: 'rect', imageShape: 'circle', underline: true,
      spec: [24, 20, 504, 260], image: [574, 34, 232, 232],
      nick: { anchor: 'spec', edge: 'top', x: 20, y: 14, size: 25, reserve: 'header' } },
    { name: '와이드 타이틀', note: '컬러 아이콘 · 카드 전체 너비의 상단 제목 띠 · 각진 사진',
      bg: '#fff9ed', bg2: '#fff9ed', panel: '#fff9ed', ink: '#534438', accent: '#96633d', second: '#cdb795',
      icons: 'color', frame: 'none', border: 'solid', panelAlpha: 0, panelBorder: false, panelShape: 'rect', imageShape: 'rect',
      spec: [24, 66, 490, 214], image: [550, 66, 276, 214], padY: 12, bandLayout: 'header',
      nick: { anchor: 'card', edge: 'top', x: .5, y: 12, align: 'center', size: 27 } },
    { name: '메모 태그', note: '컬러 아이콘 · 사진 위 이름 태그 · 둥근 패널 그림자와 이중 사진선',
      bg: '#e3f0e9', bg2: '#f6fcf8', panel: '#ffffff', ink: '#355d51', accent: '#367e65', second: '#82b9a1',
      icons: 'color', frame: 'double', border: 'none', shade: true, band: true, pattern: 'dots', patternAlpha: .16,
      panelBorder: false, panelRadius: 24, imageRadius: 16,
      spec: [24, 24, 480, 252], image: [548, 82, 278, 194],
      nick: { anchor: 'image', edge: 'top', x: .5, y: -50, align: 'center', size: 25 } },
    { name: '격자 노트', note: '아이콘 없는 노트 · 사양 아래 서명 · 격자 바탕과 종이 사진 프레임',
      bg: '#f2eef9', bg2: '#f2eef9', panel: '#f2eef9', ink: '#554866', accent: '#806497', second: '#b9a9c7',
      icons: false, frame: 'none', border: 'none', shade: true, underline: true, pattern: 'grid', patternAlpha: .14,
      panelAlpha: 0, panelBorder: false, panelShape: 'rect', imageShape: 'rect', bandLayout: 'photo-paper',
      spec: [24, 22, 478, 258], image: [548, 32, 268, 226],
      nick: { anchor: 'spec', edge: 'bottom', x: 20, y: -36, size: 24, reserve: 'footer' } },
    { name: '픽셀 콘솔', note: '픽셀 아이콘 · 사진 위 콘솔 제목 · 점선 프레임과 느린 스캔',
      bg: '#15232a', bg2: '#15232a', panel: '#1c3037', ink: '#d6eee6', accent: '#8bdcb8', second: '#4e8c80',
      icons: 'pixel', frame: 'dashed', border: 'solid', pattern: 'horizontal', patternAlpha: .1,
      panelShape: 'rect', imageShape: 'rect', panelAlpha: .88, band: true,
      spec: [20, 20, 496, 260], image: [550, 76, 280, 204],
      nick: { anchor: 'image', edge: 'top', x: 8, y: -45, size: 25 },
      motion: [{ type: 'scanline', layer: 'overlay', opacity: .18, speed: .25, density: .2 }] },
    { name: '회로 HUD', note: '단색 아이콘 · 네온 제목 · 사선 패널과 사진 · 흐르는 회로와 모서리 점등',
      bg: '#08192c', bg2: '#291638', panel: '#0d263a', ink: '#e1f5fb', accent: '#52dcec', second: '#e685d7',
      icons: 'mono', frame: 'glow', border: 'glow', glow: 'neon', outline: true, deco: 'dashed', pattern: 'grid', patternAlpha: .16,
      panelShape: 'para', imageShape: 'diag', panelAlpha: .82, padX: 26, padY: 12,
      spec: [30, 28, 488, 244], image: [552, 28, 268, 244],
      nick: { anchor: 'spec', edge: 'top', x: 26, y: 12, size: 27, reserve: 'header' },
      motion: [{ type: 'circuitpulse', layer: 'background', opacity: .85, speed: .5, density: .5 },
        { type: 'techbrackets', layer: 'border', opacity: .9, speed: .5, density: .2 }] },
    { name: '라이브 티켓', note: '컬러 아이콘 · 하단 닉네임 티켓 · 사선 사진과 줄무늬 · 순환 점선',
      bg: '#30243e', bg2: '#602d4b', panel: '#392840', ink: '#fff0e0', accent: '#ffbf76', second: '#f584b3',
      icons: 'color', frame: 'gradient', border: 'gradient', glow: 'soft', shade: true, pattern: 'diagonal', patternAlpha: .13,
      panelRadius: 20, imageShape: 'para', bandLayout: 'footer', padY: 12,
      spec: [24, 22, 484, 212], image: [542, 22, 284, 212],
      nick: { anchor: 'card', edge: 'bottom', x: .5, y: -45, align: 'center', size: 24 },
      motion: [{ type: 'shine', layer: 'background', opacity: .4, speed: .5, density: .25 },
        { type: 'marquee', layer: 'border', opacity: .85, speed: .75, density: .3, variant: 'segments' }] },
    { name: '오로라 쇼케이스', note: '아이콘 없는 넓은 사양 · 사진 안 하단 이름표 · 오로라와 주파수 테두리',
      bg: '#10373e', bg2: '#37234c', panel: '#122d3c', ink: '#e4fff5', accent: '#71efd0', second: '#c49cf2',
      icons: false, frame: 'glow', border: 'glow', glow: 'soft', deco: 'double', panelAlpha: .5, panelBorder: false,
      panelRadius: 32, imageRadius: 32, padX: 22, band: true, nickBandAlpha: .85, nickBandColor: '#122d3c',
      spec: [24, 24, 472, 252], image: [532, 24, 294, 252],
      nick: { anchor: 'image', edge: 'bottom', x: .5, y: -41, align: 'center', size: 25 },
      motion: [{ type: 'aurora', layer: 'background', opacity: .9, speed: .5, density: .5 },
        { type: 'frequencyedge', layer: 'border', opacity: .7, speed: .5, density: .25 }] },
  ];
  const freeze = (value) => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const rightVariants = [
    { name: '라운드 헤더', note: '단색 아이콘 · 사양 위 제목 · 둥근 세로 사진과 가는 프레임',
      icons: 'mono', frame: 'solid', imageShape: 'round', imageRadius: 32,
      spec: [28, 24, 484, 252], image: [560, 26, 260, 248],
      nick: { anchor: 'spec', edge: 'top', x: 20, y: 12, size: 26, reserve: 'header' } },
    { name: '포토 배지', note: '컬러 아이콘 · 사진 안 하단 이름 배지 · 둥근 패널과 이중 사진선',
      icons: 'color', frame: 'double', panelShape: 'round', panelRadius: 20, imageShape: 'round', imageRadius: 16,
      underline: false, band: true, nickBandColor: '#ffffff', nickBandAlpha: .92,
      spec: [24, 24, 500, 252], image: [556, 24, 268, 252],
      nick: { anchor: 'image', edge: 'bottom', x: .5, y: -40, align: 'center', size: 24 } },
    { name: '원형 명함', note: '단색 아이콘 · 원형 사진 위 이름표 · 독립된 흰색 사양 패널',
      icons: 'mono', frame: 'solid', imageShape: 'circle', panel: '#ffffff', panelAlpha: 1,
      panelBorder: true, panelShape: 'round', panelRadius: 16, bandLayout: null, band: true,
      spec: [28, 24, 504, 252], image: [592, 66, 212, 212],
      nick: { anchor: 'image', edge: 'top', x: .5, y: -46, align: 'center', size: 25 } },
    { name: '엽서 서명', note: '아이콘 없는 사양 · 하단 밑줄 서명 · 기울어진 사진과 옅은 사선 바탕',
      icons: false, frame: 'solid', panelAlpha: 0, panelShape: 'rect', imageShape: 'rect', imageRotate: -3,
      band: false, underline: true, pattern: 'diagonal', patternAlpha: .06,
      spec: [24, 24, 478, 252], image: [544, 32, 274, 236],
      nick: { anchor: 'spec', edge: 'bottom', x: 20, y: -40, size: 24, reserve: 'footer' } },
    { name: '라인 노트', note: '단색 아이콘 · 패널 상단 이름 태그 · 가로줄 바탕과 둥근 사진',
      icons: 'mono', frame: 'solid', panel: '#ffffff', panelAlpha: .9, imageShape: 'round', imageRadius: 28,
      underline: false, band: true, bandLayout: null, pattern: 'horizontal', patternAlpha: .12,
      spec: [30, 20, 486, 260], image: [558, 32, 260, 236],
      nick: { anchor: 'spec', edge: 'top', x: 20, y: 14, size: 25, reserve: 'header' } },
    { name: '픽셀 터미널', note: '픽셀 아이콘 · 카드 하단 상태 띠 · 이중 프레임과 흐르는 코드·점선',
      frame: 'double', border: 'double', pattern: 'grid', band: false, bandLayout: 'footer', padY: 12,
      spec: [20, 22, 500, 212], image: [554, 22, 276, 212],
      nick: { anchor: 'card', edge: 'bottom', x: .5, y: -45, align: 'center', size: 24 },
      motion: [{ type: 'matrix', layer: 'background', opacity: .28, speed: .5, density: .2 },
        { type: 'marquee', layer: 'border', opacity: .45, speed: .5, density: .25, variant: 'segments' }] },
    { name: '시그널 도크', note: '아이콘 없는 사양 · 사진 위 발광 태그 · 둥근 도크와 신호 파형·절개 테두리',
      icons: false, frame: 'double', glow: 'soft', outline: false, deco: 'solid', pattern: 'dots', patternAlpha: .14,
      panelShape: 'round', panelRadius: 12, imageShape: 'round', imageRadius: 18, panelAlpha: .9, padX: 20, padY: 16, band: true,
      spec: [28, 24, 486, 252], image: [560, 78, 260, 194],
      nick: { anchor: 'image', edge: 'top', x: .5, y: -46, align: 'center', size: 25 },
      motion: [{ type: 'signalwave', layer: 'background', opacity: .6, speed: .5, density: .4, waveCount: 2 },
        { type: 'notchframe', layer: 'border', opacity: .9, speed: .75, density: .25 }] },
    { name: '스테이지 배너', note: '아이콘 없는 사양 · 카드 상단 무대 제목 · 원형 사진과 반짝임·모서리 점등',
      icons: false, frame: 'glow', imageShape: 'circle', bandLayout: 'header', pattern: 'dots', patternAlpha: .1,
      spec: [26, 70, 490, 208], image: [600, 74, 204, 204],
      nick: { anchor: 'card', edge: 'top', x: .5, y: 12, align: 'center', size: 27 },
      motion: [{ type: 'sparkle', layer: 'background', opacity: .5, speed: .5, density: .3 },
        { type: 'corners', layer: 'border', opacity: .85, speed: .75, density: .3 }] },
    { name: '오로라 오비트', note: '단색 아이콘 · 사양 아래 네온 서명 · 원형 사진과 고리 바탕·양방향 테두리',
      icons: 'mono', frame: 'double', glow: 'neon', deco: false, panelShape: 'para', panelAlpha: .28,
      imageShape: 'circle', padX: 26, padY: 14, band: false, nickBandAlpha: null, nickBandColor: null, pattern: 'rings', patternAlpha: .15,
      spec: [28, 24, 482, 252], image: [570, 30, 244, 244],
      nick: { anchor: 'spec', edge: 'bottom', x: 26, y: -40, size: 25, reserve: 'footer' },
      motion: [{ type: 'aurora', layer: 'background', opacity: .7, speed: .5, density: .4 },
        { type: 'twochase', layer: 'border', opacity: .65, speed: .75, density: .3 }] },
  ];
  const makeCatalog = (overrides) => freeze(themes.flatMap((theme, i) => ['left', 'right'].map((side, j) => {
    const p = side === 'right' && overrides ? { ...theme, ...overrides[i] } : theme;
    const number = String(i * 2 + j + 1).padStart(2, '0');
    return { ...p, motion: p.motion, id: `sp${number}`, number, side,
      label: `${number} ${p.name} · 사양 ${side === 'left' ? '왼쪽' : '오른쪽'}` };
  })));
  const V2_CATALOG = makeCatalog();
  const CATALOG = makeCatalog(rightVariants);
  // Saved draft-v4 cards keep their original controls. Loading does not reapply a recipe.
  const LEGACY = [
    { name: '화이트 클린', frame: 'solid', border: 'solid' },
    { name: '차콜 클린', frame: 'solid', border: 'solid' },
    { name: '크림 클린', frame: 'solid', border: 'solid' },
    { name: '스카이 소프트', frame: 'solid', border: 'gradient', shade: true },
    { name: '라벤더 글로우', frame: 'glow', border: 'gradient', glow: 'soft', shade: true },
    { name: '민트 라인', frame: 'double', border: 'solid', shade: true },
    { name: '사이버 네온', frame: 'glow', border: 'glow', glow: 'neon', outline: true, deco: 'dashed', motion: ['circuitpulse', 'techbrackets'] },
    { name: '골드 프레임', frame: 'double', border: 'gradient', glow: 'soft', deco: 'double', motion: ['shine', 'dualkeyline'] },
    { name: '오로라 테크', frame: 'gradient', border: 'glow', glow: 'neon', deco: 'solid', motion: ['aurora', 'frequencyedge'] },
  ].map((p) => ({ ...p, patternAlpha: .08, motion: p.motion?.map((type, i) => ({ type, layer: i ? 'border' : 'background', opacity: .4, speed: .5, density: .3 })) }));
  const find = (id, version = 3) => (version === 2 ? V2_CATALOG : CATALOG).find((p) => p.id === id);
  const settings = (s) => s.preset?.version >= 2 ? find(s.preset.id, s.preset.version) : LEGACY[Math.floor(CATALOG.findIndex((p) => p.id === s.preset?.id) / 2)];
  const label = (s) => { const p = find(s.preset?.id); return p && (s.preset.version >= 2
    ? `${p.number} ${settings(s).name} · 사양 ${sideOf(s) === 'left' ? '왼쪽' : '오른쪽'}` : `${p.number} ${settings(s).name} · 기존 구성`); };
  const nickname = (s) => s.texts?.find((t) => t.id === s.preset?.nicknameId);
  const sideOf = (s) => Number.isFinite(s.specPanel.x) && Number.isFinite(s.image.panelX)
    ? (s.specPanel.x < s.image.panelX ? 'left' : 'right') : (s.preset?.side || 'left');
  const effect = (color) => ({ outline: false, outlineColor: '#ffffff', outlineWidth: 1, glow: 'none', glowColor: color, glowBlur: 8, glowStrength: 0.3 });

  function geometry(width, height, side, id = 'sp01', version = 3) {
    const p = find(id, version), scale = width / 850, extra = height - 300;
    const box = ([x, y, w, h]) => ({ x: (side === 'right' ? 850 - x - w : x) * scale, y, w: w * scale, h: Math.max(40, h + extra) });
    return { spec: box(p.spec), image: box(p.image) };
  }

  function placeNickname(s, nick) {
    const p = settings(s), n = p.nick || { anchor: 'spec', edge: 'top', x: 18, y: 14, reserve: 'header' };
    const sp = s.specPanel, im = s.image;
    const box = n.anchor === 'card' ? { x: 0, y: 0, w: s.card.width, h: s.card.height }
      : n.anchor === 'image' ? { x: im.panelX, y: im.panelY, w: im.width * s.card.width, h: im.hFrac * s.card.height }
        : { x: sp.x, y: sp.y, w: sp.width, h: sp.height };
    Object.assign(nick, { x: box.x + (n.align === 'center' ? box.w / 2 : n.x),
      y: box.y + (n.edge === 'bottom' ? box.h : 0) + n.y, align: n.align || 'left',
      fitWidth: Math.max(40, box.w - (n.anchor === 'card' ? 64 : 40)), boxWidth: 0,
      presetAnchor: n.anchor, presetEdge: n.edge });
    s.text.headerTextId = n.reserve === 'header' ? nick.id : '';
    s.text.footerTextId = n.reserve === 'footer' ? nick.id : '';
    return nick;
  }

  function arrange(s, side) {
    let g;
    if (s.preset.version >= 2) g = geometry(s.card.width, s.card.height, side, s.preset.id, s.preset.version);
    else {
      const w = Math.round((s.card.width - 52) * .61), iw = s.card.width - 52 - w;
      g = { spec: { x: side === 'left' ? 18 : 34 + iw, y: 18, w, h: s.card.height - 36 },
        image: { x: side === 'left' ? 34 + w : 18, y: 18, w: iw, h: s.card.height - 36 } };
    }
    Object.assign(s.specPanel, { x: g.spec.x, y: g.spec.y, width: g.spec.w, height: g.spec.h });
    Object.assign(s.image, { side: side === 'left' ? 'right' : 'left', panelX: g.image.x, panelY: g.image.y,
      width: g.image.w / s.card.width, hFrac: g.image.h / s.card.height });
    const nick = nickname(s); if (nick) placeNickname(s, nick);
    s.preset.side = side;
    return s;
  }

  function restoreNickname(s, id) {
    if (s.texts.length >= 24) throw new Error('텍스트 요소가 24개입니다. 직접 만들기에서 한 개를 정리해 주세요.');
    const nick = { id, text: '', size: settings(s)?.nick?.size || 28, fontFamily: s.text.fontFamily,
      color: s.text.labelColor, bold: true, lineHeight: 1.15, presetVisible: true };
    s.texts.push(nick); s.preset.nicknameId = id;
    return placeNickname(s, nick);
  }

  function makeBands(s, p) {
    if (!p.bandLayout) return [];
    let id = `${OWNER}-band`;
    while (s.bands.some((b) => b.presetOwner !== OWNER && b.id === id)) id += '-new';
    const b = { id, presetOwner: OWNER, on: true, style: 'popup', pos: 'top',
      x: 0, y: 0, width: s.card.width, height: 50, radius: 0, presetAnchor: 'card',
      fill: p.panel, alpha: 1, pattern: 'none', patternColor: p.accent, patternAlpha: .12,
      border: 'edge', borderColor: p.second, borderWidth: 1, shadow: false, rotate: 0, hidden: false, locked: false };
    if (p.bandLayout === 'footer') Object.assign(b, { pos: 'bottom', y: s.card.height - 50, presetEdge: 'bottom', pattern: 'diagonal' });
    if (p.bandLayout === 'photo-paper') Object.assign(b, { style: 'popup', fill: '#ffffff',
      x: s.image.panelX - 12, y: s.image.panelY - 12, width: s.image.width * s.card.width + 24,
      height: s.image.hFrac * s.card.height + 34, radius: 2, shadow: true, shadowAlpha: .16, shadowBlur: 12, shadowY: 4,
      presetAnchor: 'image', presetStretchY: true });
    return [b];
  }

  // Only elements explicitly linked by metadata are owned by this feature.
  // Arbitrary user text, bands, stickers, and effects remain independent.
  function apply(source, id, defaults, nicknameId) {
    const p = find(id);
    if (!p) throw new Error('알 수 없는 샘플 프리셋입니다.');
    const s = clone(source), oldNick = nickname(s);
    if (!oldNick && s.texts.length >= 24) throw new Error('텍스트 요소가 24개입니다. 직접 만들기에서 한 개를 정리한 뒤 적용해 주세요.');
    if (!oldNick && (!nicknameId || s.texts.some((t) => t.id === nicknameId))) throw new Error('닉네임 요소 ID가 필요합니다.');
    const restBands = s.bands.filter((b) => b.presetOwner !== OWNER);
    if (restBands.length + (p.bandLayout ? 1 : 0) > 12) throw new Error('이 샘플의 제목/사진 프레임에 도형 슬롯 1개가 필요합니다. 직접 만들기에서 도형을 정리해 주세요.');
    const nick = { ...(oldNick || {}), id: oldNick?.id || nicknameId, text: oldNick ? oldNick.text : '닉네임',
      size: p.nick.size, color: p.accent, fontFamily: FONT, bold: true, weight: 700, italic: false,
      underline: !!p.underline, strike: false, spacing: 0, opacity: 1, rotate: 0, vertical: false,
      lineHeight: 1.15, fillType: 'solid', color2: p.second, gradAngle: 0,
      ...effect(p.accent), outline: !!p.outline, outlineColor: p.bg,
      glow: p.glow || 'none', glowStrength: p.glow === 'neon' ? 0.5 : 0.25,
      shadow: false, background: !!p.band, backgroundColor: p.nickBandColor || p.accent, backgroundAlpha: p.nickBandAlpha || .16,
      backgroundPad: 7, hidden: false, locked: false,
      presetVisible: oldNick?.presetVisible !== false };
    s.texts = s.texts.filter((t) => t.id !== nick.id);
    s.texts.push(nick);
    s.preset = { id, version: 3, nicknameId: nick.id, side: p.side, effectStrength: 100, motion: false };
    Object.assign(s.card, clone(defaults.card), { width: 850, height: 300, radius: p.imageShape === 'rect' ? 8 : 18, corner: 'round',
      bgImageDataUrl: null, bg1: p.bg, bg2: p.bg2, bgStyle: p.bg === p.bg2 ? 'solid' : 'gradient', bgAngle: 25,
      borderStyle: p.border === 'none' ? 'solid' : p.border, borderColor: p.accent, borderColor2: p.second,
      borderWidth: p.border === 'none' ? 0 : p.glow ? 3 : 1.5, borderGlow: 12,
      pattern: p.pattern || 'none', patternColor: p.accent, patternAlpha: p.patternAlpha || .08, clipGlow: true });
    Object.assign(s.text, clone(defaults.text), { fontFamily: FONT, fontSize: 20, columns: 1, uniform: true,
      labelColor: p.accent, valueColor: p.ink, labelBold: true, valueBold: false, labelWidth: 68,
      itemGap: 3, rowGap: 3, valueGap: 10, spacing: 0, columnVAlign: 'center',
      autofit: true, minFontSize: 16, hideEmptyRows: true, headerTextId: '', footerTextId: '',
      labelEffects: effect(p.accent), valueEffects: effect(p.ink) });
    Object.assign(s.specPanel, clone(defaults.specPanel), { on: true, fill: p.panel, alpha: p.panelAlpha ?? 1,
      radius: p.panelRadius || 12, shape: p.panelShape || 'round', slant: 12,
      padX: p.padX || 18, padY: p.padY || 16, border: p.panelBorder !== false, borderColor: p.second,
      borderWidth: 1, shadow: !!p.shade && p.panelAlpha !== 0, shadowAlpha: .14, shadowBlur: 10, shadowY: 3 });
    const dataUrl = s.image.dataUrl;
    Object.assign(s.image, clone(defaults.image), { dataUrl, fit: 'contain', fitScale: true, editMode: 'crop', shape: p.imageShape || 'round',
      panelRotate: p.imageRotate || 0,
      radius: p.imageRadius || 12, slant: 18, frame: p.frame, frameColor: p.accent, frameColor2: p.second,
      frameGlow: 12, frameWidth: p.frame === 'solid' || p.frame === 'dashed' ? 2 : 3,
      shadow: !!p.shade && p.bandLayout !== 'photo-paper', shadowAlpha: .18, shadowBlur: 10, shadowY: 3 });
    Object.assign(s.deco, clone(defaults.deco), { on: !!p.deco, style: p.deco || 'solid', color: p.accent, alpha: 0.5, inset: 8, width: 1 });
    s.specIcons = { ...s.specIcons, enabled: !!p.icons, size: p.icons === 'pixel' ? 1.25 : 1.1, sizeMode: 'text', series: p.icons || 'mono' };
    s.layerTop = 'spec';
    arrange(s, p.side);
    s.bands = [...restBands, ...makeBands(s, p)];
    setMotion(s, !!p.motion);
    return s;
  }

  function setSide(source, side) {
    if (!['left', 'right'].includes(side)) throw new Error('올바른 사양 위치가 아닙니다.');
    const s = clone(source), current = find(s.preset?.id);
    if (!current) return s;
    if (sideOf(s) === side) return s;
    // Old documents retain their paired IDs. New designs keep their identity
    // when moved, so effects and nickname layout cannot change on the next edit.
    if (s.preset.version < 3) {
      const number = Math.floor((Number(current.number) - 1) / 2) * 2 + (side === 'left' ? 1 : 2);
      s.preset.id = `sp${String(number).padStart(2, '0')}`;
    }
    if (![s.specPanel.x, s.specPanel.width, s.image.panelX].every(Number.isFinite)) return arrange(s, side);
    // Reflect each box in place: a second flip recovers custom coordinates exactly.
    s.specPanel.x = s.card.width - s.specPanel.x - s.specPanel.width;
    s.image.panelX = s.card.width - s.image.panelX - s.image.width * s.card.width;
    s.image.side = side === 'left' ? 'right' : 'left';
    const dx = { spec: s.specPanel.x - source.specPanel.x, image: s.image.panelX - source.image.panelX, card: 0 };
    const nick = nickname(s);
    if (nick) nick.x += dx[nick.presetAnchor || 'spec'] || 0;
    s.bands.filter((b) => b.presetOwner === OWNER && Number.isFinite(b.x)).forEach((b) => { b.x += dx[b.presetAnchor] || 0; });
    s.preset.side = side;
    return s;
  }

  function setStrength(s, amount) {
    const p = settings(s);
    if (!p) return;
    const k = Math.max(0, Math.min(100, Number(amount) || 0)) / 100;
    s.preset.effectStrength = Math.round(k * 100);
    const nick = nickname(s);
    if (nick) {
      nick.glow = k && p.glow ? p.glow : 'none';
      nick.glowStrength = (p.glow === 'neon' ? 0.5 : 0.25) * k;
      // A photo caption keeps its opaque backing when decoration is disabled.
      nick.backgroundAlpha = p.nickBandAlpha || (s.preset.version >= 2 ? .16 : .13) * k;
      nick.outline = !!p.outline && k > 0;
    }
    s.specPanel.shadow = !!p.shade && p.panelAlpha !== 0 && k > 0;
    s.specPanel.shadowAlpha = 0.14 * k;
    s.image.shadow = !!p.shade && p.bandLayout !== 'photo-paper' && k > 0;
    s.image.shadowAlpha = 0.18 * k;
    s.image.frame = p.frame === 'glow' && !k ? 'solid' : p.frame;
    s.image.frameGlow = 12 * k;
    s.card.borderStyle = p.border === 'none' || (p.border === 'glow' && !k) ? 'solid' : p.border;
    s.card.borderGlow = 12 * k;
    s.deco.alpha = 0.5 * k;
    s.card.patternAlpha = (p.patternAlpha || .08) * k;
    s.bands.filter((b) => b.presetOwner === OWNER).forEach((b) => { b.shadowAlpha = .16 * k; b.patternAlpha = .12 * k; });
    s.fxs.filter((f) => f.presetOwner === OWNER).forEach((f) => { f.opacity = (f.presetOpacity ?? .4) * k; });
  }

  function setMotion(s, enabled) {
    const p = settings(s);
    if (!p) return;
    const rest = s.fxs.filter((f) => f.presetOwner !== OWNER);
    const types = enabled && p.motion ? p.motion : [];
    if (rest.length + types.length > 8) throw new Error(`기존 효과를 보존하려면 효과 슬롯 ${types.length}개가 필요합니다. 직접 만들기에서 효과를 정리해 주세요.`);
    const ids = new Set(rest.map((f) => f.id));
    s.fxs = [...rest, ...types.map((fx, i) => {
      let id = `${OWNER}-fx-${i}`; while (ids.has(id)) id += '-new'; ids.add(id);
      return { ...fx, id, presetOwner: OWNER, enabled: true, presetOpacity: fx.opacity,
        color: fx.layer === 'border' ? s.image.frameColor2 : s.image.frameColor,
        opacity: fx.opacity * s.preset.effectStrength / 100 };
    })];
    s.preset.motion = types.length > 0;
  }

  function setAccent(s, value) {
    s.text.labelColor = value;
    s.card.borderColor = value;
    s.image.frameColor = value;
    s.deco.color = value;
    s.card.patternColor = value;
    const nick = nickname(s);
    if (nick) { Object.assign(nick, { color: value, glowColor: value }); if (!settings(s)?.nickBandColor) nick.backgroundColor = value; }
    s.bands.filter((b) => b.presetOwner === OWNER).forEach((b) => { b.patternColor = value; });
    s.fxs.filter((f) => f.presetOwner === OWNER && f.layer !== 'border').forEach((f) => { f.color = value; });
  }

  function setNicknameSize(s, size) {
    const nick = nickname(s); if (!nick) return;
    const next = Math.max(16, Math.min(60, Number(size) || 16)), delta = (next - nick.size) * 1.15;
    nick.size = next;
    if (s.preset.version < 2 || !delta) return;
    if (nick.presetEdge === 'bottom') nick.y -= delta;
    const p = settings(s), imageH = s.image.hFrac * s.card.height;
    // Expand the title's space along with its letters, keeping the adjacent
    // photo/panel out of that space. Overflow still uses the normal warning.
    if (nick.presetAnchor === 'card') {
      s.bands.filter((b) => b.presetOwner === OWNER && b.presetAnchor === 'card').forEach((b) => {
        b.height += delta; if (nick.presetEdge === 'bottom') b.y -= delta;
      });
      if (nick.presetEdge === 'top') { s.specPanel.y += delta; s.image.panelY += delta; }
      if (Number.isFinite(s.specPanel.height)) s.specPanel.height = Math.max(40, s.specPanel.height - delta);
      s.image.hFrac = Math.max(40, imageH - delta) / s.card.height;
    } else if (nick.presetAnchor === 'image' && (nick.presetEdge === 'top' || p.nick.y > 0)) {
      if (nick.presetEdge === 'top') s.image.panelY += delta;
      s.image.hFrac = Math.max(40, imageH - delta) / s.card.height;
    }
  }

  function grow(source, pixels) {
    const s = clone(source), delta = Math.min(1200 - s.card.height, Math.max(0, Math.ceil(pixels)));
    if (!delta) return s;
    const imageH = s.image.hFrac * s.card.height;
    s.card.height += delta;
    if (Number.isFinite(s.specPanel.height)) s.specPanel.height += delta;
    s.image.hFrac = (imageH + delta) / s.card.height;
    const nick = nickname(s); if (nick?.presetEdge === 'bottom') nick.y += delta;
    s.bands.filter((b) => b.presetOwner === OWNER).forEach((b) => {
      if (b.presetStretchY) b.height += delta;
      if (b.presetEdge === 'bottom') b.y += delta;
    });
    return s;
  }
  return { FONT, OWNER, CATALOG, find, settings, label, nickname, restoreNickname, sideOf, apply, geometry, setSide, setStrength, setMotion, setAccent, setNicknameSize, grow };
});

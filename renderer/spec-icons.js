'use strict';

(function initSpecIcons(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SpecCardIcons = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  // 생성된 4×4 PNG 아틀라스의 셀 순서. id는 저장 파일·프로필에서 사용하는 고정 키다.
  const CATEGORIES = Object.freeze([
    { id: 'cpu', name: 'CPU', label: 'CPU', group: '본체' },
    { id: 'motherboard', name: '메인보드', label: 'MB', group: '본체' },
    { id: 'ram', name: '메모리', label: 'RAM', group: '본체' },
    { id: 'gpu', name: '그래픽카드', label: 'VGA', group: '본체' },
    { id: 'ssd', name: 'SSD · NVMe', label: 'SSD', group: '본체' },
    { id: 'hdd', name: '하드디스크', label: 'HDD', group: '본체' },
    { id: 'psu', name: '파워서플라이', label: 'PSU', group: '본체' },
    { id: 'case', name: '케이스', label: 'CHA', group: '본체' },
    { id: 'cooler', name: '쿨러 · 냉각', label: 'CS', group: '본체' },
    { id: 'monitor', name: '모니터', label: '모니터', group: '주변기기' },
    { id: 'speakers', name: '스피커', label: '스피커', group: '주변기기' },
    { id: 'mouse', name: '마우스', label: '마우스', group: '주변기기' },
    { id: 'keyboard', name: '키보드', label: '키보드', group: '주변기기' },
    { id: 'headset', name: '헤드셋 · 헤드폰', label: '헤드셋', group: '주변기기' },
    { id: 'microphone', name: '마이크', label: '마이크', group: '주변기기' },
    { id: 'generic', name: '기타 · 직접 입력', label: '기타', group: '기타' },
  ].map((item, index) => Object.freeze({ ...item, index })));
  const SERIES = Object.freeze([
    Object.freeze({ id: 'mono', name: '모노', file: 'assets/spec-icons/mono.png', description: '굵은 윤곽선과 흰색 면' }),
    Object.freeze({ id: 'color', name: '컬러', file: 'assets/spec-icons/color.png', description: '컬러 일러스트' }),
    Object.freeze({ id: 'pixel', name: '픽셀', file: 'assets/spec-icons/pixel.png', description: '레트로 픽셀 스타일' }),
  ]);
  const categoryIds = new Set(CATEGORIES.map((item) => item.id));
  const seriesIds = new Set(SERIES.map((item) => item.id));
  const compact = (value) => String(value || '').toUpperCase().replace(/[\s_.\-()[\]·:/\\]/g, '');
  // 더 구체적인 명칭을 먼저 검사한다. 예: CPU 쿨러는 CPU가 아닌 쿨러다.
  const ALIASES = [
    ['cooler', ['CPUCOOLER', 'COOLINGSYSTEM', 'COOLER', 'CPU쿨러', '수랭쿨러', '공랭쿨러', '쿨러', '냉각', 'FAN', 'CS']],
    ['headset', ['HEADPHONES', 'HEADPHONE', 'HEADSET', '헤드셋', '헤드폰']],
    ['microphone', ['MICROPHONE', 'MIC', '마이크']],
    ['motherboard', ['MOTHERBOARD', 'MAINBOARD', 'MOBO', '메인보드', '마더보드', 'MB']],
    ['gpu', ['GRAPHICSCARD', 'GRAPHIC', '그래픽카드', '그래픽', 'GPU', 'VGA']],
    ['psu', ['POWERSUPPLY', '파워서플라이', '파워', 'PSU']],
    ['case', ['CHASSIS', 'CASE', '케이스', '본체', 'CHA']],
    ['ssd', ['NVME', 'SSD', 'M2']],
    ['hdd', ['HARDDISK', 'HARDDRIVE', '하드디스크', 'HDD', 'DRIVE']],
    ['ram', ['MEMORY', '메모리', 'RAM', '램']],
    ['monitor', ['MONITOR', 'DISPLAY', '모니터', '디스플레이']],
    ['speakers', ['SPEAKERS', 'SPEAKER', '스피커']],
    ['mouse', ['MOUSE', '마우스']],
    ['keyboard', ['KEYBOARD', '키보드']],
    ['cpu', ['PROCESSOR', '프로세서', 'CPU']],
  ];

  function inferCategory(label) {
    const key = compact(label);
    for (const [id, aliases] of ALIASES) {
      if (aliases.some((alias) => key === alias || key.startsWith(alias) && /^\d+$/.test(key.slice(alias.length))
        || /[가-힣]/.test(alias) && key.includes(alias))) return id;
    }
    return 'generic';
  }

  function normalizeSettings(value) {
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const ratio = Number(input.size);
    return {
      enabled: input.enabled === true,
      series: seriesIds.has(input.series) ? input.series : 'color',
      size: Number.isFinite(ratio) ? Math.min(2.5, Math.max(0.5, ratio)) : 1.15,
      sizeMode: input.sizeMode === 'fixed' ? 'fixed' : 'text',
      pixels: Number.isFinite(Number(input.pixels)) && input.pixels != null
        ? Math.min(96, Math.max(8, Number(input.pixels))) : 28,
    };
  }

  function normalizeRowChoice(row) {
    const out = {};
    if (row && (categoryIds.has(row.icon) || row.icon === 'none')) out.icon = row.icon;
    if (row && seriesIds.has(row.iconSeries)) out.iconSeries = row.iconSeries;
    return out; // 생략값은 자동/전체 설정을 뜻한다. 기존 행에는 불필요한 필드를 추가하지 않는다.
  }

  function resolveIcon(row, settings) {
    const input = normalizeSettings(settings);
    const choice = normalizeRowChoice(row);
    const category = choice.icon === 'none' ? null : choice.icon || inferCategory(row && row.label);
    return { category, series: choice.iconSeries || input.series, visible: input.enabled && category !== null };
  }

  function metrics(settings, fontSize, columnWidth) {
    const input = normalizeSettings(settings);
    const requested = input.sizeMode === 'fixed' ? input.pixels : Math.max(0, fontSize) * input.size;
    const size = input.enabled ? Math.min(requested, Math.max(0, columnWidth - 16)) : 0;
    const gap = size ? Math.min(6, Math.max(2, fontSize * 0.2)) : 0;
    return { size, gap, width: size + gap, textOffset: Math.max(0, (size - fontSize) / 2) };
  }

  // 생성 시트의 간격이 조금 달라도 투명한 경계를 찾아 아이콘이 잘리지 않게 한다.
  // PNG는 수정하지 않으며, 실제 그릴 때 사용할 원본 사각형만 계산한다.
  function spriteRects(pixels, width, height) {
    const occupiedX = new Uint32Array(width), occupiedY = new Uint32Array(height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 24) { occupiedX[x]++; occupiedY[y]++; }
    }
    const cuts = (counts, length) => {
      const values = [0];
      for (let i = 1; i < 4; i++) {
        const center = Math.round(length * i / 4), range = Math.floor(length / 16);
        let best = center;
        for (let at = center - range; at <= center + range; at++) {
          if (counts[at] < counts[best] || counts[at] === counts[best] && Math.abs(at - center) < Math.abs(best - center)) best = at;
        }
        if (counts[best] !== 0) throw new Error('아이콘 시트의 투명한 경계를 찾지 못했습니다.');
        values.push(best);
      }
      return [...values, length];
    };
    const xs = cuts(occupiedX, width), ys = cuts(occupiedY, height);
    return CATEGORIES.map(({ index }) => {
      const c = index % 4, r = Math.floor(index / 4);
      let left = xs[c + 1], right = -1, top = ys[r + 1], bottom = -1;
      for (let y = ys[r]; y < ys[r + 1]; y++) for (let x = xs[c]; x < xs[c + 1]; x++) {
        if (pixels[(y * width + x) * 4 + 3] <= 24) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (right < left) throw new Error('비어 있는 아이콘 셀이 있습니다.');
      left = Math.max(xs[c], left - 1); top = Math.max(ys[r], top - 1);
      right = Math.min(xs[c + 1] - 1, right + 1); bottom = Math.min(ys[r + 1] - 1, bottom + 1);
      return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
    });
  }

  return Object.freeze({ CATEGORIES, SERIES, inferCategory, normalizeSettings, normalizeRowChoice, resolveIcon, metrics, spriteRects });
});

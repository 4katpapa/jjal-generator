'use strict';

(function initSpecCardCore(root, factory) {
  const icons = typeof module === 'object' && module.exports ? require('./spec-icons') : root.SpecCardIcons;
  const api = factory(icons);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SpecCardV2 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, (Icons) => {
  const SCHEMA_VERSION = 2;
  const MAX = Object.freeze({ rows: 64, rowValue: 1000, texts: 24, stickers: 32, bands: 12, fxs: 8 });
  const RETIRED_FX_TYPES = new Set(['float', 'confetti', 'fog', 'wave', 'breath']);
  const BORDER_FX_TYPES = new Set([
    'neon', 'pulse', 'spin', 'chase', 'marquee', 'rainbowspin', 'twochase', 'corners', 'electric',
    'techbrackets', 'segmentrail', 'dualkeyline', 'notchframe', 'frequencyedge', 'ionodes',
  ]);
  const BACKGROUND_DEFAULT_FX_TYPES = new Set([
    'hueflow', 'sparkle', 'shine', 'starfield', 'scanline', 'rays',
    'signalwave', 'telemetrybars', 'circuitpulse', 'aurora', 'topodrift', 'isodrift',
  ]);

  function clamp(value, min, max, fallback = min) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function text(value, fallback = '') {
    return value == null ? fallback : String(value);
  }

  function color(value, fallback) {
    const s = text(value).trim();
    return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : fallback;
  }

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function mergePlain(base, incoming) {
    const out = clone(base);
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return out;
    for (const [key, value] of Object.entries(incoming)) {
      if (value === undefined) continue;
      const old = out[key];
      if (old && value && typeof old === 'object' && typeof value === 'object'
          && !Array.isArray(old) && !Array.isArray(value)) {
        out[key] = mergePlain(old, value);
      } else {
        out[key] = clone(value);
      }
    }
    return out;
  }

  function normalizeRow(row) {
    const out = {
      label: text(row && row.label).trim().slice(0, 24),
      // 기존 저장물은 새 입력 한도를 초과해도 내용을 보존한다.
      value: text(row && row.value),
    };
    if (row && row.color) out.color = color(row.color, '#ffffff');
    Object.assign(out, Icons.normalizeRowChoice(row));
    return out;
  }

  function rowFamily(label) {
    const key = text(label).trim().toLocaleUpperCase();
    return ['NVME', 'SSD', 'HDD', 'DRIVE'].includes(key) ? 'STORAGE' : key;
  }

  function ensureIds(list, prefix) {
    const used = new Set();
    return list.map((entry, index) => {
      const item = entry && typeof entry === 'object' ? entry : {};
      let id = text(item.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
      if (!id || used.has(id)) id = `${prefix}-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 7)}`;
      used.add(id);
      return { ...item, id };
    });
  }

  function oneOf(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function clampObjectList(list, prefix, limit, normalize) {
    return ensureIds(Array.isArray(list) ? list.slice(0, limit) : [], prefix)
      .map((item) => normalize(item));
  }

  function normalizedFxLayer(item) {
    const type = text(item.type);
    if (BORDER_FX_TYPES.has(type)) return 'border';
    if (type === 'hueflow') return 'background';
    if (['background', 'overlay'].includes(item.layer)) return item.layer;
    if (BACKGROUND_DEFAULT_FX_TYPES.has(type)) return 'background';
    return 'overlay';
  }

  const SIGNAL_TRAVEL_LOOP_MS = 1400;

  // 모든 줄의 수평 이동은 1.4초 고정 주기를 공유한다. speed는 이동 속도가 아니라
  // 한 이동 주기 안에서 파형 모양이 몇 번 변하는지만 결정한다.
  function signalWavePhases(timeMs, speed = 1, direction = 1) {
    const time = Number(timeMs) || 0;
    const rawTravel = ((time % SIGNAL_TRAVEL_LOOP_MS) + SIGNAL_TRAVEL_LOOP_MS) % SIGNAL_TRAVEL_LOOP_MS
      / SIGNAL_TRAVEL_LOOP_MS;
    const motionCycles = Math.max(1, Math.min(6, Math.round(clamp(speed, 0.5, 3, 1) * 2)));
    return {
      travel: Number(direction) < 0 ? (1 - rawTravel) % 1 : rawTravel,
      motion: (rawTravel * motionCycles) % 1,
      motionCycles,
    };
  }

  // 주기 경계에서 이어지는 각진 QRS형 펄스. 모든 펄스 중심에는 같은 travelPhase를
  // 더해 서로 다른 줄과 피크가 반드시 같은 수평 속도로 움직이게 한다.
  function signalWaveSample(position, travelPhase, channel = 0, motionPhase = travelPhase) {
    const u = Number(position) || 0;
    const travel = Number(travelPhase) || 0;
    const motion = Number(motionPhase) || 0;
    const ch = Number(channel) || 0;
    const tau = Math.PI * 2;
    const wrapDistance = (center) => {
      const d = u - center;
      return ((d + 0.5) % 1 + 1) % 1 - 0.5;
    };
    const twitch = 0.5 + 0.5 * Math.sin(tau * (motion + ch * 0.13));
    const ecgShape = [
      [-5, 0], [-3.2, 0], [-2.7, 0.1 + twitch * 0.08], [-2.08, 0], [-0.66, 0],
      [-0.36 - twitch * 0.08, -0.16 - twitch * 0.13], [0, 0.82 + twitch * 0.38],
      [0.27 + twitch * 0.08, -0.38 - twitch * 0.24], [0.66, 0],
      [1.48, 0], [2.05 + twitch * 0.2, 0.18 + twitch * 0.2], [2.95, 0], [5, 0],
    ];
    const angularPulse = (center, width, strength) => {
      const x = wrapDistance(center) / width;
      if (x <= ecgShape[0][0] || x >= ecgShape[ecgShape.length - 1][0]) return 0;
      for (let i = 1; i < ecgShape.length; i++) {
        if (x > ecgShape[i][0]) continue;
        const [x0, y0] = ecgShape[i - 1];
        const [x1, y1] = ecgShape[i];
        return strength * (y0 + (y1 - y0) * ((x - x0) / (x1 - x0)));
      }
      return 0;
    };
    const channelOffset = ch * 0.071;
    const centerA = (0.12 + travel + channelOffset) % 1;
    const centerB = (0.47 + travel + channelOffset) % 1;
    const centerC = (0.79 + travel + channelOffset) % 1;
    const strengthA = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(tau * (motion + 0.03 + ch * 0.13)));
    const strengthB = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(tau * (motion + 0.36 + ch * 0.13)));
    const strengthC = 0.18 + 0.82 * (0.5 + 0.5 * Math.sin(tau * (motion + 0.69 + ch * 0.13)));
    const triangle = (value) => {
      const fraction = ((value % 1) + 1) % 1;
      return 1 - 4 * Math.abs(fraction - 0.5);
    };
    const electricalNoise = 0.01 * triangle(23 * (u - travel) + motion + ch * 0.17);
    return angularPulse(centerA, 0.014 + twitch * 0.003, strengthA)
      + angularPulse(centerB, 0.012 + (1 - twitch) * 0.003, strengthB)
      + angularPulse(centerC, 0.011 + twitch * 0.002, strengthC) + electricalNoise;
  }

  function normalizeState(incoming, defaults) {
    const legacy = !incoming || Number(incoming.schemaVersion || 1) < SCHEMA_VERSION;
    const out = mergePlain(defaults, incoming);
    for (const key of ['card', 'text', 'image', 'shadow', 'deco', 'specPanel']) {
      if (!out[key] || typeof out[key] !== 'object' || Array.isArray(out[key])) out[key] = {};
    }
    out.schemaVersion = SCHEMA_VERSION;
    out.name = text(out.name).slice(0, 120);
    out.file = out.file == null ? null : text(out.file).slice(0, 260);
    out.specIcons = Icons.normalizeSettings(incoming && incoming.specIcons);

    out.card.width = Math.round(clamp(out.card.width, 300, 2400, 850));
    out.card.height = Math.round(clamp(out.card.height, 120, 1200, 300));
    out.card.radius = clamp(out.card.radius, 0, 600, 18);
    out.card.bgAngle = clamp(out.card.bgAngle, 0, 360, 90);
    out.card.borderWidth = clamp(out.card.borderWidth, 0, 80, 6);
    out.card.patternAlpha = clamp(out.card.patternAlpha, 0, 1, 0.15);
    out.card.patternScale = clamp(out.card.patternScale, 0.25, 6, 1);
    out.card.patternRotate = clamp(out.card.patternRotate, -180, 180, 0);
    out.card.patternLineWidth = clamp(out.card.patternLineWidth, 0.25, 12, 1);
    out.card.patternX = clamp(out.card.patternX, -1000, 1000, 0);
    out.card.patternY = clamp(out.card.patternY, -1000, 1000, 0);
    out.card.bgImageOpacity = clamp(out.card.bgImageOpacity, 0, 1, 1);
    out.card.bgImageBlur = clamp(out.card.bgImageBlur, 0, 80, 0);
    out.card.bgImageDim = clamp(out.card.bgImageDim, 0, 1, 0);
    out.card.bgImageScale = clamp(out.card.bgImageScale, 0.2, 6, 1);
    out.card.bgImageX = clamp(out.card.bgImageX, -2400, 2400, 0);
    out.card.bgImageY = clamp(out.card.bgImageY, -1200, 1200, 0);
    out.card.borderAngle = clamp(out.card.borderAngle, 0, 360, 45);
    out.card.borderDash = clamp(out.card.borderDash, 0.25, 20, 2.5);
    out.card.borderGap = clamp(out.card.borderGap, 0.25, 20, 1.6);
    out.card.borderGlow = clamp(out.card.borderGlow, 0, 100, 18);
    out.card.exportBg = oneOf(out.card.exportBg, ['transparent', 'white', 'card', 'custom'], 'transparent');
    out.card.exportBg2 = color(out.card.exportBg2, '#ffffff');
    out.card.clipGlow = out.card.clipGlow !== false;

    out.text.columns = Number(out.text.columns) === 2 ? 2 : 1;
    out.text.fontSize = clamp(out.text.fontSize, 8, 240, 24);
    out.text.offX = clamp(out.text.offX, -2400, 4800, 34);
    out.text.offY = clamp(out.text.offY, -1200, 2400, 0);
    out.text.rowGap = clamp(out.text.rowGap, -8, 100, 4);
    out.text.spacing = clamp(out.text.spacing, -3, 20, 0);
    out.text.labelWidth = clamp(out.text.labelWidth, 0, 800, 66);
    out.text.columnBreak = Math.max(1, Math.round(clamp(out.text.columnBreak, 1, MAX.rows, 4)));
    out.text.columnGap = clamp(out.text.columnGap, 0, 240, 36);
    out.text.itemGap = clamp(out.text.itemGap, -8, 80, 6);
    out.text.innerLineGap = 4;
    out.text.valueGap = clamp(out.text.valueGap, 0, 100, 8);
    out.text.wrapWidth = 0;
    out.text.labelAlign = ['left', 'center', 'right'].includes(out.text.labelAlign) ? out.text.labelAlign : 'left';
    out.text.valueAlign = ['left', 'center', 'right'].includes(out.text.valueAlign) ? out.text.valueAlign : 'left';
    out.text.columnVAlign = ['top', 'center', 'bottom', 'independent'].includes(out.text.columnVAlign)
      ? out.text.columnVAlign : 'center';
    out.text.fontFamily = text(out.text.fontFamily).slice(0, 200);

    out.image.width = clamp(out.image.width, 0.05, 1, 0.4);
    out.image.scale = clamp(out.image.scale, 0.05, 10, 1);
    out.image.x = clamp(out.image.x, -4800, 4800, 0);
    out.image.y = clamp(out.image.y, -2400, 2400, 0);
    out.image.pX = clamp(out.image.pX, -2400, 2400, 0);
    out.image.pY = clamp(out.image.pY, -1200, 1200, 0);
    out.image.panelX = out.image.panelX == null ? null : clamp(out.image.panelX, -2400, 4800, 0);
    out.image.panelY = out.image.panelY == null ? null : clamp(out.image.panelY, -1200, 2400, 0);
    out.image.panelRotate = clamp(out.image.panelRotate, -180, 180, 0);
    out.image.hFrac = clamp(out.image.hFrac, 0.05, 1.5, 1);
    out.image.radius = clamp(out.image.radius, 0, 600, 0);
    if (legacy && incoming && incoming.image && incoming.image.shape === 'rect' && Number(incoming.image.radius) > 0) {
      out.image.shape = 'round';
    }
    out.image.shape = oneOf(out.image.shape, ['rect', 'round', 'diag', 'trape', 'tri', 'para', 'circle'], 'rect');
    out.image.fit = oneOf(out.image.fit, ['free', 'cover', 'contain', 'width', 'height', 'stretch'], 'free');
    out.image.editMode = oneOf(out.image.editMode, ['panel', 'crop'], 'panel');
    out.image.opacity = clamp(out.image.opacity, 0, 1, 1);
    out.image.rotate = clamp(out.image.rotate, -180, 180, 0);
    out.image.brightness = clamp(out.image.brightness, 0, 3, 1);
    out.image.contrast = clamp(out.image.contrast, 0, 3, 1);
    out.image.saturation = clamp(out.image.saturation, 0, 3, 1);
    out.image.shadowAlpha = clamp(out.image.shadowAlpha, 0, 1, 0.45);
    out.image.shadowBlur = clamp(out.image.shadowBlur, 0, 120, 22);
    out.image.shadowX = clamp(out.image.shadowX, -160, 160, 0);
    out.image.shadowY = clamp(out.image.shadowY, -160, 160, 10);
    out.image.mirrorX = !!out.image.mirrorX;
    out.image.hidden = false;
    out.image.locked = false;

    out.shadow.on = false;
    out.shadow.alpha = clamp(out.shadow.alpha, 0, 1, 0.35);
    out.shadow.blur = clamp(out.shadow.blur, 0, 160, 28);
    out.shadow.x = clamp(out.shadow.x, -240, 240, 0);
    out.shadow.y = clamp(out.shadow.y, -240, 240, 14);
    out.deco.alpha = clamp(out.deco.alpha, 0, 1, 0.9);
    out.deco.inset = clamp(out.deco.inset, 0, 300, 12);
    out.deco.width = clamp(out.deco.width, 0, 80, 2);

    out.specPanel.alpha = clamp(out.specPanel.alpha, 0, 1, 0.3);
    out.specPanel.radius = clamp(out.specPanel.radius, 0, 600, 16);
    out.specPanel.padX = clamp(out.specPanel.padX, 0, 300, 16);
    out.specPanel.padY = clamp(out.specPanel.padY, 0, 300, 16);
    out.specPanel.borderWidth = clamp(out.specPanel.borderWidth, 0, 80, 2);
    out.specPanel.shadowAlpha = clamp(out.specPanel.shadowAlpha, 0, 1, 0.35);
    out.specPanel.shadowBlur = clamp(out.specPanel.shadowBlur, 0, 160, 20);
    out.specPanel.shadowX = clamp(out.specPanel.shadowX, -240, 240, 0);
    out.specPanel.shadowY = clamp(out.specPanel.shadowY, -240, 240, 8);
    out.specPanel.x = out.specPanel.x == null ? null : clamp(out.specPanel.x, -2400, 4800, 0);
    out.specPanel.y = out.specPanel.y == null ? null : clamp(out.specPanel.y, -1200, 2400, 0);
    out.specPanel.width = out.specPanel.width == null ? null : clamp(out.specPanel.width, 40, 4800, 320);
    out.specPanel.height = out.specPanel.height == null ? null : clamp(out.specPanel.height, 30, 2400, 160);
    out.specPanel.rotate = clamp(out.specPanel.rotate, -180, 180, 0);
    if (legacy && incoming && incoming.specPanel && incoming.specPanel.shape === 'rect' && Number(incoming.specPanel.radius) > 0) {
      out.specPanel.shape = 'round';
    }
    out.specPanel.shape = oneOf(out.specPanel.shape, ['rect', 'round', 'para', 'ellipse'], 'rect');
    out.specPanel.hidden = false;
    out.specPanel.locked = false;

    out.rows = Array.isArray(out.rows) ? out.rows.map(normalizeRow) : [];
    out.texts = clampObjectList(out.texts, 'text', MAX.texts, (item) => ({
      ...item,
      text: text(item.text).slice(0, 4000),
      size: clamp(item.size, 10, 240, 34),
      x: item.x == null ? null : clamp(item.x, -4800, 4800, 0),
      y: item.y == null ? null : clamp(item.y, -2400, 2400, 0),
      rotate: clamp(item.rotate, -180, 180, 0), opacity: clamp(item.opacity, 0, 1, 1),
      lineHeight: clamp(item.lineHeight, 0.7, 2.5, 1.15), boxWidth: clamp(item.boxWidth, 0, 2400, 0),
      shadowAlpha: clamp(item.shadowAlpha, 0, 1, 0.55), shadowBlur: clamp(item.shadowBlur, 0, 160, 6),
      shadowX: clamp(item.shadowX, -240, 240, 0), shadowY: clamp(item.shadowY, -240, 240, 2),
      hidden: false, locked: false,
    }));
    out.stickers = clampObjectList(out.stickers, 'sticker', MAX.stickers, (item) => ({
      ...item, size: clamp(item.size, 8, 1200, 48),
      x: clamp(item.x, -4800, 4800, out.card.width / 2), y: clamp(item.y, -2400, 2400, out.card.height / 2),
      rotate: clamp(item.rotate, -180, 180, 0), opacity: clamp(item.opacity, 0, 1, 1),
      hidden: false, locked: false,
    }));
    out.bands = clampObjectList(out.bands, 'band', MAX.bands, (item) => ({
      ...item, width: clamp(item.width, 40, 2400, 280), height: clamp(item.height, 20, 1200, 70),
      x: item.x == null ? null : clamp(item.x, -2400, 2400, 0),
      y: item.y == null ? null : clamp(item.y, -1200, 1200, 0),
      rotate: clamp(item.rotate, -180, 180, 0), alpha: clamp(item.alpha, 0, 1, 0.5),
      shadowAlpha: clamp(item.shadowAlpha, 0, 1, 0.28), shadowBlur: clamp(item.shadowBlur, 0, 160, 10),
      shadowX: clamp(item.shadowX, -240, 240, 0), shadowY: clamp(item.shadowY, -240, 240, 4),
      hidden: false, locked: false,
    }));
    const activeFxs = Array.isArray(out.fxs)
      ? out.fxs.filter((item) => !RETIRED_FX_TYPES.has(text(item && item.type)))
      : [];
    out.fxs = clampObjectList(activeFxs, 'fx', MAX.fxs, (item) => {
      const wasSegmentRail = text(item.type) === 'segmentrail';
      const migrated = {
        ...item,
        type: wasSegmentRail ? 'marquee' : text(item.type),
        variant: wasSegmentRail ? 'segments' : item.variant,
      };
      return {
        ...migrated, enabled: item.enabled !== false,
        layer: normalizedFxLayer(migrated),
        variant: migrated.type === 'marquee' ? oneOf(migrated.variant, ['dashes', 'segments'], 'dashes') : migrated.variant,
        speed: clamp(item.speed, migrated.type === 'signalwave' ? 0.5 : 0.25, 3, 1),
        density: clamp(item.density, 0.1, 1, 0.5),
        waveCount: migrated.type === 'signalwave' ? Math.round(clamp(item.waveCount, 1, 4, 3)) : item.waveCount,
        opacity: clamp(item.opacity, 0, 1, 0.45), direction: Number(item.direction) < 0 ? -1 : 1,
      };
    });
    return out;
  }

  function mergeAutoSpecs(existingRows, detectedRows, enabledIndexes) {
    const existing = (Array.isArray(existingRows) ? existingRows : []).map(normalizeRow);
    const allow = enabledIndexes ? new Set(enabledIndexes) : null;
    const detected = (Array.isArray(detectedRows) ? detectedRows : [])
      .map((row, index) => ({ ...normalizeRow(row), _index: index }))
      .filter((row) => row.label && row.value.trim() && (!allow || allow.has(row._index)));

    const queues = new Map();
    detected.forEach((row) => {
      const key = rowFamily(row.label);
      if (!queues.has(key)) queues.set(key, []);
      queues.get(key).push(row);
    });

    const merged = [];
    const lastLabelIndex = new Map();
    for (const row of existing) {
      const key = rowFamily(row.label);
      const queue = queues.get(key);
      if (queue && queue.length) {
        const auto = queue.shift();
        // 자동값은 빈 수동칸만 채운다. 값이 이미 있으면 사용자가 명시적으로 선택한 경우에도 보존한다.
        merged.push(row.value.trim() ? row : { ...row, label: auto.label, value: auto.value });
      } else {
        merged.push(row);
      }
      lastLabelIndex.set(key, merged.length - 1);
    }

    // 같은 장치의 추가 항목은 기존 묶음 바로 뒤에 삽입한다.
    for (const [key, queue] of queues.entries()) {
      if (!queue.length) continue;
      let at = lastLabelIndex.has(key) ? lastLabelIndex.get(key) + 1 : merged.length;
      for (const row of queue) {
        merged.splice(at, 0, { label: row.label, value: row.value });
        at += 1;
      }
      for (const [other, pos] of lastLabelIndex.entries()) {
        if (pos >= at - queue.length) lastLabelIndex.set(other, pos + queue.length);
      }
      lastLabelIndex.set(key, at - 1);
    }
    return merged;
  }

  function splitRows(rows, columns, breakAt) {
    const list = Array.isArray(rows) ? rows : [];
    if (Number(columns) !== 2) return [list];
    const fallback = Math.ceil(list.length / 2);
    const cut = Math.min(list.length, Math.max(1, Math.round(Number(breakAt) || fallback)));
    return [list.slice(0, cut), list.slice(cut)];
  }

  function wrapText(input, maxWidth, measure) {
    const paragraphs = text(input).replace(/\r\n?/g, '\n').split('\n');
    const width = Math.max(1, Number(maxWidth) || 1);
    const measureText = typeof measure === 'function' ? measure : (s) => text(s).length;
    const result = [];

    for (const paragraph of paragraphs) {
      if (!paragraph) { result.push(''); continue; }
      if (measureText(paragraph) <= width) { result.push(paragraph); continue; }
      const tokens = paragraph.match(/\S+\s*|\s+/g) || [...paragraph];
      let line = '';
      for (const token of tokens) {
        const candidate = line + token;
        if (line && measureText(candidate) > width) {
          result.push(line.trimEnd());
          line = token.trimStart();
        } else {
          line = candidate;
        }
        while (line && measureText(line) > width) {
          let cut = 1;
          while (cut < line.length && measureText(line.slice(0, cut + 1)) <= width) cut += 1;
          result.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      }
      result.push(line.trimEnd());
    }
    return result.length ? result : [''];
  }

  function exportEstimate(width, height, scale, durationMs, fps, animated) {
    const w = Math.max(1, Math.round(clamp(width, 1, 10000, 1) * clamp(scale, 0.25, 4, 1)));
    const h = Math.max(1, Math.round(clamp(height, 1, 10000, 1) * clamp(scale, 0.25, 4, 1)));
    const frames = animated
      ? Math.max(2, Math.round(clamp(durationMs, 100, 30000, 2000) / 1000 * clamp(fps, 1, 60, 24)))
      : 1;
    return { width: w, height: h, frames, rawBytes: w * h * 4 * Math.min(frames, 3) };
  }

  function relativeLuminance(hex) {
    const value = color(hex, '#000000').slice(1);
    const parts = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return parts[0] * 0.2126 + parts[1] * 0.7152 + parts[2] * 0.0722;
  }

  function contrastRatio(a, b) {
    const l1 = relativeLuminance(a);
    const l2 = relativeLuminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  return Object.freeze({
    SCHEMA_VERSION, MAX, clamp, clone, mergePlain, normalizeRow, normalizeState,
    mergeAutoSpecs, splitRows, wrapText, exportEstimate, contrastRatio, rowFamily,
    SIGNAL_TRAVEL_LOOP_MS, signalWavePhases, signalWaveSample,
  });
});

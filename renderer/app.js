'use strict';

const V2 = window.SpecCardV2;
if (!V2) throw new Error('v2-core.js가 app.js보다 먼저 로드되어야 합니다.');

let idSeq = 0;
function makeId(prefix) {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq.toString(36)}`;
}

// ---------------- 상태 ----------------
function newBand() {
  return { id: makeId('band'), on: false, style: 'strip', pos: 'bottom', height: 70, fill: '#ffffff', alpha: 0.5,
           width: 280, x: null, y: null, radius: 14, rotate: -3, tail: 'bl',
           pattern: 'none', patternColor: '#ffffff', patternAlpha: 0.15,
           border: 'none', borderColor: '#ffffff', borderWidth: 2,
           shadow: true, shadowColor: '#000000', shadowAlpha: 0.28,
           shadowBlur: 10, shadowX: 0, shadowY: 4, hidden: false, locked: false };
}

function defaultState() {
  return {
    schemaVersion: V2.SCHEMA_VERSION,
    name: '',
    file: null, // 저장 파일명 (있으면 덮어쓰기)
    card: { width: 850, height: 300, radius: 18, corner: 'round',
            borderColor: '#e9a8ff', borderWidth: 6, borderStyle: 'solid', borderColor2: '#7c3aed',
            bg1: '#fbe4ff', bg2: '#f3d0ff', bgAngle: 90, bgStyle: 'gradient',
            pattern: 'none', patternColor: '#ffffff', patternAlpha: 0.15,
            patternScale: 1, patternRotate: 0, patternLineWidth: 1, patternX: 0, patternY: 0,
            borderAngle: 45, borderDash: 2.5, borderGap: 1.6, borderGlow: 18,
            bgImageDataUrl: null, bgImageOpacity: 1, bgImageBlur: 0, bgImageDim: 0,
            bgImageX: 0, bgImageY: 0, bgImageScale: 1,
            // 테두리 글로우·테두리 효과가 카드 밖으로 번지면 그만큼 여백이 생기고,
            // 그 여백은 투명이라 알파를 무시하는 뷰어(디시 등)에서 검게 보인다.
            clipGlow: true,
            exportBg: 'transparent', exportBg2: '#ffffff' }, // 'transparent' | 'white' | 'card' | 'custom'
    text: { labelColor: '#c026d3', valueColor: '#6b21a8', uniform: true, fontSize: 24,
            offX: 34, offY: 0, rowGap: 4, spacing: 0, labelWidth: 66, columns: 1, autofit: true,
            columnBreak: 4, columnGap: 36, itemGap: 6, innerLineGap: 4,
            valueGap: 8, wrapWidth: 0, labelAlign: 'left', valueAlign: 'left', columnVAlign: 'center',
            fontFamily: '"Malgun Gothic","Segoe UI",sans-serif',
            labelBold: true, valueBold: true,
            labelGrad: false, labelColor2: '#7c3aed', labelShadow: false, labelShadowColor: '#000000',
            valueGrad: false, valueColor2: '#7c3aed', valueShadow: false, valueShadowColor: '#000000' },
    image: { dataUrl: null, side: 'right', width: 0.4, scale: 1, x: 0, y: 0,
             radius: 0, fit: 'free', shape: 'rect', slant: 70, flip: false,
             editMode: 'panel', panelX: null, panelY: null, panelRotate: 0,
             hFrac: 1, pX: 0, pY: 0, frame: 'none', frameColor: '#ffffff',
             frameColor2: '#c026d3', frameWidth: 6,
             shadow: false, shadowColor: '#000000', shadowAlpha: 0.45, shadowBlur: 22,
             shadowX: 0, shadowY: 10, opacity: 1, rotate: 0, mirrorX: false,
             brightness: 1, contrast: 1, saturation: 1, hidden: false, locked: false },
    layerTop: 'spec', // 사양/이미지 패널이 겹칠 때 위에 그릴 쪽
    shadow: { on: false, color: '#000000', alpha: 0.35, blur: 28, x: 0, y: 14 },
    deco: { on: false, color: '#ffffff', alpha: 0.9, inset: 12, width: 2, style: 'solid' },
    specPanel: { on: false, fill: '#ffffff', alpha: 0.3, radius: 16,
                 shape: 'rect', slant: 40, padX: 16, padY: 16,
                 x: null, y: null, width: null, height: null, rotate: 0,
                 pattern: 'none', patternColor: '#ffffff', patternAlpha: 0.15,
                 border: false, borderColor: '#ffffff', borderWidth: 2, shadow: false,
                 shadowColor: '#000000', shadowAlpha: 0.35, shadowBlur: 20,
                 shadowX: 0, shadowY: 8, hidden: false, locked: false },
    bands: [newBand()], // 밴드 목록 (최대 MAX_BANDS개)
    fxs: [], // 움직임 효과 목록 (최대 MAX_FX개): { type, speed, density, color }
    stickers: [], // 스티커 (이모지·이미지): { type, emoji|dataUrl, x, y, size, rotate }
    texts: [],
    rows: [
      { label: 'CPU', value: '' },
      { label: 'MB', value: '' },
      { label: 'RAM', value: '' },
      { label: 'VGA', value: '' },
      { label: 'SSD', value: '' },
      { label: 'PSU', value: '' },
      { label: 'CHA', value: '' },
      { label: 'CS', value: '' },
    ],
  };
}

const MAX_TEXTS = 24;
function newTextEl() {
  return {
    id: makeId('text'),
    text: '새 텍스트', size: 34, color: '#a12ea1',
    x: null, y: null, align: 'center', fontFamily: '',
    fillType: 'solid', color2: '#7c3aed', gradAngle: 0,
    outline: false, outlineColor: '#ffffff', outlineWidth: 4,
    shadow: false, shadowColor: '#000000', shadowAlpha: 0.55,
    shadowBlur: 6, shadowX: 0, shadowY: 2, opacity: 1, rotate: 0,
    // 굵게는 꺼진 상태로 시작 — 켜져 있으면 B를 눌러도 굵어지지 않고 얇아져서 안 먹는 것처럼 보임
    bold: false, italic: false, underline: false, strike: false, spacing: 0,
    vertical: false, lineHeight: 1.15, boxWidth: 0, background: false,
    backgroundColor: '#000000', backgroundAlpha: 0.25, backgroundPad: 8,
    hidden: false, locked: false, // 세로쓰기
  };
}

let state = V2.normalizeState(defaultState(), defaultState());
let imgEl = null;          // 로드된 Image 객체 캐시 (정지 이미지)
let bgImgEl = null;        // 카드 전체 배경 이미지
let gifAnim = null;        // GIF 움짤: { frames: [{bmp, delay}], total }
let hit = { texts: [], stickers: [], bands: [], panel: null, panelBase: null, spec: null, specBase: null, specContent: null, specLayout: null }; // 드래그·선택용
let layout = { ox: 0, oy: 0, issues: [] }; // 캔버스 내 카드 원점(그림자 마진)
let selected = null;       // { kind: image|spec|text|sticker|band, idx? }
let exportRendering = false;
let fxPaused = false;
let fxPauseAt = 0;
let bgImageDragMode = false;
let dirty = false;
let changeTracking = false;
let autosaveTimer = null;
let autosaveRevision = 0;

function updateSaveStatus(message) {
  const indicator = document.getElementById('dirty-indicator');
  const autosave = document.getElementById('autosave-status');
  if (indicator) {
    indicator.classList.toggle('is-clean', !dirty);
    indicator.classList.toggle('is-dirty', dirty);
    indicator.textContent = dirty ? '저장 안 됨' : '저장됨';
  }
  if (autosave && message) autosave.textContent = message;
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  const revision = ++autosaveRevision;
  updateSaveStatus('자동 저장 대기');
  autosaveTimer = setTimeout(async () => {
    if (!dirty || revision !== autosaveRevision) return;
    try {
      updateSaveStatus('복구본 저장 중…');
      await window.api.writeAutosave(V2.clone(state));
      if (revision === autosaveRevision && dirty) {
        updateSaveStatus(`복구본 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
      }
    } catch (error) {
      updateSaveStatus('복구본 저장 실패');
      console.error('autosave failed', error);
    }
  }, 1200);
}

function setDirty(next = true) {
  dirty = !!next;
  window.api.setDirty(dirty);
  updateSaveStatus(dirty ? '자동 저장 대기' : '자동 저장 대기');
  if (dirty) scheduleAutosave();
  else {
    clearTimeout(autosaveTimer);
    autosaveRevision += 1;
  }
}

async function markSaved() {
  setDirty(false);
  try { await window.api.clearAutosave(); } catch (_) { /* 다음 실행에서 다시 확인 */ }
  updateSaveStatus('저장 완료');
}

// ---------------- 애니메이션 루프 ----------------
let animReq = null;
function needsAnim() {
  return !fxPaused && (!!gifAnim || (state.fxs && state.fxs.some((fx) => fx && fx.enabled !== false)));
}
function animTick(ts) {
  render(ts);
  animReq = needsAnim() ? requestAnimationFrame(animTick) : null;
}
function ensureAnim() {
  if (needsAnim() && !animReq) animReq = requestAnimationFrame(animTick);
}
// 내보내기 중에는 실시간 애니메이션을 멈춤 (고배율 렌더가 겹쳐 느려지는 것 방지)
function stopAnim() {
  if (animReq) { cancelAnimationFrame(animReq); animReq = null; }
}

// 미리보기는 화면 폭에 맞춰 줄여서 보여주므로, 실제 저장 크기와 축소 배율을 표시해 준다.
// (특히 모바일에서는 카드가 850px든 2000px든 화면 폭을 꽉 채워서 구분이 안 됨)
function updatePreviewInfo() {
  const sizeEl = document.getElementById('pv-size');
  const zoomEl = document.getElementById('pv-zoom');
  if (!sizeEl || !zoomEl) return;
  if (RES !== SCREEN_RES) return; // 내보내기 중 임시 배율은 무시
  const outW = Math.round(canvas.width / RES);
  const outH = Math.round(canvas.height / RES);
  const shown = canvas.getBoundingClientRect().width;
  sizeEl.textContent = `${outW} × ${outH} px`;
  zoomEl.textContent = outW > 0 ? `${Math.round((shown / outW) * 100)}%` : '';
}
function initPreviewInfo() {
  updatePreviewInfo();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => updatePreviewInfo()).observe(canvas);
  } else {
    window.addEventListener('resize', updatePreviewInfo);
  }
}

// ---------------- 크게 보기 (모바일) ----------------
// 화면 전체를 써서 미리보기를 최대 크기로 보여준다.
// 가로로 긴 카드를 세로 화면에서 보면 너무 작으므로 90도 눕혀서 화면 긴 변을 활용한다.
let zoomReq = null;

function layoutZoom() {
  const zc = document.getElementById('zoom-canvas');
  if (!zc) return;
  const cw = canvas.width / RES, ch = canvas.height / RES; // 논리(출력) 크기
  if (!(cw > 0 && ch > 0)) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const rotate = cw > ch && vw < vh; // 가로 카드 + 세로 화면 → 눕히기
  const availW = (rotate ? vh : vw) - 20;
  const availH = (rotate ? vw : vh) - 20;
  const s = Math.max(0.01, Math.min(availW / cw, availH / ch));
  zc.style.width = Math.round(cw * s) + 'px';
  zc.style.height = Math.round(ch * s) + 'px';
  zc.style.transform = rotate ? 'rotate(90deg)' : 'none';
  const hint = document.getElementById('zoom-hint');
  if (hint) {
    hint.textContent = rotate
      ? '화면을 눌러 닫기 · 폰을 가로로 돌리면 더 크게 볼 수 있어요'
      : '화면을 눌러 닫기';
  }
}

function zoomTick() {
  const zc = document.getElementById('zoom-canvas');
  if (!zc) return;
  if (zc.width !== canvas.width || zc.height !== canvas.height) {
    zc.width = canvas.width; zc.height = canvas.height;
    layoutZoom();
  }
  const g = zc.getContext('2d');
  g.clearRect(0, 0, zc.width, zc.height);
  g.drawImage(canvas, 0, 0); // 원본을 그대로 복사 — 움직임 효과도 그대로 따라감
  zoomReq = requestAnimationFrame(zoomTick);
}

function openZoom() {
  const ov = document.getElementById('zoom-overlay');
  if (!ov) return;
  ov.classList.remove('hidden');
  layoutZoom();
  if (!zoomReq) zoomTick();
  // 브라우저 주소창까지 숨겨 더 넓게 (지원 안 하는 기기는 그냥 무시)
  if (ov.requestFullscreen) { try { ov.requestFullscreen().catch(() => {}); } catch (_) { /* 무시 */ } }
}

function closeZoom() {
  const ov = document.getElementById('zoom-overlay');
  if (!ov || ov.classList.contains('hidden')) return;
  ov.classList.add('hidden');
  if (zoomReq) { cancelAnimationFrame(zoomReq); zoomReq = null; }
  if (document.fullscreenElement && document.exitFullscreen) {
    try { document.exitFullscreen().catch(() => {}); } catch (_) { /* 무시 */ }
  }
}

function initZoom() {
  const btn = document.getElementById('btn-zoom');
  const ov = document.getElementById('zoom-overlay');
  const close = document.getElementById('zoom-close');
  if (!btn || !ov) return;
  btn.onclick = openZoom;
  if (close) close.onclick = (e) => { e.stopPropagation(); closeZoom(); };
  ov.addEventListener('click', closeZoom);
  window.addEventListener('resize', () => { if (!ov.classList.contains('hidden')) layoutZoom(); });
  window.addEventListener('orientationchange', () => setTimeout(layoutZoom, 250));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeZoom(); });
}
function fxLoopOf(f) {
  if (f && f.type === 'signalwave') return V2.SIGNAL_TRAVEL_LOOP_MS;
  return Math.round(2000 / ((f && f.speed) || 1));
}
// WebP 내보내기 길이: 모든 효과가 이음새 없이 이어지도록 각 주기의 최소공배수 (최대 6초)
function fxLoopMs() {
  const loops = (state.fxs || []).map(fxLoopOf);
  if (!loops.length) return 2000;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let l = loops[0];
  for (const v of loops.slice(1)) l = Math.round((l * v) / gcd(l, v));
  return Math.min(6000, l);
}
function fxPhase(tMs, f) {
  const L = fxLoopOf(f);
  const phase = ((tMs % L) + L) % L / L;
  return f && f.direction === -1 ? 1 - phase : phase; // 0..1
}
// 현재 시각의 이미지 프레임 (움짤이면 해당 프레임, 아니면 정지 이미지)
function imageFrameAt(tMs) {
  if (gifAnim && gifAnim.frames.length) {
    let t = tMs % gifAnim.total;
    for (const f of gifAnim.frames) {
      if (t < f.delay) return f.bmp;
      t -= f.delay;
    }
    return gifAnim.frames[0].bmp;
  }
  return (imgEl && imgEl.complete && imgEl.naturalWidth) ? imgEl : null;
}

// 시드 고정 난수 (반짝임 위치 고정용)
function seededRand(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// HSL 색 순환 (배경 색 흐름 효과용)
function hueShiftHex(hex, deg) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16) || 0;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let hh = 0;
  const l = (mx + mn) / 2;
  const d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (mx === r) hh = 60 * (((g - b) / d) % 6);
    else if (mx === g) hh = 60 * ((b - r) / d + 2);
    else hh = 60 * ((r - g) / d + 4);
  }
  hh = (hh + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let rr = 0, gg = 0, bb = 0;
  if (hh < 60) { rr = c; gg = x; } else if (hh < 120) { rr = x; gg = c; }
  else if (hh < 180) { gg = c; bb = x; } else if (hh < 240) { gg = x; bb = c; }
  else if (hh < 300) { rr = x; bb = c; } else { rr = c; bb = x; }
  const to2 = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to2(rr)}${to2(gg)}${to2(bb)}`;
}

const canvas = document.getElementById('card');
const ctx = canvas.getContext('2d');
// 내부 렌더 배율 — 높은 해상도로 그려서(폰트·이미지 선명) 화면과 저장은 원래 크기로 축소.
// 화면 미리보기는 2배(부드러운 실시간 렌더), 내보내기 때만 EXPORT_RES로 올려 슈퍼샘플링.
let RES = 2;
const SCREEN_RES = 2;
// 내보내기 배율. 1 = 슈퍼샘플링 없이 1:1로 바로 그림(사진이 리샘플링을 한 번만 거침).
// 2 이상으로 올리면 글자·곡선이 매끄러워지는 대신 사진은 확대→축소를 거쳐 살짝 무뎌진다.
// 1이 아닌 값은 반드시 2의 거듭제곱으로 — 2:1 반감만으로 1배까지 내려가야 계단현상이 없음.
const EXPORT_RES = 1;
let activeExportOptions = null;

// 내보내기용: 렌더 배율을 올린 뒤 콜백 실행, 끝나면 화면 배율로 복구
async function withExportRes(fn, scale = EXPORT_RES) {
  const previousExportRendering = exportRendering;
  RES = Math.max(1, Math.min(3, Number(scale) || 1));
  exportRendering = true;
  try {
    return await fn();
  } finally {
    RES = SCREEN_RES;
    exportRendering = previousExportRendering;
  }
}

// ---------------- 이미지 축소 품질 ----------------
// 큰 사진을 작은 칸에 한 번에 밀어넣으면(예: 4000px → 500px) 브라우저 필터가 원본 픽셀을
// 띄엄띄엄 샘플링해서 디테일이 뭉개지고 줄무늬·격자에 모아레가 생긴다.
// 절반씩 여러 번 줄여가며(밉맵 방식) 목표 크기 2배 이내로 맞춘 뒤 그리면 훨씬 깨끗하다.
// 매 프레임 다시 계산하면 느리므로 결과를 캐시한다.
const dsCache = new Map();
const DS_CACHE_MAX = 48;
let dsIdSeq = 0;

function downscaleSource(src, sw, sh, dw) {
  if (!(sw > 0 && sh > 0 && dw > 0)) return src;
  if (sw / dw < 2) return src; // 2배 미만 축소는 브라우저 고품질 필터로 충분
  if (!src._dsId) src._dsId = ++dsIdSeq;
  // 목표 폭을 8px 단위로 묶어서, 슬라이더를 미세 조정할 때 캐시가 폭증하지 않게 함
  const bucket = Math.max(1, Math.round(dw / 8) * 8);
  const key = src._dsId + '@' + bucket;
  const hitc = dsCache.get(key);
  if (hitc) return hitc;

  let cur = src, cw = sw, ch = sh;
  while (cw / 2 >= bucket) {
    const t = document.createElement('canvas');
    t.width = Math.max(1, Math.round(cw / 2));
    t.height = Math.max(1, Math.round(ch / 2));
    const g = t.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, t.width, t.height);
    cur = t; cw = t.width; ch = t.height;
  }
  if (cur === src) return src;
  dsCache.set(key, cur);
  if (dsCache.size > DS_CACHE_MAX) dsCache.delete(dsCache.keys().next().value);
  return cur;
}
function clearDownscaleCache() { dsCache.clear(); }

// 현재 캔버스(RES배)를 원래 픽셀 크기로 축소해 tctx에 그림.
// 3:1처럼 어중간한 비율을 한 번에 줄이면 픽셀을 건너뛰며 샘플링해 글자·가는 선이 지글거린다.
// 정확히 2:1 반감을 반복하면 인접 4픽셀 평균에 가까워져 계단현상이 거의 없어진다.
// (EXPORT_RES를 2의 거듭제곱으로 두는 이유)
const dsScratch = [];
function scratchCanvas(i, w, h) {
  if (!dsScratch[i]) dsScratch[i] = document.createElement('canvas');
  const c = dsScratch[i];
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h); // 크기가 그대로면 이전 프레임 잔상이 남으므로 반드시 지움
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  return [c, g];
}
// 저장 파일의 배경. 투명이면 null.
// 투명 픽셀은 색상값이 검정(0,0,0)이라, 알파를 무시하는 뷰어에서는 검게 보인다.
// 그런 곳(디시 등)에 올릴 때는 흰색이나 카드 배경색으로 채워서 내보낸다.
function exportBgColor() {
  const mode = (activeExportOptions && activeExportOptions.bg)
    || (state.card && state.card.exportBg) || 'transparent';
  if (mode === 'white') return '#ffffff';
  if (mode === 'card') return state.card.bg1 || '#ffffff';
  if (mode === 'custom') return (activeExportOptions && activeExportOptions.bg2) || '#ffffff';
  return null;
}

function drawDownscaled(tctx, w, h) {
  let cur = canvas, cw = canvas.width, ch = canvas.height, i = 0;
  while (cw >= w * 2 && ch >= h * 2) {
    const [c, g] = scratchCanvas(i++, Math.max(w, Math.round(cw / 2)), Math.max(h, Math.round(ch / 2)));
    g.drawImage(cur, 0, 0, c.width, c.height);
    cur = c; cw = c.width; ch = c.height;
  }
  tctx.clearRect(0, 0, w, h);
  const bg = exportBgColor();
  if (bg) { tctx.fillStyle = bg; tctx.fillRect(0, 0, w, h); }
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = 'high';
  tctx.drawImage(cur, 0, 0, w, h);
}

function alphaTrimRect(source) {
  const g = source.getContext('2d', { willReadFrequently: true });
  const { width, height } = source;
  const pixels = g.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < minX ? { x: 0, y: 0, w: width, h: height }
    : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

async function renderExportCanvas(options = {}) {
  const scale = Math.max(1, Math.min(3, Number(options.scale) || 1));
  const boundary = ['fixed', 'include', 'trim'].includes(options.boundary) ? options.boundary : 'fixed';
  const originalClip = state.card.clipGlow;
  activeExportOptions = options;
  // 카드 고정은 모든 빛을 내부로 제한한다. 나머지 두 모드는 바깥 효과까지 그린다.
  state.card.clipGlow = boundary === 'fixed';
  try {
    return await withExportRes(async () => {
      render(Number.isFinite(options.frame) ? options.frame : 0);
      let src;
      if (boundary === 'fixed') {
        src = {
          x: Math.round(layout.ox * RES), y: Math.round(layout.oy * RES),
          w: Math.round(state.card.width * RES), h: Math.round(state.card.height * RES),
        };
      } else if (boundary === 'trim') {
        src = alphaTrimRect(canvas);
      } else {
        src = { x: 0, y: 0, w: canvas.width, h: canvas.height };
      }
      const out = document.createElement('canvas');
      out.width = Math.max(1, src.w); out.height = Math.max(1, src.h);
      const g = out.getContext('2d');
      const bg = exportBgColor();
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, out.width, out.height); }
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(canvas, src.x, src.y, src.w, src.h, 0, 0, out.width, out.height);
      return out;
    }, scale);
  } finally {
    state.card.clipGlow = originalClip;
    activeExportOptions = null;
    if (!exportBusy) {
      render(performance.now());
      ensureAnim();
    }
  }
}

async function renderPngDataUrl(options = {}) {
  const out = await renderExportCanvas(options);
  return out.toDataURL('image/png');
}

let exportBusy = false;
let exportCancelled = false;
let exportPreviewTimer = null;
let exportPreviewRevision = 0;

function hasMotionSource() {
  return !!gifAnim || (state.fxs || []).some((fx) => fx && fx.enabled !== false);
}

function estimatedExportMargin(boundary) {
  if (boundary === 'fixed') return 0;
  const fxPad = (state.fxs || []).reduce((max, fx) => {
    if (!fx || fx.enabled === false || (fx.layer || defaultFxLayer(fx.type)) !== 'border') return max;
    return Math.max(max, FX_GLOW_PAD[fx.type] || 0);
  }, 0);
  return Math.max(fxPad, state.card.borderStyle === 'glow' ? (state.card.borderGlow || 18) : 0);
}

function readExportOptions() {
  const value = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };
  const fps = Number(value('export-fps', 30)) || 30;
  return {
    format: value('export-format', 'png'),
    boundary: value('export-boundary', 'fixed'),
    bg: value('export-bg', 'transparent'),
    bg2: value('export-bg2', '#ffffff'),
    scale: Number(value('export-scale', 1)) || 1,
    durationMs: Math.round((Number(value('export-duration', 2)) || 2) * 1000),
    fps,
    quality: Number(value('export-quality', 0.92)) || 0.92,
    frame: Math.max(0, Number(value('export-frame', 0)) || 0) * (1000 / fps),
  };
}

function updateExportEstimate() {
  const options = readExportOptions();
  const animated = options.format === 'webp' && hasMotionSource();
  const margin = estimatedExportMargin(options.boundary);
  const estimate = V2.exportEstimate(
    state.card.width + margin * 2, state.card.height + margin * 2,
    options.scale, options.durationMs, options.fps, animated,
  );
  const memoryMb = estimate.rawBytes / 1024 / 1024;
  const el = document.getElementById('export-estimate');
  if (el) el.textContent = `${estimate.width} × ${estimate.height}px · ${estimate.frames}프레임 · 작업 메모리 약 ${memoryMb.toFixed(memoryMb < 10 ? 1 : 0)}MB`;
  const quality = document.getElementById('export-quality');
  if (quality) quality.disabled = options.format !== 'webp';
  for (const id of ['export-duration', 'export-fps']) {
    const field = document.getElementById(id);
    if (field) field.disabled = options.format !== 'webp' || !hasMotionSource();
  }
  scheduleExportPreview();
}

function scheduleExportPreview() {
  clearTimeout(exportPreviewTimer);
  const revision = ++exportPreviewRevision;
  const dialog = document.getElementById('export-dialog');
  if (!dialog || dialog.classList.contains('hidden') || exportBusy) return;
  exportPreviewTimer = setTimeout(async () => {
    try {
      const options = { ...readExportOptions(), scale: 1 };
      const source = await renderExportCanvas(options);
      if (revision !== exportPreviewRevision) return;
      const preview = document.getElementById('export-preview-canvas');
      if (!preview) return;
      const ratio = Math.min(1, 420 / source.width, 210 / source.height);
      preview.width = Math.max(1, Math.round(source.width * ratio));
      preview.height = Math.max(1, Math.round(source.height * ratio));
      const g = preview.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.clearRect(0, 0, preview.width, preview.height);
      g.drawImage(source, 0, 0, preview.width, preview.height);
    } catch (error) {
      console.error('export preview failed', error);
    }
  }, 100);
}

function closeExportDialog() {
  const dialog = document.getElementById('export-dialog');
  if (!dialog || exportBusy) return;
  dialog.classList.add('hidden');
  dialog.setAttribute('aria-hidden', 'true');
}

function openExportDialog(format = 'png') {
  const dialog = document.getElementById('export-dialog');
  const formatEl = document.getElementById('export-format');
  if (!dialog || !formatEl) return;
  formatEl.value = format;
  document.getElementById('export-progress').value = 0;
  exportCancelled = false;
  dialog.classList.remove('hidden');
  dialog.setAttribute('aria-hidden', 'false');
  updateExportEstimate();
  document.getElementById('btn-export-confirm').focus();
}

async function runConfiguredExport() {
  if (exportBusy) return;
  const options = readExportOptions();
  const progress = document.getElementById('export-progress');
  const confirm = document.getElementById('btn-export-confirm');
  exportBusy = true; exportCancelled = false; confirm.disabled = true;
  try {
    stopAnim();
    if (options.format === 'png') {
      progress.value = 20;
      const dataUrl = await renderPngDataUrl(options);
      if (exportCancelled) throw new Error('cancelled');
      progress.value = 80;
      const path = await window.api.exportPng({ dataUrl, suggestedName: state.name || 'speccard' });
      if (path) { progress.value = 100; toast('PNG로 내보냈어요'); }
    } else {
      await exportWebp({ ...options, progress, cancelled: () => exportCancelled });
    }
    if (!exportCancelled) {
      exportBusy = false;
      closeExportDialog();
    }
  } catch (error) {
    if (error.message !== 'cancelled') toast(`내보내기 실패: ${error.message}`);
  } finally {
    exportBusy = false; confirm.disabled = false;
    render(performance.now()); ensureAnim();
  }
}

function initExportDialog() {
  const dialog = document.getElementById('export-dialog');
  if (!dialog) return;
  document.getElementById('export-close').onclick = closeExportDialog;
  document.getElementById('btn-export-cancel').onclick = () => {
    if (exportBusy) exportCancelled = true;
    else closeExportDialog();
  };
  document.getElementById('btn-export-confirm').onclick = runConfiguredExport;
  dialog.onclick = (event) => { if (event.target === dialog) closeExportDialog(); };
  for (const id of ['export-format', 'export-boundary', 'export-bg', 'export-bg2', 'export-scale', 'export-frame', 'export-duration', 'export-fps', 'export-quality']) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', updateExportEstimate);
  }
  const boundary = document.getElementById('export-boundary');
  const clip = document.getElementById('clip-glow');
  if (boundary && clip) {
    boundary.addEventListener('change', () => { clip.checked = boundary.value === 'fixed'; });
    clip.addEventListener('change', () => {
      boundary.value = clip.checked ? 'fixed' : 'include';
      updateExportEstimate();
    });
  }
  document.querySelectorAll('.export-shortcut').forEach((button) => {
    button.onclick = () => openExportDialog(button.dataset.exportTarget || 'png');
  });
}

// ---------------- 렌더링 ----------------
function addRoundRect(c, x, y, w, h, r) {
  // beginPath 없이 서브패스로 추가 (evenodd 클립 조합용)
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function roundRectPath(c, x, y, w, h, r) {
  c.beginPath();
  addRoundRect(c, x, y, w, h, r);
}

function hexToRgba(hex, a) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function makeGradient(x, y, w, h, c1, c2, angle) {
  const rad = (angle * Math.PI) / 180;
  const cx = x + w / 2, cy = y + h / 2;
  const dx = Math.cos(rad) * w / 2, dy = Math.sin(rad) * h / 2;
  const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

// 배경 패턴
function drawPattern(W, H, type, color, alpha, options = {}) {
  if (!type || type === 'none' || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const scale = Math.max(0.25, options.scale || 1);
  const step = Math.max(4, 22 * scale);
  ctx.lineWidth = Math.max(0.25, options.lineWidth || 1);
  const rotate = (options.rotate || 0) * Math.PI / 180;
  const offX = options.x || 0, offY = options.y || 0;
  const sourceW = W, sourceH = H;
  const pad = rotate ? Math.hypot(W, H) : step * 3 + Math.max(Math.abs(offX), Math.abs(offY));
  W += pad * 2; H += pad * 2;
  if (rotate) {
    ctx.translate(sourceW / 2 + offX, sourceH / 2 + offY);
    ctx.rotate(rotate);
    ctx.translate(-W / 2, -H / 2);
  } else {
    ctx.translate(-pad + offX, -pad + offY);
  }
  const line = (x1, y1, x2, y2) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); };
  if (type === 'dots') {
    for (let y = step / 2; y < H; y += step)
      for (let x = step / 2; x < W; x += step) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
  } else if (type === 'rings') {
    for (let y = step / 2; y < H; y += step)
      for (let x = step / 2; x < W; x += step) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.stroke(); }
  } else if (type === 'grid') {
    ctx.beginPath();
    for (let x = 0; x <= W; x += step) line(x, 0, x, H);
    for (let y = 0; y <= H; y += step) line(0, y, W, y);
    ctx.stroke();
  } else if (type === 'vertical') {
    ctx.beginPath();
    for (let x = 0; x <= W; x += step) line(x, 0, x, H);
    ctx.stroke();
  } else if (type === 'horizontal') {
    ctx.beginPath();
    for (let y = 0; y <= H; y += step) line(0, y, W, y);
    ctx.stroke();
  } else if (type === 'diagonal') {
    ctx.beginPath();
    for (let x = -H; x < W; x += step) line(x, 0, x + H, H);
    ctx.stroke();
  } else if (type === 'cross') {
    ctx.beginPath();
    for (let x = -H; x < W; x += step) line(x, 0, x + H, H);
    for (let x = 0; x < W + H; x += step) line(x, 0, x - H, H);
    ctx.stroke();
  } else if (type === 'checker') {
    for (let y = 0; y < H; y += step)
      for (let x = 0; x < W; x += step)
        if (((x / step) + (y / step)) % 2 === 0) ctx.fillRect(x, y, step, step);
  } else if (type === 'plus') {
    for (let y = step / 2; y < H; y += step)
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath(); line(x - 3, y, x + 3, y); line(x, y - 3, x, y + 3); ctx.stroke();
      }
  } else if (type === 'zigzag') {
    for (let y = 0; y < H + step; y += step) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += step) {
        const yy = y + ((x / step) % 2 === 0 ? 0 : step / 2);
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  } else if (type === 'diamonds') {
    for (let y = step / 2; y < H; y += step)
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y);
        ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y);
        ctx.closePath(); ctx.fill();
      }
  } else if (type === 'triangles') {
    let j = 0;
    for (let y = step / 2; y < H; y += step, j++) {
      let i = 0;
      for (let x = step / 2; x < W; x += step, i++) {
        const up = (i + j) % 2 === 0;
        ctx.beginPath();
        if (up) { ctx.moveTo(x, y - 4); ctx.lineTo(x + 4.5, y + 4); ctx.lineTo(x - 4.5, y + 4); }
        else { ctx.moveTo(x, y + 4); ctx.lineTo(x + 4.5, y - 4); ctx.lineTo(x - 4.5, y - 4); }
        ctx.closePath(); ctx.fill();
      }
    }
  } else if (type === 'waves') {
    for (let y = step / 2; y < H + step; y += step) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const yy = y + Math.sin((x / step) * Math.PI) * 3;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  } else if (type === 'scales') {
    let row = 0;
    for (let y = 0; y < H + step; y += step * 0.6, row++) {
      const off = row % 2 === 0 ? 0 : step / 2;
      for (let x = -step; x < W + step; x += step) {
        ctx.beginPath();
        ctx.arc(x + off, y, step / 2, 0, Math.PI);
        ctx.stroke();
      }
    }
  } else if (type === 'bricks') {
    const bh = step * 0.6;
    let row = 0;
    for (let y = 0; y < H + bh; y += bh, row++) {
      ctx.beginPath(); line(0, y, W, y); ctx.stroke();
      const off = row % 2 === 0 ? 0 : step;
      ctx.beginPath();
      for (let x = off; x < W; x += step * 2) line(x, y, x, y + bh);
      ctx.stroke();
    }
  } else if (type === 'hex') {
    const r = step * 0.55;
    const hstep = r * 1.5, vstep = Math.sqrt(3) * r;
    let col = 0;
    for (let x = 0; x < W + r; x += hstep, col++) {
      const yoff = col % 2 === 0 ? 0 : vstep / 2;
      for (let y = -vstep; y < H + vstep; y += vstep) {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k;
          const px = x + r * Math.cos(a), py = y + yoff + r * Math.sin(a);
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
    }
  } else if (type === 'stars') {
    for (let y = step / 2; y < H; y += step)
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath();
        line(x - 4, y, x + 4, y);
        line(x, y - 4, x, y + 4);
        line(x - 2, y - 2, x + 2, y + 2);
        line(x - 2, y + 2, x + 2, y - 2);
        ctx.stroke();
      }
  } else if (type === 'hearts') {
    const s2 = 4.5;
    for (let y = step / 2; y < H; y += step)
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, y + s2 * 0.9);
        ctx.bezierCurveTo(x - s2, y + s2 * 0.35, x - s2 * 0.55, y - s2 * 0.35, x, y + s2 * 0.05);
        ctx.bezierCurveTo(x + s2 * 0.55, y - s2 * 0.35, x + s2, y + s2 * 0.35, x, y + s2 * 0.9);
        ctx.fill();
      }
  }
  ctx.restore();
}

// 텍스트 요소 공통 그리기 → 히트박스 반환 (그라디언트·외곽선·기울임·밑줄·취소선·자간·세로쓰기)
function rotatedAabb(box, cx, cy, degrees) {
  if (!degrees) return box;
  const rad = degrees * Math.PI / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  const points = [
    [box.x, box.y], [box.x + box.w, box.y],
    [box.x + box.w, box.y + box.h], [box.x, box.y + box.h],
  ].map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function drawTextEl(t) {
  const fam = t.fontFamily || state.text.fontFamily;
  const weight = t.bold === false ? 400 : (t.weight || 800);
  const styleP = t.italic ? 'italic ' : '';
  const opacity = t.opacity == null ? 1 : t.opacity;
  const rotation = t.rotate || 0;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.translate(t.x, t.y);
  if (rotation) ctx.rotate(rotation * Math.PI / 180);
  ctx.translate(-t.x, -t.y);
  ctx.font = `${styleP}${weight} ${t.size}px ${fam}`;
  ctx.letterSpacing = `${t.spacing || 0}px`;
  ctx.textBaseline = 'top';

  if (t.vertical) {
    const chars = [...String(t.text).replace(/\n/g, '')];
    const lh = t.size * (t.lineHeight || 1.08) + (t.spacing || 0);
    const totalH = Math.max(t.size, (chars.length - 1) * lh + t.size);
    const box = { x: t.x - t.size * 0.6, y: t.y, w: t.size * 1.2, h: totalH };
    ctx.textAlign = 'center';
    if (t.background) {
      ctx.fillStyle = hexToRgba(t.backgroundColor || '#000000', t.backgroundAlpha == null ? 0.25 : t.backgroundAlpha);
      const pad = t.backgroundPad || 8;
      addRoundRect(ctx, box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2, Math.min(10, pad));
      ctx.fill();
    }
    if (t.shadow) {
      ctx.shadowColor = hexToRgba(t.shadowColor || '#000000', t.shadowAlpha == null ? 0.55 : t.shadowAlpha);
      ctx.shadowBlur = t.shadowBlur == null ? Math.max(2, t.size * 0.18) : t.shadowBlur;
      ctx.shadowOffsetX = t.shadowX || 0; ctx.shadowOffsetY = t.shadowY == null ? 2 : t.shadowY;
    }
    if (t.outline) {
      ctx.lineWidth = t.outlineWidth || 4; ctx.strokeStyle = t.outlineColor || '#ffffff'; ctx.lineJoin = 'round';
      chars.forEach((ch, i) => ctx.strokeText(ch, t.x, t.y + i * lh));
      ctx.shadowColor = 'transparent';
    }
    ctx.fillStyle = t.fillType === 'gradient'
      ? makeGradient(t.x - t.size / 2, t.y, t.size, totalH, t.color, t.color2 || t.color, 90)
      : t.color;
    chars.forEach((ch, i) => ctx.fillText(ch, t.x, t.y + i * lh));
    ctx.restore();
    return rotatedAabb(box, t.x, t.y, rotation);
  }

  const rawLines = String(t.text || '').replace(/\r\n?/g, '\n').split('\n');
  const lines = [];
  for (const raw of rawLines) {
    if (t.boxWidth > 0) lines.push(...V2.wrapText(raw, t.boxWidth, (value) => ctx.measureText(value).width));
    else lines.push(raw);
  }
  if (!lines.length) lines.push('');
  const metrics = lines.map((line) => ctx.measureText(line));
  const maxW = Math.max(1, ...metrics.map((m) => m.width));
  const lineH = t.size * (t.lineHeight || 1.15);
  const totalH = (lines.length - 1) * lineH + t.size * 1.15;
  let boxX = t.x;
  if (t.align === 'right') boxX -= maxW;
  else if (t.align === 'center') boxX -= maxW / 2;
  const box = { x: boxX, y: t.y, w: maxW, h: totalH };
  if (t.background) {
    const pad = t.backgroundPad || 8;
    ctx.fillStyle = hexToRgba(t.backgroundColor || '#000000', t.backgroundAlpha == null ? 0.25 : t.backgroundAlpha);
    ctx.beginPath(); addRoundRect(ctx, box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2, Math.min(10, pad)); ctx.fill();
  }
  ctx.textAlign = t.align || 'left';
  if (t.shadow) {
    ctx.shadowColor = hexToRgba(t.shadowColor || '#000000', t.shadowAlpha == null ? 0.55 : t.shadowAlpha);
    ctx.shadowBlur = t.shadowBlur == null ? Math.max(2, t.size * 0.18) : t.shadowBlur;
    ctx.shadowOffsetX = t.shadowX || 0; ctx.shadowOffsetY = t.shadowY == null ? 2 : t.shadowY;
  }
  lines.forEach((line, index) => {
    const y = t.y + index * lineH;
    const m = metrics[index];
    let bx = t.x;
    if (t.align === 'right') bx -= m.width;
    else if (t.align === 'center') bx -= m.width / 2;
    if (t.outline) {
      ctx.lineWidth = t.outlineWidth || 4; ctx.strokeStyle = t.outlineColor || '#ffffff'; ctx.lineJoin = 'round';
      ctx.strokeText(line, t.x, y);
      ctx.shadowColor = 'transparent';
    }
    ctx.fillStyle = t.fillType === 'gradient'
      ? makeGradient(bx, y, m.width || 1, t.size, t.color, t.color2 || t.color, t.gradAngle || 0)
      : t.color;
    ctx.fillText(line, t.x, y);
    if (t.underline || t.strike) {
      ctx.strokeStyle = t.color; ctx.lineWidth = Math.max(1, t.size / 15);
      for (const yy of [t.underline ? y + t.size * 1.08 : null, t.strike ? y + t.size * 0.55 : null]) {
        if (yy == null) continue;
        ctx.beginPath(); ctx.moveTo(bx, yy); ctx.lineTo(bx + m.width, yy); ctx.stroke();
      }
    }
  });
  ctx.restore();
  return rotatedAabb(box, t.x, t.y, rotation);
}

// 여러 줄 자동 줄바꿈 (현재 ctx.font 기준)
function wrapText(str, maxW) {
  return V2.wrapText(str, maxW, (value) => ctx.measureText(value).width);
}

// 색상 테마 프리셋 (해당 하위 객체 필드만 덮어씀)
const THEMES = {
  pink:     { card: { bg1: '#fbe4ff', bg2: '#f3d0ff', borderColor: '#e9a8ff' },
              text: { labelColor: '#c026d3', valueColor: '#6b21a8' },
              image: { frameColor: '#ffffff', frameColor2: '#c026d3' } },
  sky:      { card: { bg1: '#e0f2fe', bg2: '#bae6fd', borderColor: '#7dd3fc' },
              text: { labelColor: '#0284c7', valueColor: '#075985' },
              image: { frameColor: '#ffffff', frameColor2: '#0284c7' } },
  mint:     { card: { bg1: '#d1fae5', bg2: '#a7f3d0', borderColor: '#6ee7b7' },
              text: { labelColor: '#059669', valueColor: '#065f46' },
              image: { frameColor: '#ffffff', frameColor2: '#059669' } },
  lavender: { card: { bg1: '#ede9fe', bg2: '#ddd6fe', borderColor: '#c4b5fd' },
              text: { labelColor: '#7c3aed', valueColor: '#4c1d95' },
              image: { frameColor: '#ffffff', frameColor2: '#7c3aed' } },
  lemon:    { card: { bg1: '#fef9c3', bg2: '#fde68a', borderColor: '#fcd34d' },
              text: { labelColor: '#d97706', valueColor: '#92400e' },
              image: { frameColor: '#ffffff', frameColor2: '#d97706' } },
  peach:    { card: { bg1: '#ffedd5', bg2: '#fed7aa', borderColor: '#fdba74' },
              text: { labelColor: '#ea580c', valueColor: '#9a3412' },
              image: { frameColor: '#ffffff', frameColor2: '#ea580c' } },
  mono:     { card: { bg1: '#ffffff', bg2: '#e5e7eb', borderColor: '#d1d5db' },
              text: { labelColor: '#111827', valueColor: '#374151' },
              image: { frameColor: '#ffffff', frameColor2: '#374151' } },
  coffee:   { card: { bg1: '#efe5dc', bg2: '#e0cfc0', borderColor: '#c8a288' },
              text: { labelColor: '#7c4a21', valueColor: '#4b2e14' },
              image: { frameColor: '#efe5dc', frameColor2: '#7c4a21' } },
  dark:     { card: { bg1: '#20222b', bg2: '#2b2f3a', borderColor: '#3a3f4d' },
              text: { labelColor: '#7dd3fc', valueColor: '#e5e7eb' },
              image: { frameColor: '#2b2f3a', frameColor2: '#7dd3fc' } },
  forest:   { card: { bg1: '#0f2a1d', bg2: '#1d4430', borderColor: '#34d399' },
              text: { labelColor: '#6ee7b7', valueColor: '#d1fae5' },
              image: { frameColor: '#1d4430', frameColor2: '#34d399' } },
  ocean:    { card: { bg1: '#0c2340', bg2: '#123e66', borderColor: '#38bdf8' },
              text: { labelColor: '#7dd3fc', valueColor: '#e0f2fe' },
              image: { frameColor: '#123e66', frameColor2: '#38bdf8' } },
  neon:     { card: { bg1: '#12002e', bg2: '#2a0a4a', borderColor: '#ff2fd0' },
              text: { labelColor: '#00e5ff', valueColor: '#f5f5ff' },
              image: { frameColor: '#ff2fd0', frameColor2: '#00e5ff' } },
};
// 테마 적용 후 색상·배경을 수동으로 바꿨는지 추적 (테마 재클릭 시 확인용)
let colorsDirty = false;

function applyTheme(name) {
  const t = THEMES[name];
  if (!t) return;
  for (const k of Object.keys(t)) Object.assign(state[k], t[k]);
  colorsDirty = false;
  syncControls(); render();
}

// 안내 모달 (확인 버튼 하나)
function infoBox(message) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-card';
  const msg = document.createElement('p');
  msg.textContent = message;
  const btns = document.createElement('div');
  btns.className = 'modal-btns';
  const ok = document.createElement('button');
  ok.className = 'primary'; ok.textContent = '확인';
  ok.onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  btns.append(ok);
  box.append(msg, btns);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  ok.focus();
}

// 확인 모달 (Promise<boolean>)
function confirmBox(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-card';
    const msg = document.createElement('p');
    msg.textContent = message;
    const btns = document.createElement('div');
    btns.className = 'modal-btns';
    const ok = document.createElement('button');
    ok.className = 'primary'; ok.textContent = '계속';
    const cancel = document.createElement('button');
    cancel.textContent = '취소';
    const close = (v) => { overlay.remove(); resolve(v); };
    ok.onclick = () => close(true);
    cancel.onclick = () => close(false);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    btns.append(cancel, ok);
    box.append(msg, btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    ok.focus();
  });
}

function promptBox(message, initial = '') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    const box = document.createElement('div'); box.className = 'modal-card';
    const msg = document.createElement('p'); msg.textContent = message;
    const input = document.createElement('input'); input.type = 'text'; input.maxLength = 80; input.value = initial;
    const btns = document.createElement('div'); btns.className = 'modal-btns';
    const cancel = document.createElement('button'); cancel.textContent = '취소';
    const ok = document.createElement('button'); ok.className = 'primary'; ok.textContent = '확인';
    const close = (value) => { overlay.remove(); resolve(value); };
    cancel.onclick = () => close(null);
    ok.onclick = () => close(input.value.trim() || null);
    input.onkeydown = (e) => { if (e.key === 'Enter') ok.click(); if (e.key === 'Escape') cancel.click(); };
    overlay.onclick = (e) => { if (e.target === overlay) close(null); };
    btns.append(cancel, ok); box.append(msg, input, btns); overlay.appendChild(box); document.body.appendChild(overlay);
    input.focus(); input.select();
  });
}

// 테두리 효과별 글로우가 카드 밖으로 번지는 최대 거리 (캔버스 여백 계산용)
const FX_GLOW_PAD = {
  neon: 44, pulse: 40, spin: 28, rainbowspin: 24, chase: 18, twochase: 16, electric: 12,
};
const SCREEN_EDIT_PAD = 24;

function render(tMs) {
  // 사용자 조작으로 인한 렌더(시각 미지정)만 히스토리 기록 대상
  if (tMs == null && typeof scheduleHist === 'function') scheduleHist();
  if (tMs == null && changeTracking && !exportRendering) setDirty(true);
  if (tMs == null) tMs = performance.now();
  const { card, text, image, deco } = state;
  const fxs = state.fxs || [];
  const W = card.width, H = card.height;
  const rr = card.corner === 'sharp' ? 0 : card.radius;

  // 글로우와 편집 손잡이가 잘리지 않도록 캔버스에 여백(M)을 두고 카드 원점을 이동
  // (블러 끝자락 ~2%는 안 보이므로 0.75배까지만 확보 — 여백 최소화)
  // 빛번짐을 카드 안쪽으로 제한하면 여백이 아예 필요 없어짐 (출력 크기 = 카드 크기)
  const clipGlow = card.clipGlow !== false;
  const glowPad = !clipGlow && card.borderStyle === 'glow' && card.borderWidth > 0 ? 24 : 0;
  // 테두리 효과의 글로우도 캔버스 밖으로 잘리지 않게 여백 확보
  const fxPad = clipGlow ? 0 : fxs.reduce((m, f) => Math.max(m, FX_GLOW_PAD[f.type] || 0), 0);
  // 화면 편집 때만 최소 여백을 둔다. 카드 가장자리의 이동·크기·회전 손잡이를
  // 계속 잡을 수 있게 하되 PNG/WebP 출력 크기에는 절대 포함하지 않는다.
  const editPad = !exportRendering && RES === SCREEN_RES ? SCREEN_EDIT_PAD : 0;
  const M = Math.max(glowPad, fxPad, editPad);
  layout.ox = M; layout.oy = M;
  // 캔버스는 RES배 해상도로 렌더, 화면 표시 크기는 원래대로 (스타일 폭 고정)
  canvas.width = (W + M * 2) * RES;
  canvas.height = (H + M * 2) * RES;
  canvas.style.width = (W + M * 2) + 'px';
  ctx.scale(RES, RES);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // 힌팅이 글자 간격을 정수 픽셀로 반올림하면, 확대 렌더 후 축소할 때 자간이 들쭉날쭉해진다.
  // geometricPrecision은 글리프 위치를 소수점까지 정확히 잡아 슈퍼샘플링과 궁합이 좋다.
  ctx.textRendering = 'geometricPrecision';
  ctx.fontKerning = 'normal';

  ctx.save();
  ctx.translate(M, M);

  // 카드 클립
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, rr);
  ctx.clip();

  // 배경 (색 흐름 효과 시 색상 순환)
  let bg1 = card.bg1, bg2 = card.bg2;
  for (const f of fxs) {
    if (f.type !== 'hueflow' || f.enabled === false) continue;
    const deg = fxPhase(tMs, f) * 360;
    bg1 = hueShiftHex(bg1, deg);
    bg2 = hueShiftHex(bg2, deg);
  }
  if (card.bgStyle === 'solid') {
    ctx.fillStyle = bg1;
    ctx.fillRect(0, 0, W, H);
  } else if (card.bgStyle === 'radial') {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, bg1); g.addColorStop(1, bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (card.bgStyle === 'split-h') {
    ctx.fillStyle = bg1; ctx.fillRect(0, 0, W / 2, H);
    ctx.fillStyle = bg2; ctx.fillRect(W / 2, 0, W - W / 2, H);
  } else if (card.bgStyle === 'split-v') {
    ctx.fillStyle = bg1; ctx.fillRect(0, 0, W, H / 2);
    ctx.fillStyle = bg2; ctx.fillRect(0, H / 2, W, H - H / 2);
  } else if (card.bgStyle === 'diag') {
    ctx.fillStyle = bg1; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = bg2;
    ctx.beginPath();
    ctx.moveTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = makeGradient(0, 0, W, H, bg1, bg2, card.bgAngle);
    ctx.fillRect(0, 0, W, H);
  }
  if (card.bgImageDataUrl && bgImgEl && bgImgEl.complete && bgImgEl.naturalWidth) {
    const iw = bgImgEl.naturalWidth, ih = bgImgEl.naturalHeight;
    const scale = Math.max(W / iw, H / ih) * (card.bgImageScale || 1);
    const dw = iw * scale, dh = ih * scale;
    const x = (W - dw) / 2 + (card.bgImageX || 0);
    const y = (H - dh) / 2 + (card.bgImageY || 0);
    ctx.save();
    ctx.globalAlpha = card.bgImageOpacity == null ? 1 : card.bgImageOpacity;
    if (card.bgImageBlur > 0) ctx.filter = `blur(${card.bgImageBlur}px)`;
    ctx.drawImage(downscaleSource(bgImgEl, iw, ih, dw * RES), x, y, dw, dh);
    ctx.restore();
    if (card.bgImageDim > 0) {
      ctx.fillStyle = `rgba(0,0,0,${card.bgImageDim})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
  drawPattern(W, H, card.pattern, card.patternColor, card.patternAlpha, {
    scale: card.patternScale, rotate: card.patternRotate, lineWidth: card.patternLineWidth,
    x: card.patternX, y: card.patternY,
  });
  drawInteriorEffects('background');

  // ---- 레이아웃 계산 ----
  const imgFrame = image.dataUrl ? imageFrameAt(tMs) : null;
  const hasImg = !!imgFrame && !image.hidden;
  const panelW = hasImg ? Math.round(W * image.width) : 0;
  // 이미지와 사양 패널은 서로를 밀어내지 않는 독립 오브젝트다.
  // 사양 영역은 카드 전체 폭을 쓰고, 겹침 순서만 layerTop으로 결정한다.
  const areaX = 0;
  const areaW = W;

  // 가로 띠는 같은 위치에서 겹치지 않고 바깥쪽부터 차례로 쌓는다.
  const bands = state.bands && state.bands.length ? state.bands : [newBand()];
  const stripYs = [];
  let topUsed = 0, bottomUsed = 0;
  bands.forEach((b, index) => {
    if (!b.on || b.hidden || (b.style || 'strip') !== 'strip') return;
    if (b.pos === 'top') {
      stripYs[index] = topUsed;
      topUsed += b.height;
    } else {
      bottomUsed += b.height;
      stripYs[index] = H - bottomUsed;
    }
  });
  let cTop = topUsed, cBot = H - bottomUsed;
  if (cTop > cBot) {
    cTop = Math.min(H, cTop);
    cBot = Math.max(0, cBot);
  }
  const cH = cBot - cTop;

  // 밴드 레이어 (가로 띠 / 떠 있는 팝업 / 포스트잇 / 말풍선)
  const bandBoxes = [], bandRots = [];
  hit.bands = [];
  bands.forEach((band, bi) => {
    bandBoxes[bi] = null; bandRots[bi] = null; hit.bands[bi] = null;
    if (!band.on || band.hidden) return;
    const bandStyle = band.style || 'strip';
    if (bandStyle === 'strip') {
      const bandY = stripYs[bi] == null ? (band.pos === 'top' ? 0 : H - band.height) : stripYs[bi];
      ctx.save();
      ctx.fillStyle = hexToRgba(band.fill, band.alpha);
      ctx.fillRect(0, bandY, W, band.height);
      if (band.pattern && band.pattern !== 'none') {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, bandY, W, band.height); ctx.clip();
        ctx.translate(0, bandY);
        drawPattern(W, band.height, band.pattern, band.patternColor, band.patternAlpha);
        ctx.restore();
      }
      if (band.border === 'edge') {
        // 아래 밴드면 윗변, 위 밴드면 아랫변
        const edgeY = band.pos === 'top' ? bandY + band.height : bandY;
        ctx.strokeStyle = band.borderColor;
        ctx.lineWidth = band.borderWidth;
        ctx.beginPath(); ctx.moveTo(0, edgeY); ctx.lineTo(W, edgeY); ctx.stroke();
      }
      ctx.restore();
      bandBoxes[bi] = { x: 0, y: bandY, w: W, h: band.height };
    } else {
      const bw2 = Math.max(60, band.width || 280);
      const bh2 = Math.max(30, band.height);
      const bxx = band.x != null ? band.x : Math.round((W - bw2) / 2);
      const byy = band.y != null ? band.y : Math.round(H - bh2 - 24);
      bandBoxes[bi] = { x: bxx, y: byy, w: bw2, h: bh2 };
      const deg = bandStyle === 'postit' ? (band.rotate != null ? band.rotate : -3) : 0;
      if (deg) bandRots[bi] = { cx: bxx + bw2 / 2, cy: byy + bh2 / 2, rad: (deg * Math.PI) / 180 };
      const bandRot = bandRots[bi];
      hit.bands[bi] = rotatedAabb(bandBoxes[bi], bxx + bw2 / 2, byy + bh2 / 2, deg);
      const brad = bandStyle === 'postit' ? 2 : Math.min(band.radius != null ? band.radius : 14, bh2 / 2);
      ctx.save();
      if (bandRot) {
        ctx.translate(bandRot.cx, bandRot.cy);
        ctx.rotate(bandRot.rad);
        ctx.translate(-bandRot.cx, -bandRot.cy);
      }
      // 밴드 모양 경로 (beginPath 없이 서브패스로 추가 — 그림자/채우기/패턴/테두리 공용)
      // 말풍선은 꼬리까지 한 외곽선에 포함 → 테두리가 꼬리를 따라 그려짐
      const bcx = bxx + bw2 / 2, bcy = byy + bh2 / 2;
      const addBandShape = () => {
        if (bandStyle === 'bubble') {
          const tail = band.tail || 'bl';
          const tLeft = tail === 'bl' || tail === 'tl';
          const tTop = tail === 'tl' || tail === 'tr';
          const tw = 26, th = 18;
          const tipDx = tLeft ? 6 : 20;
          const tx0 = tLeft ? bxx + bw2 * 0.22 : bxx + bw2 * 0.78 - tw;
          const r = Math.min(brad, (Math.min(tx0 - bxx, bxx + bw2 - (tx0 + tw))) );
          ctx.moveTo(bxx + r, byy);
          if (tTop) {
            ctx.lineTo(tx0, byy);
            ctx.lineTo(tx0 + tipDx, byy - th);
            ctx.lineTo(tx0 + tw, byy);
          }
          ctx.arcTo(bxx + bw2, byy, bxx + bw2, byy + bh2, r);
          ctx.arcTo(bxx + bw2, byy + bh2, bxx, byy + bh2, r);
          if (!tTop) {
            ctx.lineTo(tx0 + tw, byy + bh2);
            ctx.lineTo(tx0 + tipDx, byy + bh2 + th);
            ctx.lineTo(tx0, byy + bh2);
          }
          ctx.arcTo(bxx, byy + bh2, bxx, byy, r);
          ctx.arcTo(bxx, byy, bxx + bw2, byy, r);
          ctx.closePath();
        } else if (bandStyle === 'ellipse') {
          ctx.moveTo(bxx + bw2, bcy);
          ctx.ellipse(bcx, bcy, bw2 / 2, bh2 / 2, 0, 0, Math.PI * 2);
          ctx.closePath();
        } else if (bandStyle === 'heart') {
          const s = Math.min(bw2 / 2, bh2 / 1.25);
          const cy2 = bcy - 0.275 * s;
          ctx.moveTo(bcx, cy2 + s * 0.9);
          ctx.bezierCurveTo(bcx - s, cy2 + s * 0.35, bcx - s * 0.55, cy2 - s * 0.35, bcx, cy2 + s * 0.05);
          ctx.bezierCurveTo(bcx + s * 0.55, cy2 - s * 0.35, bcx + s, cy2 + s * 0.35, bcx, cy2 + s * 0.9);
          ctx.closePath();
        } else if (bandStyle === 'star') {
          for (let k = 0; k < 10; k++) {
            const a = (Math.PI / 5) * k - Math.PI / 2;
            const rr2 = k % 2 === 0 ? 1 : 0.5;
            const px2 = bcx + Math.cos(a) * (bw2 / 2) * rr2;
            const py2 = bcy + Math.sin(a) * (bh2 / 2) * rr2;
            if (k === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
          }
          ctx.closePath();
        } else {
          addRoundRect(ctx, bxx, byy, bw2, bh2, brad);
        }
      };
      const bandPath = () => { ctx.beginPath(); addBandShape(); };
      if (band.shadow !== false) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-120, -120, W + 240, H + 240);
        addBandShape();
        ctx.clip('evenodd');
        ctx.shadowColor = hexToRgba(band.shadowColor || '#000000', band.shadowAlpha == null ? 0.28 : band.shadowAlpha);
        ctx.shadowBlur = band.shadowBlur == null ? 10 : band.shadowBlur;
        ctx.shadowOffsetX = band.shadowX || 0;
        ctx.shadowOffsetY = band.shadowY == null ? 4 : band.shadowY;
        ctx.fillStyle = '#000';
        bandPath(); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = hexToRgba(band.fill, band.alpha);
      bandPath(); ctx.fill();
      if (band.pattern && band.pattern !== 'none') {
        ctx.save();
        bandPath(); ctx.clip();
        ctx.translate(bxx, byy);
        drawPattern(bw2, bh2, band.pattern, band.patternColor, band.patternAlpha);
        ctx.restore();
      }
      if (band.border === 'edge') {
        ctx.strokeStyle = band.borderColor;
        ctx.lineWidth = band.borderWidth;
        ctx.lineJoin = 'round';
        bandPath(); ctx.stroke();
      }
      // 포스트잇 접힌 귀
      if (bandStyle === 'postit') {
        const fold = Math.min(18, bh2 * 0.35);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.moveTo(bxx + bw2, byy + bh2 - fold);
        ctx.lineTo(bxx + bw2, byy + bh2);
        ctx.lineTo(bxx + bw2 - fold, byy + bh2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  });
  // ---- 사양 텍스트 레이아웃 선계산 (패널 컨테이너 안에서 줄바꿈·자동 맞춤) ----
  const font = text.fontFamily;
  const spp = state.specPanel;
  const PADX = spp.padX != null ? spp.padX : 16;
  const PADY = spp.padY != null ? spp.padY : 16;
  const explicitSpecSize = Number.isFinite(spp.width) && Number.isFinite(spp.height);
  const panelX = spp.x == null ? areaX + Math.max(0, text.offX - PADX) : spp.x;
  const panelY = spp.y == null
    ? cTop + Math.max(0, (cH - (Number(spp.height) || cH)) / 2)
    : spp.y;
  // 아주 작게 줄인 패널에서는 설정한 여백을 자동 축소해 텍스트 공간을 남긴다.
  const contentPadX = explicitSpecSize ? Math.min(PADX, Math.max(0, (spp.width - 20) / 2)) : PADX;
  const contentPadY = explicitSpecSize ? Math.min(PADY, Math.max(0, (spp.height - 12) / 2)) : PADY;
  const naturalContentX = Math.max(areaX + PADX, areaX + (text.offX || 0));
  const specContentX = explicitSpecSize ? panelX + contentPadX : naturalContentX;
  const specContentTop = explicitSpecSize ? panelY + contentPadY : cTop;
  const specContentW = explicitSpecSize
    ? Math.max(8, spp.width - contentPadX * 2)
    : Math.max(40, areaX + areaW - naturalContentX - PADX);
  const specContentH = explicitSpecSize
    ? Math.max(0, spp.height - contentPadY * 2)
    : cH;
  const cols = text.columns === 2 ? 2 : 1;
  const requestedColumnGap = cols === 2 ? (text.columnGap == null ? 36 : text.columnGap) : 0;
  const columnGap = cols === 2
    ? Math.min(requestedColumnGap, Math.max(0, specContentW - cols * 8))
    : 0;
  const colW = Math.max(4, (specContentW - columnGap) / cols);
  const minValueW = Math.min(20, Math.max(4, colW * 0.3));
  const specLabelW = Math.min(text.labelWidth, Math.max(4, colW - minValueW));
  const specValueGap = Math.min(text.valueGap || 0, Math.max(0, colW - specLabelW - minValueW));
  const rowGroups = V2.splitRows(state.rows, cols, text.columnBreak);
  const AUTOFIT_MARGIN = explicitSpecSize ? 0 : Math.max(14, PADY);
  const availableSpecH = Math.max(0, specContentH - AUTOFIT_MARGIN * 2);
  layout.issues = [];
  if (cH <= 0) layout.issues.push('위·아래 가로 띠가 겹쳐 사양 영역이 없습니다.');

  function measureSpec(fsTry) {
    ctx.letterSpacing = `${text.spacing || 0}px`; // 자간 반영해 측정
    const lh = fsTry + (text.innerLineGap == null ? 4 : text.innerLineGap);
    const itemGap = text.itemGap == null ? Math.max(0, text.rowGap + 2) : text.itemGap;
    const colData = [];
    let maxH = 0;
    for (let c = 0; c < cols; c++) {
      const rowsInCol = rowGroups[c] || [];
      const availableValueW = Math.max(1, colW - specLabelW - specValueGap);
      const valMaxW = Math.max(1, text.wrapWidth > 0
        ? Math.min(availableValueW, text.wrapWidth)
        : availableValueW);
      // 줄바꿈 계산도 실제로 그릴 굵기로 재야 폭이 어긋나지 않음
      ctx.font = `${text.valueBold === false ? 400 : 700} ${fsTry}px ${font}`;
      const wrapped = rowsInCol.map((row) => wrapText(row.value, valMaxW));
      const rowHeights = wrapped.map((lines) => Math.max(fsTry, (Math.max(1, lines.length) - 1) * lh + fsTry));
      const totalH = rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, rowsInCol.length - 1) * itemGap;
      let maxLineW = 0;
      wrapped.forEach((lines) => lines.forEach((ln) => {
        maxLineW = Math.max(maxLineW, ctx.measureText(ln).width);
      }));
      ctx.font = `${text.labelBold === false ? 400 : 700} ${fsTry}px ${font}`;
      const maxLabelW = rowsInCol.reduce((max, row) => Math.max(max, ctx.measureText(row.label).width), 0);
      colData.push({ rowsInCol, wrapped, rowHeights, totalH, maxLineW, maxLabelW, valMaxW });
      maxH = Math.max(maxH, totalH);
    }
    return { colData, maxH, lh, itemGap, fs: fsTry };
  }

  let specM;
  if (text.autofit) {
    // 패널의 세로 높이와 축소된 라벨 칸에 모두 들어갈 때까지 글자 크기를 줄인다.
    const minFs = explicitSpecSize ? 6 : 8;
    let fsTry = Math.max(minFs, text.fontSize || 24);
    specM = measureSpec(fsTry);
    const overflows = () => specM.maxH > availableSpecH
      || specM.colData.some((cd) => cd.maxLabelW > specLabelW + 0.5);
    while (fsTry > minFs && overflows()) {
      fsTry -= 1;
      specM = measureSpec(fsTry);
    }
  } else {
    specM = measureSpec(text.fontSize);
  }
  const colXs = Array.from({ length: cols }, (_, c) => specContentX + c * (colW + columnGap));
  if (specM.maxH > availableSpecH) {
    const target = explicitSpecSize ? '패널 높이' : '카드 영역';
    layout.issues.push(`사양 높이가 ${target}를 ${Math.ceil(specM.maxH - availableSpecH)}px 넘습니다.`);
  }
  specM.colData.forEach((cd, c) => {
    const contentWidth = specLabelW + specValueGap + cd.maxLineW;
    if (contentWidth > colW + 0.5 || cd.maxLabelW > specLabelW + 0.5) {
      layout.issues.push(`${c + 1}열 내용이 패널 가로 영역을 넘습니다.`);
    }
  });
  const valign = text.columnVAlign || 'center';
  const specCols = specM.colData.map((cd, c) => {
    const alignedHeight = valign === 'independent' ? cd.totalH : specM.maxH;
    const verticalOffset = explicitSpecSize
      ? (valign === 'top' ? 0
        : valign === 'bottom' ? Math.max(0, specContentH - alignedHeight)
          : Math.max(0, (specContentH - alignedHeight) / 2))
      : (valign === 'top' ? AUTOFIT_MARGIN
        : valign === 'bottom' ? Math.max(AUTOFIT_MARGIN, cH - alignedHeight - AUTOFIT_MARGIN)
          : Math.max(AUTOFIT_MARGIN, (cH - alignedHeight) / 2));
    return {
      ...cd,
      colX: colXs[c] != null ? colXs[c] : colXs[0],
      y0: specContentTop + verticalOffset + (explicitSpecSize ? 0 : text.offY),
    };
  });
  hit.specLayout = {
    explicit: explicitSpecSize,
    fontSize: specM.fs,
    columnWidth: colW,
    labelWidth: specLabelW,
    valueGap: specValueGap,
    lineCounts: specM.colData.map((cd) => cd.wrapped.map((lines) => lines.length)),
  };
  // 목록의 자연 바운딩 박스와 사용자가 직접 조절한 패널 컨테이너를 분리한다.
  let naturalSpecBox = null;
  let specBox = null;
  let specDx = 0;
  let specDy = 0;
  hit.specContent = null;
  if (state.rows.length) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const sc of specCols) {
      if (!sc.rowsInCol.length) continue;
      minX = Math.min(minX, sc.colX);
      maxX = Math.max(maxX, sc.colX + specLabelW + specValueGap + sc.maxLineW);
      minY = Math.min(minY, sc.y0);
      maxY = Math.max(maxY, sc.y0 + sc.totalH);
    }
    if (minX < maxX) {
      hit.specContent = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      naturalSpecBox = { x: minX - PADX, y: minY - PADY, w: maxX - minX + PADX * 2, h: maxY - minY + PADY * 2 };
      specBox = explicitSpecSize
        ? { x: panelX, y: panelY, w: spp.width, h: spp.height }
        : {
          x: spp.x == null ? naturalSpecBox.x : spp.x,
          y: spp.y == null ? naturalSpecBox.y : spp.y,
          w: naturalSpecBox.w,
          h: naturalSpecBox.h,
        };
      if (!explicitSpecSize) {
        specDx = specBox.x - naturalSpecBox.x;
        specDy = specBox.y - naturalSpecBox.y;
        hit.specContent.x += specDx;
        hit.specContent.y += specDy;
      }
    }
  }
  hit.specBase = state.specPanel.hidden ? null : specBox;
  hit.spec = state.specPanel.hidden || !specBox ? null
    : rotatedAabb(specBox, specBox.x + specBox.w / 2, specBox.y + specBox.h / 2, state.specPanel.rotate || 0);

  // ---- 사양 레이어 (패널 + 텍스트) ----
  const drawSpecLayer = () => {
    const sp = state.specPanel;
    if (sp.hidden || !specBox) return;
    const { x: px, y: py, w: pw, h: ph } = specBox;
    const pcx = px + pw / 2;
    const pcy = py + ph / 2;
    ctx.save();
    if (sp.rotate) {
      ctx.translate(pcx, pcy);
      ctx.rotate((sp.rotate * Math.PI) / 180);
      ctx.translate(-pcx, -pcy);
    }

    // 사양 패널 배경은 직접 조절한 크기를 쓰고, 텍스트는 왜곡하지 않는다.
    if (sp.on && specBox) {
      const prad = sp.shape === 'round' ? Math.min(sp.radius, pw / 2, ph / 2) : 0;
      const ss = Math.min(sp.slant != null ? sp.slant : 40, pw / 2);
      // beginPath 없이 서브패스로 추가 (evenodd 클립 조합용)
      const addPanelShape = () => {
        if (sp.shape === 'para') {
          ctx.moveTo(px + ss, py);
          ctx.lineTo(px + pw, py);
          ctx.lineTo(px + pw - ss, py + ph);
          ctx.lineTo(px, py + ph);
          ctx.closePath();
        } else if (sp.shape === 'ellipse') {
          ctx.moveTo(px + pw, py + ph / 2);
          ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
          ctx.closePath();
        } else addRoundRect(ctx, px, py, pw, ph, prad);
      };
      const panelPath = () => { ctx.beginPath(); addPanelShape(); };
      if (sp.shadow) {
        // 패널 바깥쪽에만 그림자 (안쪽은 evenodd 클립으로 차단 — 반투명 패널에 비치지 않게)
        ctx.save();
        ctx.beginPath();
        ctx.rect(-80, -80, W + 160, H + 160);
        addPanelShape();
        ctx.clip('evenodd');
        ctx.shadowColor = hexToRgba(sp.shadowColor || '#000000', sp.shadowAlpha == null ? 0.35 : sp.shadowAlpha);
        ctx.shadowBlur = sp.shadowBlur == null ? 20 : sp.shadowBlur;
        ctx.shadowOffsetX = sp.shadowX || 0;
        ctx.shadowOffsetY = sp.shadowY == null ? 8 : sp.shadowY;
        ctx.fillStyle = '#000';
        panelPath(); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = hexToRgba(sp.fill, sp.alpha);
      panelPath(); ctx.fill();
      if (sp.pattern && sp.pattern !== 'none') {
        ctx.save();
        panelPath(); ctx.clip();
        ctx.translate(px, py);
        drawPattern(pw, ph, sp.pattern, sp.patternColor, sp.patternAlpha);
        ctx.restore();
      }
      if (sp.border) {
        ctx.lineWidth = sp.borderWidth;
        ctx.strokeStyle = sp.borderColor;
        panelPath(); ctx.stroke();
      }
    }

    // 사양 텍스트 (선계산된 레이아웃으로 그리기)
    ctx.save();
    // 패널은 사양 목록의 실제 컨테이너다. 극단적으로 작게 줄여도 글자가 밖으로 새지 않는다.
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    ctx.translate(specDx, specDy);
    const fs = specM.fs, lineH = specM.lh;
    ctx.letterSpacing = `${text.spacing || 0}px`;
    ctx.textBaseline = 'top';
    specCols.forEach((sc) => {
      const lblLeft = sc.colX;
      const valLeft = lblLeft + specLabelW + specValueGap;
      const labelAlign = text.labelAlign || 'left';
      const valueAlign = text.valueAlign || 'left';
      const lblX = labelAlign === 'right' ? lblLeft + specLabelW
        : labelAlign === 'center' ? lblLeft + specLabelW / 2 : lblLeft;
      const valX = valueAlign === 'right' ? valLeft + sc.valMaxW
        : valueAlign === 'center' ? valLeft + sc.valMaxW / 2 : valLeft;
      let y = sc.y0;
      sc.rowsInCol.forEach((row, ri) => {
        // 라벨 — 굵기/그라디언트/그림자 선택 가능
        ctx.font = `${text.labelBold === false ? 400 : 700} ${fs}px ${font}`;
        ctx.textAlign = labelAlign;
        ctx.save();
        if (text.labelShadow) {
          ctx.shadowColor = hexToRgba(text.labelShadowColor || '#000000', 0.55);
          ctx.shadowBlur = Math.max(2, fs * 0.18);
          ctx.shadowOffsetY = 2;
        }
        ctx.fillStyle = text.labelGrad
          ? makeGradient(lblLeft, y, ctx.measureText(row.label).width || 1, fs,
              text.labelColor, text.labelColor2 || text.labelColor, 90)
          : text.labelColor;
        ctx.fillText(row.label, lblX, y);
        ctx.restore();
        // 값 — 일괄 지정 켜짐 → 값 글자색으로 통일. 그라디언트/그림자 선택 가능
        ctx.font = `${text.valueBold === false ? 400 : 700} ${fs}px ${font}`;
        ctx.textAlign = valueAlign;
        const baseCol = text.uniform ? text.valueColor : (row.color || text.valueColor);
        const lines = sc.wrapped[ri];
        ctx.save();
        if (text.valueShadow) {
          ctx.shadowColor = hexToRgba(text.valueShadowColor || '#000000', 0.55);
          ctx.shadowBlur = Math.max(2, fs * 0.18);
          ctx.shadowOffsetY = 2;
        }
        lines.forEach((ln, li) => {
          ctx.fillStyle = text.valueGrad
            ? makeGradient(valLeft, y + li * lineH, ctx.measureText(ln).width || 1, fs,
                baseCol, text.valueColor2 || baseCol, 90)
            : baseCol;
          ctx.fillText(ln, valX, y + li * lineH);
        });
        ctx.restore();
        y += sc.rowHeights[ri] + specM.itemGap;
      });
    });
    ctx.restore();
    ctx.restore();
  };

  // ---- 이미지 레이어 (크기·위치·모양) ----
  const drawImageLayer = () => {
    if (!hasImg) { hit.panel = null; hit.panelBase = null; return; }
    const bw = Math.max(10, panelW);
    const bh = Math.max(10, Math.round(H * (image.hFrac || 1)));
    const legacyX = (image.side === 'left' ? 0 : W - bw) + (image.pX || 0);
    const legacyY = (H - bh) / 2 + (image.pY || 0);
    const bx = image.panelX == null ? legacyX : image.panelX;
    const by = image.panelY == null ? legacyY : image.panelY;
    const irad = image.shape === 'round' ? Math.min(image.radius, bw / 2, bh / 2) : 0;
    const s = Math.min(image.slant, bw - 10);
    const diagPts = [[bx + s, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]];
    const trapPts = [[bx + s / 2, by], [bx + bw - s / 2, by], [bx + bw, by + bh], [bx, by + bh]];
    const triPts = [[bx + bw / 2, by], [bx + bw, by + bh], [bx, by + bh]];
    const paraPts = [[bx + s, by], [bx + bw, by], [bx + bw - s, by + bh], [bx, by + bh]];
    const panelBase = { x: bx, y: by, w: bw, h: bh };
    const panelCx = bx + bw / 2;
    const panelCy = by + bh / 2;
    hit.panelBase = panelBase;
    hit.panel = rotatedAabb(panelBase, panelCx, panelCy, image.panelRotate || 0);

    ctx.save();
    if (image.panelRotate) {
      ctx.translate(panelCx, panelCy);
      ctx.rotate((image.panelRotate * Math.PI) / 180);
      ctx.translate(-panelCx, -panelCy);
    }

    // beginPath 없이 서브패스로 모양 추가 (evenodd 클립 조합용)
    const addPoly = (pts) => {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    };
    const addShape = () => {
      if (image.shape === 'diag') addPoly(diagPts);
      else if (image.shape === 'trape') addPoly(trapPts);
      else if (image.shape === 'tri') addPoly(triPts);
      else if (image.shape === 'para') addPoly(paraPts);
      else if (image.shape === 'circle') {
        ctx.moveTo(bx + bw, by + bh / 2);
        ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
        ctx.closePath();
      } else addRoundRect(ctx, bx, by, bw, bh, irad);
    };
    const clipPath = () => { ctx.beginPath(); addShape(); };

    if (image.shadow) {
      // 그림자는 프레임(패널 모양) 바깥쪽에만 — 이미지가 칸을 다 채우지 않아도 안쪽에 비치지 않음
      ctx.save();
      ctx.beginPath();
      ctx.rect(-200, -200, W + 400, H + 400);
      addShape();
      ctx.clip('evenodd');
      ctx.shadowColor = hexToRgba(image.shadowColor || '#000000', image.shadowAlpha != null ? image.shadowAlpha : 0.45);
      ctx.shadowBlur = image.shadowBlur != null ? image.shadowBlur : 22;
      ctx.shadowOffsetX = image.shadowX || 0;
      ctx.shadowOffsetY = image.shadowY != null ? image.shadowY : 10;
      ctx.fillStyle = '#000';
      clipPath(); ctx.fill();
      ctx.restore();
    }

    ctx.save();
    clipPath();
    ctx.clip();
    const iw = imgFrame.naturalWidth || imgFrame.width;
    const ih = imgFrame.naturalHeight || imgFrame.height;
    let dw, dh;
    if (image.fit === 'stretch') {
      dw = bw; dh = bh;
    } else {
      let base;
      if (image.fit === 'width') base = bw / iw;
      else if (image.fit === 'height') base = bh / ih;
      else if (image.fit === 'contain') base = Math.min(bw / iw, bh / ih);
      else base = Math.max(bw / iw, bh / ih); // free/cover: 칸을 채우는 크기가 기준
      // 자유 크롭에서만 사용자 확대율을 추가 적용
      const sc = image.fit === 'free' ? base * image.scale : base;
      dw = iw * sc; dh = ih * sc;
    }
    const ix = bx + (bw - dw) / 2 + image.x;
    const iy = by + (bh - dh) / 2 + image.y;
    // 큰 사진은 단계적으로 줄인 뒤 그려야 디테일이 살고 모아레가 안 생김
    ctx.globalAlpha *= image.opacity == null ? 1 : image.opacity;
    ctx.filter = `brightness(${image.brightness == null ? 1 : image.brightness}) contrast(${image.contrast == null ? 1 : image.contrast}) saturate(${image.saturation == null ? 1 : image.saturation})`;
    const centerX = bx + bw / 2, centerY = by + bh / 2;
    ctx.translate(centerX, centerY);
    if (image.rotate) ctx.rotate(image.rotate * Math.PI / 180);
    if (image.mirrorX) ctx.scale(-1, 1);
    ctx.drawImage(downscaleSource(imgFrame, iw, ih, dw * RES), ix - centerX, iy - centerY, dw, dh);
    ctx.restore();

    if (image.frame && image.frame !== 'none') {
      ctx.save();
      ctx.lineWidth = image.frameWidth;
      ctx.strokeStyle = image.frame === 'gradient'
        ? makeGradient(bx, by, bw, bh, image.frameColor, image.frameColor2, 45)
        : image.frameColor;
      if (image.frame === 'glow') {
        ctx.shadowColor = hexToRgba(image.frameColor, 0.9);
        ctx.shadowBlur = 18;
      } else if (image.frame === 'dashed') {
        ctx.setLineDash([image.frameWidth * 2.5, image.frameWidth * 1.6]);
      } else if (image.frame === 'dotted') {
        ctx.setLineDash([0.1, image.frameWidth * 2]);
        ctx.lineCap = 'round';
      }
      ctx.lineJoin = 'round';
      clipPath();
      ctx.stroke();
      // 이중선은 같은 기본색을 사용하고, 색 2는 그라디언트에서만 의미를 갖는다.
      if (image.frame === 'double') {
        ctx.lineWidth = Math.max(1, image.frameWidth * 0.35);
        ctx.strokeStyle = image.frameColor;
        clipPath();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  };

  // 사양/이미지는 개별 레이어 — 겹칠 때 위로 올릴 쪽을 나중에 그림
  if ((state.layerTop || 'spec') === 'image') { drawSpecLayer(); drawImageLayer(); }
  else { drawImageLayer(); drawSpecLayer(); }

  // 텍스트 요소들 (0~5개, 전부 자유 배치 — 드래그로 이동)
  hit.texts = [];
  state.texts.forEach((t) => {
    if (!t.text || t.hidden) { hit.texts.push(null); return; }
    if (t.x == null || t.y == null) {
      t.x = W / 2; t.y = H / 2;
      t.align = t.align || 'center';
    }
    hit.texts.push(drawTextEl({
      text: t.text, x: t.x, y: t.y, size: t.size, color: t.color, align: t.align || 'left',
      fontFamily: t.fontFamily, fillType: t.fillType, color2: t.color2, gradAngle: t.gradAngle,
      outline: t.outline, outlineColor: t.outlineColor, outlineWidth: t.outlineWidth,
      shadow: t.shadow, shadowColor: t.shadowColor,
      shadowAlpha: t.shadowAlpha, shadowBlur: t.shadowBlur, shadowX: t.shadowX, shadowY: t.shadowY,
      bold: t.bold, italic: t.italic, underline: t.underline, strike: t.strike, spacing: t.spacing,
      vertical: t.vertical, opacity: t.opacity, rotate: t.rotate, lineHeight: t.lineHeight,
      boxWidth: t.boxWidth, background: t.background, backgroundColor: t.backgroundColor,
      backgroundAlpha: t.backgroundAlpha, backgroundPad: t.backgroundPad,
    }));
  });

  // 스티커 (이모지·이미지) — 텍스트 위에 그려짐, 드래그 이동
  hit.stickers = [];
  (state.stickers || []).forEach((st) => {
    if (st.hidden) { hit.stickers.push(null); return; }
    const size = st.size || 48;
    const sx = st.x != null ? st.x : W / 2;
    const sy = st.y != null ? st.y : H / 2;
    ctx.save();
    ctx.globalAlpha *= st.opacity == null ? 1 : st.opacity;
    ctx.translate(sx, sy);
    if (st.rotate) ctx.rotate((st.rotate * Math.PI) / 180);
    if (st.mirrorX) ctx.scale(-1, 1);
    if (st.type === 'image' && st.dataUrl) {
      const im = stickerImg(st.dataUrl);
      if (im && im.complete && im.naturalWidth) {
        const h2 = size * (im.naturalHeight / im.naturalWidth);
        const sd = downscaleSource(im, im.naturalWidth, im.naturalHeight, size * RES);
        ctx.drawImage(sd, -size / 2, -h2 / 2, size, h2);
        hit.stickers.push(rotatedAabb({ x: sx - size / 2, y: sy - h2 / 2, w: size, h: h2 }, sx, sy, st.rotate || 0));
      } else {
        hit.stickers.push(rotatedAabb({ x: sx - size / 2, y: sy - size / 2, w: size, h: size }, sx, sy, st.rotate || 0));
      }
    } else {
      ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.emoji || '⭐', 0, 0);
      hit.stickers.push(rotatedAabb({ x: sx - size / 2, y: sy - size / 2, w: size, h: size }, sx, sy, st.rotate || 0));
    }
    ctx.restore();
  });

  // 카드 안 효과는 배경과 콘텐츠 위 오버레이를 분리해 같은 렌더러를 사용한다.
  function drawInteriorEffects(effectLayer) {
    fxs.forEach((f, fi) => {
    if (!f || f.enabled === false || f.type === 'hueflow' || (f.layer || defaultFxLayer(f.type)) !== effectLayer) return;
    const baseAlpha = f.opacity == null ? 1 : f.opacity;
    ctx.save();
    ctx.globalAlpha *= baseAlpha;
    const ph = fxPhase(tMs, f);
    const col = f.color || '#ffffff';
    if (f.type === 'sparkle') {
      const rnd = seededRand(20260726 + fi * 977);
      const n = Math.round(15 + (f.density || 0.5) * 70);
      ctx.save();
      for (let i = 0; i < n; i++) {
        const x = rnd() * W, y = rnd() * H;
        const base = rnd();
        const k = 1 + Math.floor(rnd() * 3); // 주기 배수(정수 → 루프 이음새 없음)
        const size = 0.8 + rnd() * 2.4;
        const a = Math.max(0, Math.sin(2 * Math.PI * (ph * k + base)));
        if (a < 0.05) continue;
        ctx.globalAlpha = baseAlpha * a * 0.95;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        // 큰 별에는 십자 광선
        if (size > 2.4) {
          ctx.globalAlpha = baseAlpha * a * 0.55;
          ctx.strokeStyle = col;
          ctx.lineWidth = 1;
          const r2 = size * 3;
          ctx.beginPath();
          ctx.moveTo(x - r2, y); ctx.lineTo(x + r2, y);
          ctx.moveTo(x, y - r2); ctx.lineTo(x, y + r2);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (f.type === 'snow') {
      // 눈송이가 위에서 아래로 내리며 좌우로 살랑임
      const rnd = seededRand(55501 + fi * 131);
      const n = Math.round(10 + (f.density || 0.5) * 55);
      ctx.save();
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const x0 = rnd() * W;
        const off = rnd();
        const k = 1 + Math.floor(rnd() * 2); // 정수 배수 → 루프 이음새 없음
        const size = 1 + rnd() * 2.6;
        const p = ((ph * k) + off) % 1;
        const y = p * (H + 40) - 20;
        const sway = Math.sin(2 * Math.PI * (ph * k * 2 + off)) * 7;
        ctx.globalAlpha = baseAlpha * 0.85;
        ctx.beginPath();
        ctx.arc(x0 + sway, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (f.type === 'shine') {
      // 기울어진 빛줄기가 좌→우로 흐름
      const bandW = W * 0.18 * (0.5 + (f.density || 0.5));
      const x = -bandW * 2 + ph * (W + bandW * 4);
      ctx.save();
      ctx.translate(x, 0);
      ctx.transform(1, 0, -0.35, 1, 0, 0);
      const g = ctx.createLinearGradient(0, 0, bandW, 0);
      g.addColorStop(0, hexToRgba(col, 0));
      g.addColorStop(0.5, hexToRgba(col, 0.25 + (f.density || 0.5) * 0.3));
      g.addColorStop(1, hexToRgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, -H, bandW, H * 3);
      ctx.restore();
    } else if (f.type === 'meteor') {
      // 유성이 대각선으로 가로질러 떨어짐 (꼬리는 그라디언트)
      const rnd = seededRand(90210 + fi * 131);
      const n = Math.round(3 + (f.density || 0.5) * 9);
      const len = 70;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const off = rnd();
        const y0 = rnd() * H;
        const k = 1 + Math.floor(rnd() * 2);
        const p = ((ph * k) + off) % 1;
        const hx = -150 + p * (W + 300);
        const hy = y0 - 80 + p * (W + 300) * 0.4;
        const g = ctx.createLinearGradient(hx, hy, hx - len, hy - len * 0.4);
        g.addColorStop(0, hexToRgba(col, 0.95));
        g.addColorStop(1, hexToRgba(col, 0));
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - len, hy - len * 0.4);
        ctx.stroke();
      }
      ctx.restore();
    } else if (f.type === 'rain') {
      // 빗줄기 낙하
      const rnd = seededRand(31337 + fi * 131);
      const n = Math.round(25 + (f.density || 0.5) * 90);
      ctx.save();
      ctx.strokeStyle = hexToRgba(col, 0.45);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x0 = rnd() * (W + 30) - 15;
        const off = rnd();
        const k = 2 + Math.floor(rnd() * 2); // 정수 배수 → 루프 이음새 없음
        const len = 10 + rnd() * 14;
        const p = ((ph * k) + off) % 1;
        const y = p * (H + 60) - 30;
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + 3, y - len);
      }
      ctx.stroke();
      ctx.restore();
    } else if (f.type === 'bubbles') {
      // 비눗방울이 떠오름
      const rnd = seededRand(24680 + fi * 131);
      const n = Math.round(6 + (f.density || 0.5) * 26);
      ctx.save();
      ctx.strokeStyle = hexToRgba(col, 0.65);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < n; i++) {
        const x0 = rnd() * W;
        const off = rnd();
        const k = 1 + Math.floor(rnd() * 2);
        const r = 3 + rnd() * 7;
        const p = ((ph * k) + off) % 1;
        const y = H + 20 - p * (H + 60);
        const x = x0 + Math.sin(2 * Math.PI * (ph * k * 2 + off)) * 9;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = hexToRgba(col, 0.5);
        ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (f.type === 'fireflies') {
      // 반딧불 — 은은히 떠다니며 깜빡임
      const rnd = seededRand(86420 + fi * 131);
      const n = Math.round(5 + (f.density || 0.5) * 18);
      ctx.save();
      for (let i = 0; i < n; i++) {
        const cx0 = rnd() * W, cy0 = rnd() * H;
        const k1 = 1 + Math.floor(rnd() * 2), k2 = 1 + Math.floor(rnd() * 2), k3 = 1 + Math.floor(rnd() * 3);
        const o1 = rnd(), o2 = rnd(), o3 = rnd();
        const x = cx0 + Math.sin(2 * Math.PI * (ph * k1 + o1)) * 34;
        const y = cy0 + Math.cos(2 * Math.PI * (ph * k2 + o2)) * 24;
        const a = 0.2 + 0.8 * Math.max(0, Math.sin(2 * Math.PI * (ph * k3 + o3)));
        ctx.globalAlpha = baseAlpha * a;
        ctx.fillStyle = col;
        ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (f.type === 'petals') {
      // 꽃잎이 살랑살랑 낙하
      const rnd = seededRand(13579 + fi * 131);
      const n = Math.round(8 + (f.density || 0.5) * 30);
      ctx.save();
      for (let i = 0; i < n; i++) {
        const x0 = rnd() * (W + 60) - 30;
        const off = rnd();
        const k = 1 + Math.floor(rnd() * 2);
        const s = 4 + rnd() * 5;
        const p = ((ph * k) + off) % 1;
        const y = p * (H + 50) - 25;
        const sway = Math.sin(2 * Math.PI * (ph * k + off * 2)) * 26;
        const rot = 2 * Math.PI * (((ph * k * 2) + off) % 1);
        ctx.save();
        ctx.translate(x0 + sway, y);
        ctx.rotate(rot);
        ctx.globalAlpha = baseAlpha * 0.85;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    } else if (f.type === 'hearts') {
      // 하트가 두둥실 떠오름
      const rnd = seededRand(97531 + fi * 131);
      const n = Math.round(5 + (f.density || 0.5) * 20);
      ctx.save();
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const x0 = rnd() * W;
        const off = rnd();
        const k = 1 + Math.floor(rnd() * 2);
        const s = 6 + rnd() * 9;
        const p = ((ph * k) + off) % 1;
        const y = H + 20 - p * (H + 60);
        const sway = Math.sin(2 * Math.PI * (ph * k + off * 3)) * 12;
        const tilt = Math.sin(2 * Math.PI * (ph * k * 2 + off)) * 0.35;
        ctx.save();
        ctx.translate(x0 + sway, y);
        ctx.rotate(tilt);
        ctx.globalAlpha = baseAlpha * 0.85;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.9);
        ctx.bezierCurveTo(-s, s * 0.35, -s * 0.55, -s * 0.35, 0, s * 0.05);
        ctx.bezierCurveTo(s * 0.55, -s * 0.35, s, s * 0.35, 0, s * 0.9);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    } else if (f.type === 'starfield') {
      // 별들이 옆으로 흘러감 (가까운 별일수록 크고 빠름 — 패럴랙스)
      const rnd = seededRand(40404 + fi * 131);
      const n = Math.round(20 + (f.density || 0.5) * 70);
      ctx.save();
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const y = rnd() * H;
        const off = rnd();
        const layer = 1 + Math.floor(rnd() * 3);
        const size = 0.6 + layer * 0.7;
        const p = ((ph * layer) + off) % 1;
        const x = W + 20 - p * (W + 40);
        ctx.globalAlpha = baseAlpha * (0.25 + layer * 0.25);
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (f.type === 'scanline') {
      // 밝은 스캔 라인이 위→아래로 훑음
      const bandH = 14 + (f.density || 0.5) * 50;
      const y = ph * (H + bandH * 2) - bandH;
      const g = ctx.createLinearGradient(0, y - bandH / 2, 0, y + bandH / 2);
      g.addColorStop(0, hexToRgba(col, 0));
      g.addColorStop(0.5, hexToRgba(col, 0.3));
      g.addColorStop(1, hexToRgba(col, 0));
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(0, y - bandH / 2, W, bandH);
      ctx.restore();
    } else if (f.type === 'matrix') {
      // 매트릭스 문자비
      const rnd = seededRand(50505 + fi * 131);
      const chars = 'アイウエオカキクケコサシスセソ0123456789';
      const colGap = 18;
      const nCol = Math.ceil(W / colGap);
      const fsz = 13;
      const stepT = Math.floor(ph * 8); // 한 루프에 글자 8번 교체 → 이음새 없음
      ctx.save();
      ctx.font = `${fsz}px monospace`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = col;
      for (let c = 0; c < nCol; c++) {
        const use = rnd() < 0.2 + (f.density || 0.5) * 0.8;
        const off = rnd();
        const k = 1 + Math.floor(rnd() * 2);
        if (!use) continue;
        const p = ((ph * k) + off) % 1;
        const headY = p * (H + 140) - 70;
        for (let t = 0; t < 7; t++) {
          const a = t === 0 ? 0.95 : 0.65 - t * 0.09;
          if (a <= 0) continue;
          ctx.globalAlpha = baseAlpha * a;
          const chIdx = (c * 31 + t * 17 + stepT * 7) % chars.length;
          ctx.fillText(chars[chIdx], c * colGap, headY - t * (fsz + 2));
        }
      }
      ctx.restore();
    } else if (f.type === 'rays') {
      // 중앙에서 뻗는 광선이 회전
      const NR = 10;
      const aMax = 0.16 * (0.4 + (f.density || 0.5));
      const g = ctx.createConicGradient(ph * (Math.PI * 2 / NR), W / 2, H / 2);
      for (let i = 0; i < NR; i++) {
        g.addColorStop(i / NR, hexToRgba(col, aMax));
        g.addColorStop((i + 0.5) / NR, hexToRgba(col, 0));
      }
      g.addColorStop(1, hexToRgba(col, aMax));
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (f.type === 'signalwave') {
      // 수평 이동은 모든 줄이 고정 속도를 공유하고, 속도 설정은 QRS 모양의 요동만 바꾼다.
      const phases = V2.signalWavePhases(tMs, f.speed, f.direction);
      const waveCount = Math.max(1, Math.min(4, Math.round(f.waveCount || 3)));
      const bandGap = H / (waveCount + 1);
      const maxAmp = Math.min(72, bandGap * 0.78);
      const density = Math.max(0.1, Math.min(1, f.density == null ? 0.5 : f.density));
      const amp = 3 + Math.pow(density, 1.25) * Math.max(2, maxAmp - 3);
      const channels = Array.from({ length: waveCount }, (_, channel) => ({
        y: bandGap * (channel + 1),
        alpha: 0.52 + (waveCount === 1 ? 0 : channel / (waveCount - 1)) * 0.16,
      }));
      ctx.save();
      ctx.lineWidth = 1.65;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      for (let channel = 0; channel < channels.length; channel++) {
        const band = channels[channel];
        ctx.strokeStyle = hexToRgba(col, band.alpha);
        ctx.shadowColor = hexToRgba(col, band.alpha * 0.7);
        ctx.shadowBlur = 3;
        ctx.beginPath();
        const step = Math.max(1.25, W / 620);
        for (let x = 0; x < W; x += step) {
          const y = band.y - V2.signalWaveSample(x / W, phases.travel, channel, phases.motion) * amp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(W, band.y - V2.signalWaveSample(1, phases.travel, channel, phases.motion) * amp);
        ctx.stroke();
      }
      ctx.restore();
    } else if (f.type === 'telemetrybars') {
      // 중앙 정보 영역을 피하고 카드 아래쪽에만 머무는 텔레메트리 막대
      const count = Math.max(18, Math.round(W / 24));
      const cell = W / count;
      const maxH = 10 + (f.density || 0.5) * Math.min(42, H * 0.18);
      ctx.save();
      ctx.fillStyle = col;
      for (let i = 0; i < count; i++) {
        const u = i / count;
        const signal = 0.22
          + 0.43 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (3 * u + 2 * ph)))
          + 0.35 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (7 * u - 3 * ph + 0.17)));
        const h = Math.max(2, signal * maxH);
        ctx.globalAlpha = baseAlpha * (0.28 + signal * 0.36);
        ctx.fillRect(i * cell + cell * 0.24, H - h - 4, Math.max(1, cell * 0.5), h);
      }
      ctx.restore();
    } else if (f.type === 'circuitpulse') {
      // 좌우가 균형 잡힌 45도 PCB 트레이스와 그 위를 흐르는 신호점
      const routes = [
        [[0.02, 0.12], [0.14, 0.12], [0.18, 0.2], [0.36, 0.2]],
        [[0.02, 0.29], [0.1, 0.29], [0.15, 0.22], [0.27, 0.22]],
        [[0.06, 0.43], [0.16, 0.43], [0.2, 0.36], [0.38, 0.36]],
        [[0.98, 0.12], [0.86, 0.12], [0.82, 0.2], [0.64, 0.2]],
        [[0.98, 0.29], [0.9, 0.29], [0.85, 0.22], [0.73, 0.22]],
        [[0.94, 0.43], [0.84, 0.43], [0.8, 0.36], [0.62, 0.36]],
        [[0.02, 0.88], [0.14, 0.88], [0.18, 0.8], [0.36, 0.8]],
        [[0.98, 0.88], [0.86, 0.88], [0.82, 0.8], [0.64, 0.8]],
        [[0.08, 0.69], [0.19, 0.69], [0.23, 0.75], [0.4, 0.75]],
        [[0.92, 0.69], [0.81, 0.69], [0.77, 0.75], [0.6, 0.75]],
      ];
      const routeCount = Math.min(routes.length, Math.round(4 + (f.density || 0.5) * 6));
      ctx.save();
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      for (let i = 0; i < routeCount; i++) {
        const points = routes[i].map(([x, y]) => [x * W, y * H]);
        ctx.strokeStyle = hexToRgba(col, 0.16 + (i % 3) * 0.025);
        ctx.beginPath();
        points.forEach(([x, y], index) => { if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        ctx.stroke();
        const end = points[points.length - 1];
        ctx.fillStyle = hexToRgba(col, 0.14);
        ctx.strokeStyle = hexToRgba(col, 0.34);
        ctx.beginPath(); ctx.arc(end[0], end[1], 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (i < 3) {
          const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
          const total = lengths.reduce((sum, length) => sum + length, 0);
          let distance = ((ph + i / 3) % 1) * total;
          let px = points[0][0], py = points[0][1];
          for (let segment = 0; segment < lengths.length; segment++) {
            if (distance <= lengths[segment]) {
              const ratio = distance / lengths[segment];
              px = points[segment][0] + (points[segment + 1][0] - points[segment][0]) * ratio;
              py = points[segment][1] + (points[segment + 1][1] - points[segment][1]) * ratio;
              break;
            }
            distance -= lengths[segment];
          }
          ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.restore();
    } else if (f.type === 'aurora') {
      // 밝은 배경에서도 사라지지 않는 넓은 반투명 오로라 리본
      const spread = 0.75 + (f.density || 0.5) * 0.75;
      const palette = [col, hueShiftHex(col, 75), hueShiftHex(col, 155)];
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = `blur(${7 + spread * 6}px)`;
      palette.forEach((auroraColor, i) => {
        const yBase = H * (0.24 + i * 0.25);
        const thickness = H * (0.16 + spread * 0.08);
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, hexToRgba(auroraColor, 0.02));
        g.addColorStop(0.28, hexToRgba(auroraColor, 0.2));
        g.addColorStop(0.58, hexToRgba(hueShiftHex(auroraColor, 38), 0.26));
        g.addColorStop(1, hexToRgba(auroraColor, 0.03));
        ctx.fillStyle = g;
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += Math.max(12, W / 44)) {
          const u = x / W;
          const y = yBase + Math.sin(2 * Math.PI * (u + ph + i * 0.19)) * H * 0.08
            + Math.sin(2 * Math.PI * (2 * u - ph * 2 + i * 0.27)) * H * 0.025;
          if (x === -20) ctx.moveTo(x, y - thickness / 2); else ctx.lineTo(x, y - thickness / 2);
        }
        for (let x = W + 20; x >= -20; x -= Math.max(12, W / 44)) {
          const u = x / W;
          const y = yBase + Math.sin(2 * Math.PI * (u + ph + i * 0.19)) * H * 0.08
            + Math.sin(2 * Math.PI * (2 * u - ph * 2 + i * 0.27)) * H * 0.025;
          ctx.lineTo(x, y + thickness / 2);
        }
        ctx.closePath(); ctx.fill();
      });
      ctx.restore();
    } else if (f.type === 'topodrift') {
      // 낮은 대비의 닫힌 등고선이 서로 다른 위상으로 변형·이동
      const lines = Math.round(6 + (f.density || 0.5) * 10);
      ctx.save();
      ctx.strokeStyle = hexToRgba(col, 0.18);
      ctx.lineWidth = 1;
      for (let j = 0; j < lines; j++) {
        const baseY = ((j + 0.5) / lines) * H;
        ctx.beginPath();
        for (let x = 0; x <= W; x += Math.max(5, W / 140)) {
          const u = x / W;
          const y = baseY
            + Math.sin(2 * Math.PI * (2 * u + ph + j * 0.13)) * (4 + H * 0.018)
            + Math.sin(2 * Math.PI * (5 * u - 2 * ph + j * 0.07)) * (2 + H * 0.01);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (f.type === 'isodrift') {
      // 조밀한 교차선 대신 성긴 아이소메트릭 와이어프레임 큐브가 대각선으로 이동
      const size = 70 - (f.density || 0.5) * 28;
      const rowGap = size * 1.28;
      const colGap = size * 1.65;
      const offsetX = (ph * colGap) % colGap;
      const offsetY = (ph * rowGap) % rowGap;
      ctx.save();
      ctx.strokeStyle = hexToRgba(col, 0.2);
      ctx.lineWidth = 1.1;
      let row = 0;
      for (let cy = -rowGap + offsetY; cy < H + rowGap; cy += rowGap, row++) {
        for (let cx = -colGap + offsetX + (row % 2) * colGap * 0.5; cx < W + colGap; cx += colGap) {
          const half = size * 0.5;
          const quarter = size * 0.26;
          const top = [cx, cy - quarter * 2];
          const left = [cx - half, cy - quarter];
          const center = [cx, cy];
          const right = [cx + half, cy - quarter];
          const lowerLeft = [cx - half, cy + quarter];
          const bottom = [cx, cy + quarter * 2];
          const lowerRight = [cx + half, cy + quarter];
          ctx.beginPath();
          ctx.moveTo(...top); ctx.lineTo(...left); ctx.lineTo(...center); ctx.lineTo(...right); ctx.closePath();
          ctx.moveTo(...left); ctx.lineTo(...lowerLeft); ctx.lineTo(...bottom); ctx.lineTo(...center);
          ctx.moveTo(...right); ctx.lineTo(...lowerRight); ctx.lineTo(...bottom);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (f.type === 'glitch') {
      // 글리치 — 색 어긋난 가로 띠가 지지직 (한 루프 12스텝 → 이음새 없음)
      const stepT = Math.floor(ph * 12);
      const rnd = seededRand(70707 + fi * 131 + stepT * 13);
      const n = Math.round(2 + (f.density || 0.5) * 7);
      ctx.save();
      for (let i = 0; i < n; i++) {
        const y = rnd() * H;
        const hh = 2 + rnd() * 7;
        const dx = (rnd() - 0.5) * 40;
        ctx.globalAlpha = baseAlpha * (0.15 + rnd() * 0.2);
        ctx.fillStyle = i % 2 ? col : hueShiftHex(col, 180);
        ctx.fillRect(dx, y, W, hh);
      }
      ctx.restore();
    }
    ctx.restore();
    });
  }
  drawInteriorEffects('overlay');

  ctx.restore(); // 카드 클립 해제

  // 빛번짐 제한: 테두리·테두리 효과를 카드 모양 안에서만 그림 → 바깥 여백 0
  if (clipGlow) {
    ctx.save();
    roundRectPath(ctx, 0, 0, W, H, rr);
    ctx.clip();
  }

  // 외곽 테두리 (단색/그라디언트/글로우/이중/파선/점선)
  if (card.borderWidth > 0) {
    const bs = card.borderStyle || 'solid';
    const bwd = card.borderWidth;
    ctx.save();
    ctx.lineWidth = bwd;
    ctx.strokeStyle = bs === 'gradient'
      ? makeGradient(0, 0, W, H, card.borderColor, card.borderColor2 || card.borderColor, card.borderAngle == null ? 45 : card.borderAngle)
      : card.borderColor;
    if (bs === 'glow') {
      ctx.shadowColor = hexToRgba(card.borderColor, 0.9);
      ctx.shadowBlur = card.borderGlow == null ? 18 : card.borderGlow;
    } else if (bs === 'dashed') {
      ctx.setLineDash([bwd * (card.borderDash || 2.5), bwd * (card.borderGap || 1.6)]);
    } else if (bs === 'dotted') {
      ctx.setLineDash([0.1, bwd * (card.borderGap || 2)]);
      ctx.lineCap = 'round';
    }
    roundRectPath(ctx, bwd / 2, bwd / 2, W - bwd, H - bwd, Math.max(0, rr - bwd / 2));
    ctx.stroke();
    // 이중선(투톤): 같은 경로에 가는 선을 색2로 겹침
    if (bs === 'double') {
      ctx.lineWidth = Math.max(1, bwd * 0.35);
      ctx.strokeStyle = card.borderColor2 || '#ffffff';
      roundRectPath(ctx, bwd / 2, bwd / 2, W - bwd, H - bwd, Math.max(0, rr - bwd / 2));
      ctx.stroke();
    }
    ctx.restore();
  }

  // 테두리 계열 효과 — 달리는 빛·행진·무지개·모서리·스파크 등
  fxs.forEach((f, fi) => {
    if (!f || f.enabled === false || (f.layer || defaultFxLayer(f.type)) !== 'border') return;
    ctx.save();
    ctx.globalAlpha *= f.opacity == null ? 1 : f.opacity;
    const ph = fxPhase(tMs, f);
    if (f.type === 'neon') {
      // 무지개 색상이 순환하며 테두리가 네온처럼 빛남
      const hue = Math.round(ph * 360);
      const lw = Math.max(4, card.borderWidth || 4);
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = `hsl(${hue}, 100%, 62%)`;
      ctx.shadowColor = `hsl(${hue}, 100%, 62%)`;
      ctx.shadowBlur = 10 + (f.density || 0.5) * 22 + 6 * Math.sin(2 * Math.PI * ph * 2);
      roundRectPath(ctx, lw / 2, lw / 2, W - lw, H - lw, Math.max(0, rr - lw / 2));
      ctx.stroke();
      ctx.restore();
    } else if (f.type === 'pulse') {
      // 지정 색으로 테두리 글로우가 숨쉬듯 밝아졌다 어두워짐
      const col = f.color || '#ffffff';
      const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(2 * Math.PI * ph));
      const lw = Math.max(3, card.borderWidth || 4);
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = hexToRgba(col, a);
      ctx.shadowColor = col;
      ctx.shadowBlur = (6 + (f.density || 0.5) * 30) * a;
      roundRectPath(ctx, lw / 2, lw / 2, W - lw, H - lw, Math.max(0, rr - lw / 2));
      ctx.stroke();
      ctx.restore();
    } else if (f.type === 'spin') {
      // 원뿔형 그라디언트가 테두리를 따라 회전
      const col = f.color || '#ffffff';
      const lw = Math.max(4, card.borderWidth || 5);
      ctx.save();
      const g = ctx.createConicGradient(ph * 2 * Math.PI, W / 2, H / 2);
      g.addColorStop(0, col);
      g.addColorStop(0.25, hexToRgba(col, 0.06));
      g.addColorStop(0.5, col);
      g.addColorStop(0.75, hexToRgba(col, 0.06));
      g.addColorStop(1, col);
      ctx.lineWidth = lw;
      ctx.strokeStyle = g;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8 + (f.density || 0.5) * 14;
      roundRectPath(ctx, lw / 2, lw / 2, W - lw, H - lw, Math.max(0, rr - lw / 2));
      ctx.stroke();
      ctx.restore();
    } else if (f.type === 'chase') {
      // 밝은 빛 조각이 테두리를 따라 한 바퀴 돎
      const col = f.color || '#ffffff';
      const lw = Math.max(4, card.borderWidth || 5);
      const P = 2 * (W + H);
      const dashLen = P * (0.06 + (f.density || 0.5) * 0.2);
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.lineCap = 'round';
      ctx.setLineDash([dashLen, P - dashLen]);
      ctx.lineDashOffset = -ph * P;
      roundRectPath(ctx, lw / 2, lw / 2, W - lw, H - lw, Math.max(0, rr - lw / 2));
      ctx.stroke();
      ctx.restore();
    } else if (f.type === 'marquee') {
      // 균일 점선 또는 긴·짧은 분절을 한 효과 안에서 선택
      const col = f.color || '#ffffff';
      const lw = Math.max(3, card.borderWidth || 4);
      const seg = 6 + (f.density || 0.5) * 18;
      const segmented = f.variant === 'segments';
      const dashPattern = segmented
        ? [seg * 1.8, seg * 0.55, seg * 0.55, seg * 0.55]
        : [seg, seg * 0.8];
      const patt = dashPattern.reduce((sum, value) => sum + value, 0);
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = col;
      ctx.lineCap = segmented ? 'round' : 'butt';
      ctx.setLineDash(dashPattern);
      ctx.lineDashOffset = -ph * patt; // 한 루프에 정확히 한 패턴만큼 이동 → 이음새 없음
      roundRectPath(ctx, lw / 2, lw / 2, W - lw, H - lw, Math.max(0, rr - lw / 2));
      ctx.stroke();
      ctx.restore();
    } else if (f.type === 'rainbowspin') {
      // 무지개 그라디언트가 테두리를 따라 회전
      const lw = Math.max(4, card.borderWidth || 5);
      const g = ctx.createConicGradient(ph * 2 * Math.PI, W / 2, H / 2);
      for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60}, 100%, 60%)`);
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = g;
      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      ctx.shadowBlur = 4 + (f.density || 0.5) * 16;
      roundRectPath(ctx, lw / 2, lw / 2, W - lw, H - lw, Math.max(0, rr - lw / 2));
      ctx.stroke();
      ctx.restore();
    } else if (f.type === 'twochase') {
      // 두 빛 조각이 서로 반대 방향으로 돎
      const col = f.color || '#ffffff';
      const lw = Math.max(4, card.borderWidth || 5);
      const P = 2 * (W + H);
      const dashLen = P * (0.05 + (f.density || 0.5) * 0.15);
      ctx.save();
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 12;
      for (const [colr, dir, shift] of [[col, 1, 0], [hueShiftHex(col, 60), -1, P / 2]]) {
        ctx.strokeStyle = colr;
        ctx.shadowColor = colr;
        ctx.setLineDash([dashLen, P - dashLen]);
        ctx.lineDashOffset = dir * -ph * P + shift;
        roundRectPath(ctx, lw / 2, lw / 2, W - lw, H - lw, Math.max(0, rr - lw / 2));
        ctx.stroke();
      }
      ctx.restore();
    } else if (f.type === 'corners') {
      // 네 모서리가 차례대로 빛남
      const col = f.color || '#ffffff';
      const inset = Math.max(10, rr * 0.7);
      const pts = [[inset, inset], [W - inset, inset], [W - inset, H - inset], [inset, H - inset]];
      ctx.save();
      pts.forEach(([x, y], ci) => {
        const a = Math.max(0, Math.sin(2 * Math.PI * (ph - ci / 4)));
        if (a < 0.03) return;
        const r = (6 + (f.density || 0.5) * 14) * 2.2;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, hexToRgba(col, 0.9 * a));
        g.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    } else if (f.type === 'electric') {
      // 테두리 위 무작위 지점에서 전기 스파크 (한 루프 12스텝 → 이음새 없음)
      const col = f.color || '#ffffff';
      const stepT = Math.floor(ph * 12);
      const rnd = seededRand(88088 + fi * 131 + stepT * 17);
      const m = Math.round(2 + (f.density || 0.5) * 7);
      const per = 2 * (W + H);
      const perim = (s) => {
        s = ((s % per) + per) % per;
        if (s < W) return [s, 0];
        s -= W; if (s < H) return [W, s];
        s -= H; if (s < W) return [W - s, H];
        s -= W; return [0, H - s];
      };
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      for (let i = 0; i < m; i++) {
        const [x0, y0] = perim(rnd() * per);
        // 카드 안쪽으로 지그재그
        let nx = 0, ny = 0;
        if (y0 === 0) ny = 1; else if (x0 === W) nx = -1; else if (y0 === H) ny = -1; else nx = 1;
        ctx.beginPath();
        let x = x0, y = y0;
        ctx.moveTo(x, y);
        for (let t = 0; t < 4; t++) {
          x += nx ? nx * (3 + rnd() * 6) : (rnd() - 0.5) * 14;
          y += ny ? ny * (3 + rnd() * 6) : (rnd() - 0.5) * 14;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (f.type === 'techbrackets') {
      // 네 모서리의 L자 브래킷이 차례로 점등
      const col = f.color || '#ffffff';
      const len = 14 + (f.density || 0.5) * Math.min(54, Math.min(W, H) * 0.22);
      const inset = Math.max(14, (card.borderWidth || 4) + 10);
      const corners = [
        [inset, inset, 1, 1], [W - inset, inset, -1, 1],
        [W - inset, H - inset, -1, -1], [inset, H - inset, 1, -1],
      ];
      ctx.save();
      ctx.lineWidth = Math.max(2, (card.borderWidth || 4) * 0.55);
      ctx.lineCap = 'square';
      corners.forEach(([x, y, dx, dy], i) => {
        const a = 0.18 + 0.82 * Math.max(0, Math.sin(2 * Math.PI * (ph - i / 4)));
        ctx.strokeStyle = hexToRgba(col, a);
        ctx.shadowColor = col; ctx.shadowBlur = 8 * a;
        ctx.beginPath(); ctx.moveTo(x + dx * len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * len); ctx.stroke();
      });
      ctx.restore();
    } else if (f.type === 'dualkeyline') {
      // 세 겹의 얇은 선이 서로 다른 위상으로 차분하게 밝아짐
      const col = f.color || '#ffffff';
      const gap = 3 + (f.density || 0.5) * 10;
      ctx.save();
      ctx.lineWidth = Math.max(1, (card.borderWidth || 3) * 0.34);
      for (let i = 0; i < 3; i++) {
        const inset = Math.max(4, (card.borderWidth || 3) * 0.6) + i * gap;
        const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * (ph - i / 3));
        const a = 0.22 + pulse * 0.68;
        ctx.strokeStyle = hexToRgba(hueShiftHex(col, i * 32), a);
        roundRectPath(ctx, inset, inset, W - inset * 2, H - inset * 2, Math.max(0, rr - inset));
        ctx.stroke();
      }
      ctx.restore();
    } else if (f.type === 'notchframe') {
      // 절개 모서리 프레임 위를 짧은 강조 구간이 순환
      const col = f.color || '#ffffff';
      const notch = 8 + (f.density || 0.5) * Math.min(30, Math.min(W, H) * 0.14);
      const lw = Math.max(2, (card.borderWidth || 4) * 0.72);
      const inset = Math.max(12, (card.borderWidth || 4) + 8);
      const left = inset, top = inset, right = W - inset, bottom = H - inset;
      const perimeter = Math.max(1, 2 * ((right - left) + (bottom - top)) - notch * 4);
      const notchPath = () => {
        ctx.beginPath();
        ctx.moveTo(left + notch, top); ctx.lineTo(right - notch, top); ctx.lineTo(right, top + notch);
        ctx.lineTo(right, bottom - notch); ctx.lineTo(right - notch, bottom);
        ctx.lineTo(left + notch, bottom); ctx.lineTo(left, bottom - notch); ctx.lineTo(left, top + notch); ctx.closePath();
      };
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = hexToRgba(col, 0.22);
      notchPath(); ctx.stroke();
      ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 7;
      ctx.lineCap = 'round';
      ctx.setLineDash([perimeter * 0.13, perimeter * 0.87]);
      ctx.lineDashOffset = -ph * perimeter;
      notchPath(); ctx.stroke();
      ctx.restore();
    } else if (f.type === 'frequencyedge') {
      // 위·아래 테두리 안쪽의 막대 높이가 실제 신호처럼 계속 변형
      const col = f.color || '#ffffff';
      const count = Math.max(24, Math.round(W / 17));
      const cell = W / count;
      const maxH = 4 + (f.density || 0.5) * Math.min(24, H * 0.09);
      ctx.save();
      ctx.fillStyle = col;
      for (let i = 0; i < count; i++) {
        const u = i / count;
        const a = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (4 * u + 2 * ph)))
          * (0.62 + 0.38 * Math.sin(2 * Math.PI * (9 * u - 3 * ph + 0.21)) ** 2);
        const h = Math.max(1.5, a * maxH);
        ctx.globalAlpha = (f.opacity == null ? 1 : f.opacity) * (0.3 + a * 0.65);
        const bw = Math.max(1, cell * 0.42);
        const x = i * cell + (cell - bw) / 2;
        ctx.fillRect(x, 1, bw, h);
        ctx.fillRect(x, H - h - 1, bw, h);
      }
      ctx.restore();
    } else if (f.type === 'ionodes') {
      // 상·하단 두 개씩과 좌·우 한 개씩의 I/O 노드가 순서대로 점등
      const col = f.color || '#ffffff';
      const r = 2.5 + (f.density || 0.5) * 4.5;
      const edge = r + Math.max(5, (card.borderWidth || 3) * 0.7);
      const points = [
        [W * 0.33, edge], [W * 0.67, edge], [W - edge, H * 0.5],
        [W * 0.67, H - edge], [W * 0.33, H - edge], [edge, H * 0.5],
      ];
      ctx.save();
      points.forEach(([x, y], i) => {
        const a = 0.2 + 0.8 * Math.max(0, Math.sin(2 * Math.PI * (ph - i / points.length)));
        ctx.fillStyle = hexToRgba(col, a);
        ctx.shadowColor = col; ctx.shadowBlur = 10 * a;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = hexToRgba(col, 0.32 + a * 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();
    }
    ctx.restore();
  });

  if (clipGlow) ctx.restore(); // 빛번짐 제한 클립 해제

  // 장식 테두리 (선 스타일: 실선/파선/긴 파선/점선/일점쇄선/이중/삼중/물결)
  if (deco.on) {
    const gap = deco.inset;
    const dw = deco.width;
    ctx.save();
    ctx.lineWidth = dw;
    ctx.strokeStyle = hexToRgba(deco.color, deco.alpha);
    if (deco.style === 'dashed') {
      ctx.setLineDash([dw * 4, dw * 3]);
    } else if (deco.style === 'longdash') {
      ctx.setLineDash([dw * 9, dw * 4]);
    } else if (deco.style === 'dotted') {
      ctx.setLineDash([0.1, dw * 2.4]);
      ctx.lineCap = 'round';
    } else if (deco.style === 'dashdot') {
      ctx.setLineDash([dw * 5, dw * 2.4, 0.1, dw * 2.4]);
      ctx.lineCap = 'round';
    }
    if (deco.style === 'wave') {
      // 물결선 — 둘레를 따라 사인 파동 (파수를 정수로 맞춰 이음새 없음)
      const x0 = gap, y0 = gap, w2 = W - gap * 2, h2 = H - gap * 2;
      const P = 2 * (w2 + h2);
      const waves = Math.max(8, Math.round(P / 26));
      const amp = Math.min(4, gap * 0.4 + 1.5);
      const pt = (s) => {
        s = ((s % P) + P) % P;
        if (s < w2) return [x0 + s, y0, 0, -1];
        s -= w2; if (s < h2) return [x0 + w2, y0 + s, 1, 0];
        s -= h2; if (s < w2) return [x0 + w2 - s, y0 + h2, 0, 1];
        s -= w2; return [x0, y0 + h2 - s, -1, 0];
      };
      const N = Math.max(80, Math.round(P / 4));
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const s = (i / N) * P;
        const [px2, py2, nx, ny] = pt(s);
        const o = Math.sin((s / P) * waves * Math.PI * 2) * amp;
        if (i === 0) ctx.moveTo(px2 + nx * o, py2 + ny * o);
        else ctx.lineTo(px2 + nx * o, py2 + ny * o);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      roundRectPath(ctx, gap, gap, W - gap * 2, H - gap * 2, Math.max(0, rr - gap));
      ctx.stroke();
      if (deco.style === 'double' || deco.style === 'triple') {
        ctx.setLineDash([]);
        const g2 = gap + dw + 3;
        roundRectPath(ctx, g2, g2, W - g2 * 2, H - g2 * 2, Math.max(0, rr - g2));
        ctx.stroke();
        if (deco.style === 'triple') {
          const g3 = g2 + dw + 3;
          roundRectPath(ctx, g3, g3, W - g3 * 2, H - g3 * 2, Math.max(0, rr - g3));
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  drawSelectionOverlay();
  updateWarnings();
  ctx.restore(); // translate
}

async function loadImage(dataUrl) {
  imgEl = null;
  clearDownscaleCache();
  if (gifAnim) {
    for (const f of gifAnim.frames) { try { f.bmp.close(); } catch (_) {} }
    gifAnim = null;
  }
  if (!dataUrl) return;

  // GIF 움짤: 프레임 분해 (ImageDecoder — Chromium 내장)
  // 주의: fetch(dataUrl)는 CSP(connect-src)에 막히므로 base64를 직접 디코드
  if (dataUrl.startsWith('data:image/gif') && typeof ImageDecoder !== 'undefined') {
    try {
      const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const dec = new ImageDecoder({ data: buf, type: 'image/gif' });
      await dec.tracks.ready;
      const count = dec.tracks.selectedTrack ? dec.tracks.selectedTrack.frameCount : 1;
      if (count > 1) {
        const frames = [];
        let total = 0;
        for (let i = 0; i < count; i++) {
          const { image } = await dec.decode({ frameIndex: i });
          const delay = Math.max(20, (image.duration || 100000) / 1000); // μs → ms
          frames.push({ bmp: await createImageBitmap(image), delay });
          total += delay;
          image.close();
        }
        dec.close();
        gifAnim = { frames, total };
        ensureAnim();
        return;
      }
      dec.close();
    } catch (_) { /* 실패 시 일반 이미지로 폴백 */ }
  }

  await new Promise((resolve) => {
    const im = new Image();
    im.onload = () => { imgEl = im; resolve(); };
    im.onerror = () => { imgEl = null; resolve(); };
    im.src = dataUrl;
  });
}

async function loadBackgroundImage(dataUrl) {
  bgImgEl = null;
  if (!dataUrl) return;
  await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => { bgImgEl = im; resolve(); };
    im.onerror = () => reject(new Error('배경 이미지를 읽지 못했습니다.'));
    im.src = dataUrl;
  });
}

function selectedObject() {
  if (!selected) return null;
  if (selected.kind === 'image') return state.image;
  if (selected.kind === 'spec') return state.specPanel;
  if (selected.kind === 'text') return state.texts[selected.idx] || null;
  if (selected.kind === 'sticker') return (state.stickers || [])[selected.idx] || null;
  if (selected.kind === 'band') return (state.bands || [])[selected.idx] || null;
  return null;
}

function selectedBox() {
  if (!selected) return null;
  if (selected.kind === 'image') return hit.panel;
  if (selected.kind === 'spec') return hit.spec;
  if (selected.kind === 'text') return hit.texts[selected.idx];
  if (selected.kind === 'sticker') return hit.stickers[selected.idx];
  if (selected.kind === 'band') return hit.bands[selected.idx];
  return null;
}

function selectedBaseBox() {
  if (!selected) return null;
  if (selected.kind === 'image') return hit.panelBase || hit.panel;
  if (selected.kind === 'spec') return hit.specBase || hit.spec;
  return selectedBox();
}

function selectionTransform() {
  const obj = selectedObject();
  const box = selectedBaseBox();
  if (!obj || !box || !selected) return null;
  if (selected.kind === 'image') return {
    x: box.x, y: box.y, w: box.w, h: box.h,
    rotate: state.image.panelRotate || 0, opacity: state.image.opacity == null ? 1 : state.image.opacity,
  };
  if (selected.kind === 'spec') return {
    x: box.x, y: box.y, w: box.w, h: box.h, rotate: state.specPanel.rotate || 0, opacity: 1,
  };
  return {
    x: obj.x == null ? box.x : obj.x,
    y: obj.y == null ? box.y : obj.y,
    w: box.w, h: box.h,
    rotate: obj.rotate || 0,
    opacity: obj.opacity == null ? (obj.alpha == null ? 1 : obj.alpha) : obj.opacity,
  };
}

function canRotatePanelSelection() {
  return !!selected && (selected.kind === 'image' || selected.kind === 'spec');
}

function panelSelectionRotation() {
  if (!selected) return 0;
  if (selected.kind === 'image') return state.image.panelRotate || 0;
  if (selected.kind === 'spec') return state.specPanel.rotate || 0;
  return 0;
}

function rotateSelectionPoint(x, y, cx, cy, degrees) {
  if (!degrees) return { x, y };
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = x - cx, dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function selectionOutlineGeometry() {
  const box = canRotatePanelSelection() ? selectedBaseBox() : selectedBox();
  if (!box) return null;
  const rotate = panelSelectionRotation();
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const corners = [
    rotateSelectionPoint(box.x, box.y, cx, cy, rotate),
    rotateSelectionPoint(box.x + box.w, box.y, cx, cy, rotate),
    rotateSelectionPoint(box.x + box.w, box.y + box.h, cx, cy, rotate),
    rotateSelectionPoint(box.x, box.y + box.h, cx, cy, rotate),
  ];
  return { box, rotate, cx, cy, corners };
}

function keepHandleOnEditor(point) {
  if (!point) return null;
  const inset = 9;
  return {
    x: Math.max(-layout.ox + inset, Math.min(state.card.width + layout.ox - inset, point.x)),
    y: Math.max(-layout.oy + inset, Math.min(state.card.height + layout.oy - inset, point.y)),
  };
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pointToSegmentMetrics(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const rawT = lengthSq ? ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq : 0;
  const t = Math.max(0, Math.min(1, rawT));
  const nearest = { x: a.x + dx * t, y: a.y + dy * t };
  return { distance: Math.hypot(point.x - nearest.x, point.y - nearest.y), t, nearest };
}

function panelControlGeometry() {
  const geom = selectionOutlineGeometry();
  if (!geom || !canRotatePanelSelection()) return null;
  const names = ['top', 'right', 'bottom', 'left'];
  const corners = geom.corners.map((point, index) => ({
    index,
    point,
    handle: keepHandleOnEditor(point),
  }));
  const edges = names.map((edge, index) => {
    const a = geom.corners[index];
    const b = geom.corners[(index + 1) % geom.corners.length];
    return { edge, index, a, b, handle: keepHandleOnEditor(midpoint(a, b)) };
  });
  return { ...geom, corners, edges };
}

function panelInteractionAt(point) {
  const controls = panelControlGeometry();
  if (!controls || !point) return null;

  // 모서리는 크기 조절과 겹치지 않는 회전 전용 영역이다.
  for (const corner of controls.corners) {
    if (Math.hypot(point.x - corner.handle.x, point.y - corner.handle.y) <= 15) {
      return { kind: 'rotate', corner: corner.index, controls };
    }
  }

  let best = null;
  for (const edge of controls.edges) {
    const segment = pointToSegmentMetrics(point, edge.a, edge.b);
    const handleDistance = Math.hypot(point.x - edge.handle.x, point.y - edge.handle.y);
    const distance = Math.min(segment.distance, handleDistance);
    if (distance <= 10 && (!best || distance < best.distance)) {
      best = { kind: 'resize-edge', edge: edge.edge, edgeIndex: edge.index, distance, controls };
    }
  }
  return best;
}

function pointInRotatedBox(point, box, degrees = 0) {
  if (!point || !box) return false;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const local = rotateSelectionPoint(point.x, point.y, cx, cy, -degrees);
  return inRect(local, box);
}

function resizeCursorClass(edge, degrees = 0) {
  // 잡은 변에 수직인 축을 화면 각도로 바꾸어, 회전된 패널에서도 커서 방향이 맞게 보인다.
  let angle = (edge === 'left' || edge === 'right') ? degrees : degrees + 90;
  angle = ((angle % 180) + 180) % 180;
  if (angle < 22.5 || angle >= 157.5) return 'cursor-ew';
  if (angle < 67.5) return 'cursor-nwse';
  if (angle < 112.5) return 'cursor-ns';
  return 'cursor-nesw';
}

function resizeHandlePoint() {
  if (canRotatePanelSelection()) return null;
  const geom = selectionOutlineGeometry();
  return geom ? keepHandleOnEditor(geom.corners[2]) : null;
}

const CANVAS_CURSOR_CLASSES = [
  'cursor-move', 'cursor-bg', 'cursor-ew', 'cursor-ns',
  'cursor-nwse', 'cursor-nesw', 'cursor-rotate',
];
let lastCanvasPointer = null;

function updateCanvasCursor(pointerEvent = null) {
  if (!canvas) return;
  if (pointerEvent && Number.isFinite(pointerEvent.clientX) && Number.isFinite(pointerEvent.clientY)) {
    lastCanvasPointer = toCard(pointerEvent);
  }
  canvas.classList.remove(...CANVAS_CURSOR_CLASSES);

  if (drag) {
    if (drag.kind === 'rotate-panel') canvas.classList.add('cursor-rotate');
    else if (drag.kind === 'resize-edge') canvas.classList.add(resizeCursorClass(drag.edge, drag.rotate));
    else if (drag.kind === 'resize') canvas.classList.add('cursor-nwse');
    else canvas.classList.add(drag.kind === 'background-image' ? 'cursor-bg' : 'cursor-move');
    return;
  }
  if (bgImageDragMode) {
    canvas.classList.add('cursor-bg');
    return;
  }

  const point = lastCanvasPointer;
  if (!point) return;
  if (canRotatePanelSelection()) {
    const interaction = panelInteractionAt(point);
    if (interaction && interaction.kind === 'rotate') {
      canvas.classList.add('cursor-rotate');
      return;
    }
    if (interaction && interaction.kind === 'resize-edge') {
      canvas.classList.add(resizeCursorClass(interaction.edge, interaction.controls.rotate));
      return;
    }
    const geom = selectionOutlineGeometry();
    if (geom && pointInRotatedBox(point, geom.box, geom.rotate)) {
      canvas.classList.add('cursor-move');
      return;
    }
  }

  const resizeHandle = resizeHandlePoint();
  if (resizeHandle && Math.hypot(point.x - resizeHandle.x, point.y - resizeHandle.y) <= 12) {
    canvas.classList.add('cursor-nwse');
    return;
  }
  const box = selectedBox();
  if (box && inRect(point, box)) {
    canvas.classList.add('cursor-move');
    return;
  }
  if (pointInRotatedBox(point, hit.panelBase, state.image.panelRotate || 0)
      || pointInRotatedBox(point, hit.specBase, state.specPanel.rotate || 0)) {
    canvas.classList.add('cursor-move');
  }
}

function drawSelectionOverlay() {
  const geom = selectionOutlineGeometry();
  if (!geom || exportRendering || RES !== SCREEN_RES) return;
  ctx.save();
  ctx.strokeStyle = '#00d7bd';
  ctx.fillStyle = '#071a1b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  geom.corners.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  if (canRotatePanelSelection()) {
    const controls = panelControlGeometry();
    for (const edge of controls.edges) {
      ctx.save();
      ctx.translate(edge.handle.x, edge.handle.y);
      ctx.rotate((controls.rotate * Math.PI) / 180);
      ctx.beginPath();
      if (edge.edge === 'top' || edge.edge === 'bottom') ctx.rect(-11, -3, 22, 6);
      else ctx.rect(-3, -11, 6, 22);
      ctx.fillStyle = '#071a1b';
      ctx.fill();
      ctx.strokeStyle = '#d8fffb';
      ctx.stroke();
      ctx.restore();
    }
    for (const corner of controls.corners) {
      ctx.beginPath();
      ctx.arc(corner.handle.x, corner.handle.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ff304f';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
  } else {
    for (const point of geom.corners) {
      ctx.beginPath(); ctx.rect(point.x - 4, point.y - 4, 8, 8); ctx.fill();
      ctx.strokeStyle = '#d8fffb'; ctx.stroke();
    }
    const resizeHandle = resizeHandlePoint();
    if (resizeHandle) {
      ctx.beginPath(); ctx.rect(resizeHandle.x - 5, resizeHandle.y - 5, 10, 10);
      ctx.fillStyle = '#071a1b'; ctx.fill();
      ctx.strokeStyle = '#d8fffb'; ctx.stroke();
    }
  }
  ctx.restore();
}

function updateWarnings() {
  const el = document.getElementById('overflow-warning');
  if (!el) return;
  const issues = [...new Set(layout.issues || [])];
  if (!state.rows.some((row) => String(row.value || '').trim())) {
    issues.push('표시할 사양 값이 없습니다.');
  }
  if (!state.card.bgImageDataUrl) {
    const labelContrast = V2.contrastRatio(state.text.labelColor, state.card.bg1);
    const valueContrast = V2.contrastRatio(state.text.valueColor, state.card.bg1);
    if (Math.min(labelContrast, valueContrast) < 3) issues.push('글자와 배경의 명암 차가 낮아 읽기 어려울 수 있습니다.');
  }
  const noisyFx = (state.fxs || []).filter((fx) => fx && fx.enabled !== false && (fx.layer || defaultFxLayer(fx.type)) === 'overlay');
  if (noisyFx.length > 2) issues.push('내용 위 효과가 3개 이상이라 사양 가독성이 떨어질 수 있습니다.');
  el.hidden = !issues.length;
  el.classList.toggle('hidden', !issues.length);
  el.textContent = issues.join(' · ');
}

// ---------------- 드래그 ----------------
let drag = null;
function toCard(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width) / RES - layout.ox,
    y: (e.clientY - r.top) * (canvas.height / r.height) / RES - layout.oy,
  };
}
function inRect(p, box) {
  return box && p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h;
}

function applyPanelEdgeResize(activeDrag, point) {
  const obj = activeDrag && selectedObject();
  if (!obj || !activeDrag.box) return;
  const radians = ((activeDrag.rotate || 0) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - activeDrag.sx;
  const dy = point.y - activeDrag.sy;
  const localDx = dx * cos + dy * sin;
  const localDy = -dx * sin + dy * cos;
  const box = activeDrag.box;
  const center = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const widthLimits = activeDrag.selection.kind === 'image'
    ? { min: state.card.width * 0.05, max: state.card.width }
    : { min: 40, max: 4800 };
  const heightLimits = activeDrag.selection.kind === 'image'
    ? { min: state.card.height * 0.05, max: state.card.height * 1.5 }
    : { min: 30, max: 2400 };
  let width = box.w;
  let height = box.h;
  let centerX = center.x;
  let centerY = center.y;

  if (activeDrag.edge === 'left' || activeDrag.edge === 'right') {
    const rawWidth = box.w + (activeDrag.edge === 'right' ? localDx : -localDx);
    width = Math.max(widthLimits.min, Math.min(widthLimits.max, rawWidth));
    const centerShift = (width - box.w) / 2 * (activeDrag.edge === 'right' ? 1 : -1);
    centerX += cos * centerShift;
    centerY += sin * centerShift;
  } else {
    const rawHeight = box.h + (activeDrag.edge === 'bottom' ? localDy : -localDy);
    height = Math.max(heightLimits.min, Math.min(heightLimits.max, rawHeight));
    const centerShift = (height - box.h) / 2 * (activeDrag.edge === 'bottom' ? 1 : -1);
    centerX += -sin * centerShift;
    centerY += cos * centerShift;
  }

  const x = centerX - width / 2;
  const y = centerY - height / 2;
  if (activeDrag.selection.kind === 'image') {
    obj.panelX = x;
    obj.panelY = y;
    obj.width = width / state.card.width;
    obj.hFrac = height / state.card.height;
  } else if (activeDrag.selection.kind === 'spec') {
    obj.x = x;
    obj.y = y;
    obj.width = width;
    obj.height = height;
  }
}

// 포인터 이벤트 — 마우스·터치·펜을 한 코드로 처리 (모바일에서도 드래그 동작)
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' && e.isPrimary === false) return; // 멀티터치 2번째 손가락 무시
  const p = toCard(e);
  lastCanvasPointer = p;
  let picked = false;
  const selBox = selectedBox();

  // 배경 위치 조정 모드는 카드 내부 드래그를 배경 이미지에만 사용한다.
  if (bgImageDragMode && inRect(p, { x: 0, y: 0, w: state.card.width, h: state.card.height })) {
    selected = null;
    drag = {
      kind: 'background-image', sx: p.x, sy: p.y,
      ox: state.card.bgImageX || 0, oy: state.card.bgImageY || 0,
    };
    picked = true;
  }

  const panelInteraction = !drag && canRotatePanelSelection() ? panelInteractionAt(p) : null;
  if (panelInteraction && panelInteraction.kind === 'rotate') {
    const obj = selectedObject();
    const baseBox = selectedBaseBox();
    if (obj && !obj.locked && baseBox) {
      const cx = baseBox.x + baseBox.w / 2;
      const cy = baseBox.y + baseBox.h / 2;
      const current = selected.kind === 'image' ? (state.image.panelRotate || 0) : (state.specPanel.rotate || 0);
      drag = { kind: 'rotate-panel', selection: { ...selected }, cx, cy,
        startAngle: Math.atan2(p.y - cy, p.x - cx), rotate: current };
      picked = true;
    }
  }
  if (!drag && panelInteraction && panelInteraction.kind === 'resize-edge') {
    const obj = selectedObject();
    const baseBox = selectedBaseBox();
    if (obj && !obj.locked && baseBox) {
      drag = {
        kind: 'resize-edge', edge: panelInteraction.edge, selection: { ...selected },
        sx: p.x, sy: p.y, box: { ...baseBox }, rotate: panelSelectionRotation(),
      };
      picked = true;
    }
  }
  const resizeHandle = !drag && selected ? resizeHandlePoint() : null;
  if (!drag && selected && selBox && resizeHandle && Math.hypot(p.x - resizeHandle.x, p.y - resizeHandle.y) <= 12) {
    const obj = selectedObject();
    const baseBox = selectedBaseBox();
    if (obj && !obj.locked && baseBox) {
      drag = { kind: 'resize', selection: { ...selected }, sx: p.x, sy: p.y, box: { ...baseBox },
        rotate: panelSelectionRotation(), size: obj.size, width: obj.width, height: obj.height, hFrac: obj.hFrac };
      picked = true;
    }
  }
  // 스티커가 맨 위 → 스티커부터 검사
  for (let i = (state.stickers || []).length - 1; !drag && i >= 0; i--) {
    if (hit.stickers && inRect(p, hit.stickers[i])) {
      const st = state.stickers[i];
      selected = { kind: 'sticker', idx: i };
      picked = true;
      if (!st.locked) drag = { kind: 'sticker', idx: i, sx: p.x, sy: p.y, ox: st.x, oy: st.y };
      break;
    }
  }
  // 텍스트를 위에서부터(뒤에 그린 것 우선) 검사
  if (!drag) {
    for (let i = state.texts.length - 1; i >= 0; i--) {
      if (inRect(p, hit.texts[i])) {
        const t = state.texts[i];
        selected = { kind: 'text', idx: i };
        picked = true;
        if (!t.locked) drag = { kind: 'text', idx: i, sx: p.x, sy: p.y, ox: t.x, oy: t.y };
        break;
      }
    }
  }
  // 밴드(팝업·포스트잇·말풍선) 드래그 — 위에 그린 밴드 우선
  if (!drag && hit.bands) {
    for (let i = hit.bands.length - 1; i >= 0; i--) {
      if (inRect(p, hit.bands[i])) {
        const band = state.bands[i];
        selected = { kind: 'band', idx: i };
        picked = true;
        if (!band.locked) drag = { kind: 'band', idx: i, sx: p.x, sy: p.y, ox: band.x == null ? hit.bands[i].x : band.x, oy: band.y == null ? hit.bands[i].y : band.y };
        break;
      }
    }
  }
  const pickImagePanel = () => {
    if (drag || picked || !inRect(p, hit.panel)) return false;
    selected = { kind: 'image' };
    picked = true;
    const panelMode = (state.image.editMode || 'panel') === 'panel';
    drag = panelMode
      ? { kind: 'image-panel', sx: p.x, sy: p.y,
        ox: hit.panelBase ? hit.panelBase.x : 0, oy: hit.panelBase ? hit.panelBase.y : 0 }
      : { kind: 'image', sx: p.x, sy: p.y, ox: state.image.x, oy: state.image.y };
    return true;
  };
  const pickSpecPanel = () => {
    if (drag || picked || !inRect(p, hit.spec)) return false;
    selected = { kind: 'spec' };
    picked = true;
    if (hit.specBase) drag = { kind: 'spec-panel', sx: p.x, sy: p.y, ox: hit.specBase.x, oy: hit.specBase.y };
    return true;
  };
  if ((state.layerTop || 'spec') === 'spec') {
    pickSpecPanel();
    pickImagePanel();
  } else {
    pickImagePanel();
    pickSpecPanel();
  }
  if (!drag && !picked) selected = null;
  render();
  if (drag) {
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
  }
  updateCanvasCursor();
});
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  e.preventDefault(); // 드래그 중 페이지가 같이 스크롤되지 않게
  const p = toCard(e);
  lastCanvasPointer = p;
  const nx = drag.ox + (p.x - drag.sx);
  const ny = drag.oy + (p.y - drag.sy);
  if (drag.kind === 'background-image') {
    state.card.bgImageX = nx;
    state.card.bgImageY = ny;
  } else if (drag.kind === 'image') {
    // 맞춤 모드별 축 고정: 가로맞춤=세로만, 세로맞춤=가로만, 늘려채우기=고정, 자유배치=자유
    const img = state.image;
    const lockX = img.fit === 'width' || img.fit === 'stretch';
    const lockY = img.fit === 'height' || img.fit === 'stretch';
    if (!lockX) img.x = nx;
    if (!lockY) img.y = ny;
  } else if (drag.kind === 'image-panel') {
    state.image.panelX = nx;
    state.image.panelY = ny;
  } else if (drag.kind === 'spec-panel') {
    state.specPanel.x = nx;
    state.specPanel.y = ny;
  } else if (drag.kind === 'text') {
    const t = state.texts[drag.idx];
    if (t) { t.x = nx; t.y = ny; }
  } else if (drag.kind === 'sticker') {
    const st = state.stickers[drag.idx];
    if (st) { st.x = nx; st.y = ny; }
  } else if (drag.kind === 'band') {
    const b = state.bands && state.bands[drag.idx];
    if (b) { b.x = nx; b.y = ny; }
  } else if (drag.kind === 'resize-edge') {
    applyPanelEdgeResize(drag, p);
  } else if (drag.kind === 'resize') {
    const obj = selectedObject();
    if (obj) {
      const radians = ((drag.rotate || 0) * Math.PI) / 180;
      const dx = p.x - drag.sx, dy = p.y - drag.sy;
      const localDx = dx * Math.cos(radians) + dy * Math.sin(radians);
      const localDy = -dx * Math.sin(radians) + dy * Math.cos(radians);
      const newW = Math.max(20, drag.box.w + localDx);
      const newH = Math.max(20, drag.box.h + localDy);
      const ratio = Math.max(0.1, Math.max(newW / Math.max(1, drag.box.w), newH / Math.max(1, drag.box.h)));
      if (drag.selection.kind === 'text') obj.size = Math.max(10, Math.min(240, (drag.size || obj.size || 34) * ratio));
      else if (drag.selection.kind === 'sticker') obj.size = Math.max(8, Math.min(1200, (drag.size || obj.size || 48) * ratio));
      else if (drag.selection.kind === 'band') {
        obj.width = Math.max(40, drag.box.w * ratio);
        obj.height = Math.max(20, drag.box.h * ratio);
      } else if (drag.selection.kind === 'image') {
        obj.panelX = drag.box.x;
        obj.panelY = drag.box.y;
        obj.width = Math.max(0.05, Math.min(1, newW / state.card.width));
        obj.hFrac = Math.max(0.05, Math.min(1, newH / state.card.height));
      } else if (drag.selection.kind === 'spec') {
        obj.x = drag.box.x;
        obj.y = drag.box.y;
        obj.width = Math.max(40, newW);
        obj.height = Math.max(30, newH);
      }
    }
  } else if (drag.kind === 'rotate-panel') {
    const angle = Math.atan2(p.y - drag.cy, p.x - drag.cx);
    let degrees = drag.rotate + ((angle - drag.startAngle) * 180) / Math.PI;
    degrees = ((degrees + 180) % 360 + 360) % 360 - 180;
    if (drag.selection.kind === 'image') state.image.panelRotate = degrees;
    else if (drag.selection.kind === 'spec') state.specPanel.rotate = degrees;
  }
  render();
  updateCanvasCursor();
});
const endDrag = () => {
  if (drag) {
    syncPanelTransformControls();
    if (drag.kind === 'background-image') syncBackgroundPositionControls();
  }
  drag = null;
  canvas.classList.remove('dragging');
  updateCanvasCursor();
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointermove', (e) => {
  if (!drag) updateCanvasCursor(e);
});
canvas.addEventListener('pointerleave', () => {
  if (drag) return;
  lastCanvasPointer = null;
  updateCanvasCursor();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && bgImageDragMode && !drag) setBackgroundDragMode(false);
});

// ---------------- 사양 행 편집기 ----------------
let rowDragIdx = null; // 드래그 정렬 중인 행 인덱스
let hoverTooltip = null;

function ensureHoverTooltip() {
  if (hoverTooltip && hoverTooltip.isConnected) return hoverTooltip;
  hoverTooltip = document.createElement('div');
  hoverTooltip.id = 'hover-tooltip';
  hoverTooltip.className = 'hover-tooltip hidden';
  hoverTooltip.setAttribute('role', 'tooltip');
  document.body.appendChild(hoverTooltip);
  return hoverTooltip;
}

function showHoverTooltip(anchor, message) {
  if (!anchor || !message) return;
  const tip = ensureHoverTooltip();
  tip.textContent = message;
  tip.classList.remove('hidden');
  tip.setAttribute('aria-hidden', 'false');
  const anchorRect = anchor.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const gap = 9;
  let left = anchorRect.right + gap;
  if (left + tipRect.width > window.innerWidth - 8) left = anchorRect.left - tipRect.width - gap;
  let top = anchorRect.top + (anchorRect.height - tipRect.height) / 2;
  top = Math.max(8, Math.min(window.innerHeight - tipRect.height - 8, top));
  tip.style.left = `${Math.max(8, left)}px`;
  tip.style.top = `${top}px`;
}

function hideHoverTooltip() {
  if (!hoverTooltip) return;
  hoverTooltip.classList.add('hidden');
  hoverTooltip.setAttribute('aria-hidden', 'true');
}

function renderRows() {
  hideHoverTooltip();
  const wrap = document.getElementById('rows');
  wrap.innerHTML = '';
  state.rows.forEach((row, i) => {
    // v2.0 개편 이후 사양 행은 항상 표시하며, 삭제로만 목록에서 제거한다.
    if (row.hidden) delete row.hidden;
    const div = document.createElement('div');
    div.className = 'spec-row';
    div.dataset.rowIndex = i;
    // 드래그 손잡이 — 잡아서 원하는 위치로 한 번에 이동
    const grip = document.createElement('span');
    grip.className = 'grip'; grip.textContent = '⠿'; grip.title = '드래그해서 순서 이동';
    grip.onpointerdown = (e) => {
      if (e.pointerType === 'mouse') { div.draggable = true; return; }
      e.preventDefault();
      rowDragIdx = i;
      grip.setPointerCapture(e.pointerId);
      div.classList.add('drag-src');
    };
    grip.onpointermove = (e) => {
      if (rowDragIdx == null || e.pointerType === 'mouse') return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const rowEl = target && target.closest && target.closest('.spec-row');
      wrap.querySelectorAll('.drop-hint').forEach((el) => el.classList.remove('drop-hint'));
      if (rowEl) rowEl.classList.add('drop-hint');
    };
    const finishPointerReorder = (e) => {
      if (rowDragIdx == null || e.pointerType === 'mouse') return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const rowEl = target && target.closest && target.closest('.spec-row');
      const to = rowEl ? Number(rowEl.dataset.rowIndex) : rowDragIdx;
      const from = rowDragIdx;
      rowDragIdx = null;
      if (Number.isInteger(to) && to !== from) {
        const [moved] = state.rows.splice(from, 1);
        state.rows.splice(to, 0, moved);
      }
      renderRows(); render();
    };
    grip.onpointerup = finishPointerReorder;
    grip.onpointercancel = finishPointerReorder;
    div.ondragstart = (e) => {
      rowDragIdx = i;
      div.classList.add('drag-src');
      e.dataTransfer.effectAllowed = 'move';
    };
    div.ondragend = () => {
      rowDragIdx = null;
      div.draggable = false;
      div.classList.remove('drag-src');
      wrap.querySelectorAll('.drop-hint').forEach((el) => el.classList.remove('drop-hint'));
    };
    div.ondragover = (e) => {
      if (rowDragIdx == null || rowDragIdx === i) return;
      e.preventDefault();
      wrap.querySelectorAll('.drop-hint').forEach((el) => el.classList.remove('drop-hint'));
      div.classList.add('drop-hint');
    };
    div.ondrop = (e) => {
      e.preventDefault();
      if (rowDragIdx == null || rowDragIdx === i) return;
      const [moved] = state.rows.splice(rowDragIdx, 1);
      state.rows.splice(i, 0, moved);
      rowDragIdx = null;
      renderRows(); render();
    };
    const lbl = document.createElement('input');
    lbl.className = 'lbl'; lbl.value = row.label; lbl.maxLength = 24;
    lbl.oninput = () => { row.label = lbl.value; render(); };
    const val = document.createElement('textarea');
    val.rows = 2; val.value = row.value; val.placeholder = '값 입력 · Enter로 줄바꿈';
    val.oninput = () => { row.value = val.value; render(); };
    const col = document.createElement('input');
    col.type = 'color'; col.className = 'rowcolor';
    col.value = row.color || state.text.valueColor;
    col.disabled = !!state.text.uniform;
    col.title = state.text.uniform ? '' : '이 줄 값 색 (더블클릭 = 기본색)';
    col.oninput = () => { row.color = col.value; render(); };
    col.ondblclick = () => { delete row.color; col.value = state.text.valueColor; render(); };
    const colorWrap = document.createElement('span');
    colorWrap.className = `rowcolor-wrap${state.text.uniform ? ' locked' : ''}`;
    const lockedColorMessage = '사양 패널 탭의 “사양 글자”에서 “값 글자색 일괄 적용”을 해제하면 행별 색을 바꿀 수 있습니다.';
    if (state.text.uniform) {
      colorWrap.tabIndex = 0;
      colorWrap.setAttribute('aria-label', lockedColorMessage);
      colorWrap.onmouseenter = () => showHoverTooltip(colorWrap, lockedColorMessage);
      colorWrap.onmouseleave = hideHoverTooltip;
      colorWrap.onfocus = () => showHoverTooltip(colorWrap, lockedColorMessage);
      colorWrap.onblur = hideHoverTooltip;
    } else {
      colorWrap.title = '이 줄 값 색';
    }
    colorWrap.appendChild(col);
    const btns = document.createElement('div');
    btns.className = 'rowbtns';
    const up = document.createElement('button');
    up.className = 'mv'; up.textContent = '▲'; up.title = '위로';
    up.onclick = () => {
      if (i > 0) { [state.rows[i - 1], state.rows[i]] = [state.rows[i], state.rows[i - 1]]; renderRows(); render(); }
    };
    const dn = document.createElement('button');
    dn.className = 'mv'; dn.textContent = '▼'; dn.title = '아래로';
    dn.onclick = () => {
      if (i < state.rows.length - 1) { [state.rows[i + 1], state.rows[i]] = [state.rows[i], state.rows[i + 1]]; renderRows(); render(); }
    };
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×'; del.title = '삭제';
    del.onclick = () => { state.rows.splice(i, 1); renderRows(); render(); };
    btns.append(up, dn, del);
    div.append(grip, lbl, val, colorWrap, btns);
    wrap.appendChild(div);
  });
  refreshColumnBreakOptions();
}

// ---------------- 폰트 목록 ----------------
let AVAILABLE_FONTS = [
  { label: '기본(맑은고딕)', value: '"Malgun Gothic","Segoe UI",sans-serif' },
  { label: '돋움', value: 'Dotum,sans-serif' },
  { label: '굴림', value: 'Gulim,sans-serif' },
  { label: '바탕(명조)', value: 'Batang,serif' },
  { label: '궁서', value: 'Gungsuh,serif' },
  { label: 'Nanum Gothic', value: '"Nanum Gothic",sans-serif' },
  { label: 'Arial', value: 'Arial,sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman",serif' },
  { label: 'Consolas(고정폭)', value: 'Consolas,monospace' },
  { label: 'Courier New', value: '"Courier New",monospace' },
  { label: 'Impact', value: 'Impact,"Arial Black",sans-serif' },
  { label: 'Georgia', value: 'Georgia,serif' },
  { label: 'Verdana', value: 'Verdana,sans-serif' },
  { label: 'Tahoma', value: 'Tahoma,sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS",cursive' },
];
function populateFontSelect(sel, val, includeInherit) {
  if (!sel) return;
  sel.innerHTML = '';
  if (includeInherit) {
    const o = document.createElement('option'); o.value = ''; o.textContent = '(사양 폰트 따름)'; sel.appendChild(o);
  }
  for (const f of AVAILABLE_FONTS) {
    const o = document.createElement('option'); o.value = f.value; o.textContent = f.label;
    o.style.fontFamily = f.value; // 드롭다운에서 해당 폰트로 미리보기
    sel.appendChild(o);
  }
  if (val && !AVAILABLE_FONTS.some((f) => f.value === val)) {
    const o = document.createElement('option'); o.value = val; o.textContent = val.replace(/"/g, '');
    o.style.fontFamily = val;
    sel.appendChild(o);
  }
  sel.value = val || '';
  // 선택창 자체도 선택된 폰트로 표시
  sel.style.fontFamily = val || '';
  if (!sel._fontPreviewBound) {
    sel._fontPreviewBound = true;
    sel.addEventListener('change', () => { sel.style.fontFamily = sel.value || ''; });
  }
}
function initFonts() {
  populateFontSelect(document.getElementById('font-family'), state.text.fontFamily, false);
}

// 패턴 목록 (배경/사양패널/밴드 공용)
const PATTERNS = [
  ['none', '없음'], ['dots', '도트'], ['rings', '동그라미'], ['grid', '격자'],
  ['vertical', '세로선'], ['horizontal', '가로선'], ['diagonal', '사선'],
  ['cross', '교차 사선'], ['checker', '체크무늬'], ['plus', '플러스'], ['zigzag', '지그재그'],
  ['diamonds', '마름모'], ['triangles', '삼각형'], ['waves', '물결'], ['scales', '비늘'],
  ['bricks', '벽돌'], ['hex', '벌집'], ['stars', '반짝별'], ['hearts', '하트'],
];
function populatePatternSelects() {
  for (const id of ['bg-pattern', 'sp-pattern', 'band-pattern']) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    sel.innerHTML = '';
    for (const [v, lab] of PATTERNS) {
      const o = document.createElement('option'); o.value = v; o.textContent = lab; sel.appendChild(o);
    }
  }
}
async function loadSystemFonts() {
  try {
    if (!window.queryLocalFonts) { toast('이 환경은 시스템 폰트 조회를 지원하지 않아요'); return; }
    const fonts = await window.queryLocalFonts();
    const fams = [...new Set(fonts.map((f) => f.family))].sort((a, b) => a.localeCompare(b, 'ko'));
    const existing = new Set(AVAILABLE_FONTS.map((f) => f.value));
    let added = 0;
    for (const fam of fams) {
      const val = /\s/.test(fam) ? `"${fam}"` : fam;
      if (!existing.has(val)) { AVAILABLE_FONTS.push({ label: fam, value: val }); existing.add(val); added++; }
    }
    populateFontSelect(document.getElementById('font-family'), state.text.fontFamily, false);
    renderTexts();
    toast(`시스템 폰트 ${added}개 불러옴`);
  } catch (e) {
    toast('폰트 불러오기 실패: ' + e.message);
  }
}

// ---------------- 텍스트 요소 편집기 ----------------
function tcRow() { const d = document.createElement('div'); d.className = 'tc-row'; return d; }
function mkColor(val, title, cb) {
  const c = document.createElement('input');
  c.type = 'color'; c.value = val; c.title = title;
  c.oninput = () => cb(c.value);
  return c;
}
function mkRange(min, max, step, val, cb) {
  const r = document.createElement('input');
  r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
  r.oninput = () => cb(+r.value);
  return r;
}
function renderTexts() {
  const wrap = document.getElementById('texts-list');
  wrap.innerHTML = '';
  state.texts.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'text-card';

    // 1) 문구 + 삭제
    const r1 = tcRow();
    const txt = document.createElement('textarea');
    txt.rows = 2;
    txt.className = 'tc-text'; txt.value = t.text; txt.placeholder = '문구';
    txt.oninput = () => { t.text = txt.value; render(); };
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×'; del.title = '삭제';
    del.onclick = () => { state.texts.splice(i, 1); renderTexts(); render(); };
    const dup = document.createElement('button');
    dup.className = 'mv'; dup.textContent = '⧉'; dup.title = '복제';
    dup.onclick = () => { selected = { kind: 'text', idx: i }; duplicateSelected(); };
    r1.append(txt, dup, del);

    // 2) 크기
    const r2 = tcRow();
    const szLab = document.createElement('span');
    szLab.className = 'tc-lab'; szLab.textContent = '크기';
    r2.append(szLab, mkRange(10, 80, 1, t.size, (v) => { t.size = v; render(); }));

    // 3) 폰트
    const r3 = tcRow();
    const fsel = document.createElement('select');
    populateFontSelect(fsel, t.fontFamily || '', true);
    fsel.onchange = () => { t.fontFamily = fsel.value; render(); };
    r3.append(fsel);

    const r3b = tcRow();
    const align = document.createElement('select');
    for (const [v, lab] of [['left', '왼쪽 정렬'], ['center', '가운데 정렬'], ['right', '오른쪽 정렬']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = lab; align.appendChild(o);
    }
    align.value = t.align || 'center'; align.onchange = () => { t.align = align.value; render(); };
    r3b.append(align);

    const rPos = tcRow();
    const xLab = document.createElement('span'); xLab.className = 'tc-lab'; xLab.textContent = 'X';
    const yLab = document.createElement('span'); yLab.className = 'tc-lab'; yLab.textContent = 'Y';
    rPos.append(xLab, mkRange(-state.card.width, state.card.width * 2, 1, t.x || 0, (v) => { t.x = v; render(); }),
      yLab, mkRange(-state.card.height, state.card.height * 2, 1, t.y || 0, (v) => { t.y = v; render(); }));

    const rTransform = tcRow();
    const rotLab = document.createElement('span'); rotLab.className = 'tc-lab'; rotLab.textContent = '회전';
    const opLab = document.createElement('span'); opLab.className = 'tc-lab'; opLab.textContent = '불투명도';
    rTransform.append(rotLab, mkRange(-180, 180, 1, t.rotate || 0, (v) => { t.rotate = v; render(); }),
      opLab, mkRange(0, 1, 0.02, t.opacity == null ? 1 : t.opacity, (v) => { t.opacity = v; render(); }));

    const rFlow = tcRow();
    const lhLab = document.createElement('span'); lhLab.className = 'tc-lab'; lhLab.textContent = '행간';
    const bwLab = document.createElement('span'); bwLab.className = 'tc-lab'; bwLab.textContent = '상자 폭';
    rFlow.append(lhLab, mkRange(0.7, 2.5, 0.05, t.lineHeight || 1.15, (v) => { t.lineHeight = v; render(); }),
      bwLab, mkRange(0, 1200, 5, t.boxWidth || 0, (v) => { t.boxWidth = v; render(); }));

    // 4) 채우기(단색/그라디언트) + 색 + 색2
    const r4 = tcRow();
    const fill = document.createElement('select');
    for (const [v, lab] of [['solid', '단색'], ['gradient', '그라데']]) { const o = document.createElement('option'); o.value = v; o.textContent = lab; fill.appendChild(o); }
    fill.value = t.fillType || 'solid';
    fill.onchange = () => { t.fillType = fill.value; render(); };
    r4.append(fill,
      mkColor(t.color, '색', (v) => { t.color = v; render(); }),
      mkColor(t.color2 || '#7c3aed', '색2(그라데)', (v) => { t.color2 = v; render(); }));

    // 4-2) 그라데 각도 (숫자칸 포함 한 줄 확보)
    const r4b = tcRow();
    const agLab = document.createElement('span');
    agLab.textContent = '각도'; agLab.className = 'tc-lab';
    r4b.append(agLab, mkRange(0, 360, 1, t.gradAngle || 0, (v) => { t.gradAngle = v; render(); }));

    // 5) 스타일 토글 (굵게/기울임/밑줄/취소선/세로)
    const r5 = tcRow();
    const styles = [
      ['bold', 'B', '굵게'], ['italic', 'I', '기울임'],
      ['underline', 'U', '밑줄'], ['strike', 'S', '취소선'],
      ['vertical', '↕', '세로쓰기'],
    ];
    for (const [key, label, title] of styles) {
      const b = document.createElement('button');
      b.className = 'tstyle' + (t[key] ? ' on' : '');
      b.textContent = label; b.title = title;
      if (key === 'italic') b.style.fontStyle = 'italic';
      if (key === 'underline') b.style.textDecoration = 'underline';
      if (key === 'strike') b.style.textDecoration = 'line-through';
      b.onclick = () => { t[key] = !t[key]; b.classList.toggle('on', t[key]); render(); };
      r5.appendChild(b);
    }

    // 5-2) 자간 (버튼 줄과 분리 — 넘침 방지)
    const r5b = tcRow();
    const spLab = document.createElement('span'); spLab.textContent = '자간'; spLab.className = 'tc-lab';
    r5b.append(spLab, mkRange(-3, 20, 0.5, t.spacing || 0, (v) => { t.spacing = v; render(); }));

    // 6) 외곽선 + 색 + 굵기
    const r6 = tcRow();
    const ol = document.createElement('input');
    ol.type = 'checkbox'; ol.checked = !!t.outline;
    ol.onchange = () => { t.outline = ol.checked; render(); };
    const olLab = document.createElement('span'); olLab.textContent = '외곽선'; olLab.className = 'tc-lab';
    r6.append(ol, olLab,
      mkColor(t.outlineColor, '외곽선 색', (v) => { t.outlineColor = v; render(); }),
      mkRange(1, 16, 1, t.outlineWidth || 4, (v) => { t.outlineWidth = v; render(); }));

    // 7) 바깥쪽 그림자
    const r7 = tcRow();
    const sh = document.createElement('input');
    sh.type = 'checkbox'; sh.checked = !!t.shadow;
    sh.onchange = () => { t.shadow = sh.checked; render(); };
    const shLab = document.createElement('span'); shLab.textContent = '그림자'; shLab.className = 'tc-lab';
    r7.append(sh, shLab,
      mkColor(t.shadowColor || '#000000', '그림자 색', (v) => { t.shadowColor = v; render(); }));
    const shadowRows = [
      ['불투명도', 0, 1, 0.02, t.shadowAlpha == null ? 0.55 : t.shadowAlpha, (v) => { t.shadowAlpha = v; render(); }],
      ['흐림', 0, 80, 1, t.shadowBlur == null ? 6 : t.shadowBlur, (v) => { t.shadowBlur = v; render(); }],
      ['X 위치', -80, 80, 1, t.shadowX || 0, (v) => { t.shadowX = v; render(); }],
      ['Y 위치', -80, 80, 1, t.shadowY == null ? 2 : t.shadowY, (v) => { t.shadowY = v; render(); }],
    ].map(([label, min, max, step, value, cb]) => {
      const row = tcRow(); row.classList.add('tc-control-row');
      const lab = document.createElement('span'); lab.className = 'tc-lab'; lab.textContent = `그림자 ${label}`;
      row.append(lab, mkRange(min, max, step, value, cb));
      return row;
    });

    const rBg = tcRow();
    const bg = document.createElement('input'); bg.type = 'checkbox'; bg.checked = !!t.background;
    bg.onchange = () => { t.background = bg.checked; render(); };
    const bgLab = document.createElement('span'); bgLab.className = 'tc-lab'; bgLab.textContent = '배경 상자';
    rBg.append(bg, bgLab,
      mkColor(t.backgroundColor || '#000000', '배경 색', (v) => { t.backgroundColor = v; render(); }));
    const bgAlphaRow = tcRow(); bgAlphaRow.classList.add('tc-control-row');
    const bgAlphaLab = document.createElement('span'); bgAlphaLab.className = 'tc-lab'; bgAlphaLab.textContent = '배경 불투명도';
    bgAlphaRow.append(bgAlphaLab, mkRange(0, 1, 0.02, t.backgroundAlpha == null ? 0.25 : t.backgroundAlpha, (v) => { t.backgroundAlpha = v; render(); }));
    const bgPadRow = tcRow(); bgPadRow.classList.add('tc-control-row');
    const bgPadLab = document.createElement('span'); bgPadLab.className = 'tc-lab'; bgPadLab.textContent = '배경 여백';
    bgPadRow.append(bgPadLab, mkRange(0, 40, 1, t.backgroundPad == null ? 8 : t.backgroundPad, (v) => { t.backgroundPad = v; render(); }));

    card.append(r1, r2, r3, r3b, rPos, rTransform, rFlow, r4, r4b, r5, r5b, r6, r7, ...shadowRows, rBg, bgAlphaRow, bgPadRow);
    wrap.appendChild(card);
  });
  const btn = document.getElementById('btn-add-text');
  if (btn) {
    btn.disabled = state.texts.length >= MAX_TEXTS;
    btn.textContent = state.texts.length >= MAX_TEXTS ? `+ 텍스트 (최대 ${MAX_TEXTS}개)` : '+ 텍스트 추가';
  }
}

// ---------------- 움직임 효과 편집기 (여러 개 동시, 배경/테두리 구분) ----------------
const MAX_FX = 8;
const FX_BG = [
  ['signalwave', '시그널 파형'], ['telemetrybars', '텔레메트리 바'], ['circuitpulse', '회로 펄스'],
  ['aurora', '오로라 쉬머'], ['topodrift', '등고선 드리프트'], ['isodrift', '아이소메트릭 드리프트'],
  ['sparkle', '반짝임'], ['hueflow', '배경 색 흐름'],
  ['snow', '눈 내림'], ['shine', '빛줄기 흐름'], ['meteor', '유성'],
  ['rain', '비 내림'], ['bubbles', '비눗방울'], ['fireflies', '반딧불'],
  ['petals', '꽃잎 낙하'], ['hearts', '하트 둥둥'], ['starfield', '별 흐름'],
  ['scanline', '스캔 라인'], ['matrix', '매트릭스 문자'], ['rays', '회전 광선'], ['glitch', '글리치'],
];
// ✨ = 빛이 카드 밖으로 번지는 효과 (FX_GLOW_PAD에 등록된 것들).
// 저장 시 그만큼 여백이 생기므로 '빛번짐을 카드 안쪽으로 제한' 옵션의 대상이다.
const FX_BORDER = [
  ['frequencyedge', '주파수 엣지'], ['ionodes', 'I/O 노드'], ['techbrackets', '테크 브래킷'],
  ['dualkeyline', '삼중 키라인'], ['notchframe', '노치 프레임'],
  ['neon', '네온 순환 ✨'], ['pulse', '글로우 펄스 ✨'], ['spin', '회전 그라디언트 ✨'],
  ['chase', '달리는 빛 ✨'], ['marquee', '테두리 행진'], ['rainbowspin', '무지개 회전 ✨'],
  ['twochase', '교차 달리는 빛 ✨'], ['corners', '모서리 펄스'],
  ['electric', '전기 스파크 ✨'],
];
const FX_BG_DEFAULT = new Set([
  'hueflow', 'sparkle', 'shine', 'starfield', 'scanline', 'rays',
  'signalwave', 'telemetrybars', 'circuitpulse', 'aurora', 'topodrift', 'isodrift',
]);
const FX_RULES = {
  hueflow: { density: false, color: false, opacity: false, placement: false, densityLabel: '강도' },
  sparkle: { direction: false, densityLabel: '반짝임 수' },
  snow: { densityLabel: '눈송이 수' }, shine: { densityLabel: '빛줄기 폭' },
  meteor: { densityLabel: '유성 수' }, rain: { densityLabel: '빗줄기 수' },
  bubbles: { densityLabel: '비눗방울 수' }, fireflies: { densityLabel: '반딧불 수' },
  petals: { densityLabel: '꽃잎 수' }, hearts: { densityLabel: '하트 수' },
  starfield: { densityLabel: '별 수' }, scanline: { densityLabel: '라인 폭' },
  matrix: { densityLabel: '문자 밀도' }, rays: { densityLabel: '광선 밝기' },
  glitch: { densityLabel: '글리치 양' },
  signalwave: {
    densityLabel: '파형 진폭', speedLabel: '파형 변화 속도', speedMin: 0.5, speedStep: 0.5,
    speedTitle: '파형의 수평 이동 속도는 일정합니다. 이 값은 각진 피크가 요동하는 속도만 바꿉니다.',
  },
  telemetrybars: { direction: false, densityLabel: '막대 높이' },
  circuitpulse: { densityLabel: '회로 밀도' }, aurora: { densityLabel: '색면 크기' },
  topodrift: { densityLabel: '선 밀도' }, isodrift: { densityLabel: '격자 밀도' },
  neon: { color: false, densityLabel: '빛번짐' },
  pulse: { direction: false, densityLabel: '빛번짐' }, spin: { densityLabel: '빛번짐' },
  chase: { densityLabel: '빛 길이' }, marquee: { densityLabel: '점선 길이' },
  rainbowspin: { color: false, densityLabel: '빛번짐' }, twochase: { densityLabel: '빛 길이' },
  corners: { densityLabel: '점등 범위' }, electric: { direction: false, densityLabel: '스파크 수' },
  frequencyedge: { direction: false, densityLabel: '막대 높이' }, ionodes: { densityLabel: '노드 크기' },
  techbrackets: { densityLabel: '브래킷 길이' },
  dualkeyline: { direction: false, densityLabel: '선 간격' }, notchframe: { densityLabel: '노치 크기' },
};
function defaultFxLayer(type) {
  if (FX_BORDER.some(([value]) => value === type)) return 'border';
  if (FX_BG_DEFAULT.has(type)) return 'background';
  return 'overlay';
}
function fxCategory(type) {
  return FX_BORDER.some(([value]) => value === type) ? 'border' : 'background';
}
function fxRule(type, fx) {
  const rule = { density: true, color: true, opacity: true, direction: true, placement: true,
    speedLabel: '속도', speedMin: 0.25, speedMax: 3, speedStep: 0.05, speedTitle: '',
    densityLabel: '강도', directionReason: '이 효과는 이동 방향이 없는 점멸·변형 효과라 진행 방향이 적용되지 않습니다.',
    ...(FX_RULES[type] || {}) };
  if (type === 'marquee' && fx && fx.variant === 'segments') rule.densityLabel = '분절 길이';
  return rule;
}
function disableFxControl(row, control, disabled, reason, disabledLabel = '적용 안 됨') {
  control.disabled = disabled;
  row.classList.toggle('control-disabled', disabled);
  row.setAttribute('aria-disabled', String(disabled));
  row.dataset.disabledLabel = disabled ? disabledLabel : '';
  row.title = disabled ? reason : '';
  control.title = disabled ? reason : control.title;
}
function renderFxs() {
  const wrap = document.getElementById('fx-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  (state.fxs || []).forEach((f, i) => {
    f.id = f.id || makeId('fx');
    if (f.enabled == null) f.enabled = true;
    if (f.type === 'segmentrail') { f.type = 'marquee'; f.variant = 'segments'; }
    if (f.type === 'marquee' && !['dashes', 'segments'].includes(f.variant)) f.variant = 'dashes';
    if (!f.layer) f.layer = defaultFxLayer(f.type);
    if (f.opacity == null) f.opacity = 1;
    if (f.direction == null) f.direction = 1;
    const category = fxCategory(f.type);
    const rule = fxRule(f.type, f);
    const card = document.createElement('div');
    card.className = 'text-card';
    card.dataset.fxType = f.type;
    card.dataset.fxIndex = String(i);

    const r1 = tcRow();
    const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = f.enabled !== false;
    enabled.title = '효과 켜기/끄기';
    enabled.onchange = () => { f.enabled = enabled.checked; render(); ensureAnim(); };
    const enabledText = document.createElement('span'); enabledText.className = 'tc-lab'; enabledText.textContent = '효과 사용';
    const spacer = document.createElement('span'); spacer.className = 'fx-row-spacer';
    const up = document.createElement('button'); up.className = 'mv'; up.textContent = '↑'; up.title = '효과 순서 위로';
    up.disabled = i >= state.fxs.length - 1;
    up.onclick = () => { [state.fxs[i], state.fxs[i + 1]] = [state.fxs[i + 1], state.fxs[i]]; renderFxs(); render(); };
    const down = document.createElement('button'); down.className = 'mv'; down.textContent = '↓'; down.title = '효과 순서 아래로';
    down.disabled = i === 0;
    down.onclick = () => { [state.fxs[i], state.fxs[i - 1]] = [state.fxs[i - 1], state.fxs[i]]; renderFxs(); render(); };
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×'; del.title = '삭제';
    del.onclick = () => { state.fxs.splice(i, 1); renderFxs(); render(); };
    r1.append(enabled, enabledText, spacer, up, down, del);

    const rKind = tcRow();
    rKind.classList.add('fx-kind-row');
    const kindLab = document.createElement('span'); kindLab.className = 'tc-lab'; kindLab.textContent = '효과 영역';
    const kindToggle = document.createElement('div'); kindToggle.className = 'fx-kind-toggle';
    kindToggle.setAttribute('role', 'group'); kindToggle.setAttribute('aria-label', '효과 영역');
    for (const [value, label] of [['background', '배경'], ['border', '테두리']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label; button.dataset.fxCategory = value;
      button.classList.toggle('active', category === value);
      button.setAttribute('aria-pressed', String(category === value));
      button.onclick = () => {
        if (value === category) return;
        const list = value === 'border' ? FX_BORDER : FX_BG;
        f.type = list[0][0];
        f.layer = defaultFxLayer(f.type);
        renderFxs(); render(); ensureAnim();
      };
      kindToggle.appendChild(button);
    }
    rKind.append(kindLab, kindToggle);

    const rType = tcRow();
    rType.classList.add('fx-type-row');
    const typeLab = document.createElement('span'); typeLab.className = 'tc-lab'; typeLab.textContent = '효과 종류';
    const sel = document.createElement('select');
    sel.dataset.fxControl = 'type';
    const typeList = category === 'border' ? FX_BORDER : FX_BG;
    for (const [v, lab] of typeList) {
      const o = document.createElement('option'); o.value = v; o.textContent = lab; sel.appendChild(o);
    }
    sel.value = f.type || 'sparkle';
    sel.onchange = () => {
      f.type = sel.value;
      f.layer = defaultFxLayer(f.type);
      renderFxs(); render(); ensureAnim();
    };
    rType.append(typeLab, sel);

    let rVariant = null;
    if (f.type === 'marquee') {
      rVariant = tcRow();
      rVariant.classList.add('fx-variant-row');
      const variantLab = document.createElement('span'); variantLab.className = 'tc-lab'; variantLab.textContent = '행진 형태';
      const variant = document.createElement('select'); variant.dataset.fxControl = 'variant';
      for (const [value, label] of [['dashes', '균일 점선'], ['segments', '긴·짧은 분절']]) {
        const option = document.createElement('option'); option.value = value; option.textContent = label; variant.appendChild(option);
      }
      variant.value = f.variant;
      variant.onchange = () => { f.variant = variant.value; renderFxs(); render(); };
      rVariant.append(variantLab, variant);
    }

    const rLayer = tcRow();
    const layerLab = document.createElement('span'); layerLab.className = 'tc-lab'; layerLab.textContent = '표시 위치';
    const layer = document.createElement('select');
    layer.dataset.fxControl = 'placement';
    const layerOptions = category === 'border'
      ? [['border', '테두리 고정']]
      : [['background', '내용 뒤 배경'], ['overlay', '내용 위 오버레이']];
    for (const [v, lab] of layerOptions) {
      const o = document.createElement('option'); o.value = v; o.textContent = lab; layer.appendChild(o);
    }
    const fixedPlacement = category === 'border' || rule.placement === false;
    if (fixedPlacement) f.layer = defaultFxLayer(f.type);
    layer.value = fixedPlacement ? defaultFxLayer(f.type) : (f.layer || defaultFxLayer(f.type));
    layer.onchange = () => { f.layer = layer.value; render(); };
    rLayer.append(layerLab, layer);
    disableFxControl(rLayer, layer, fixedPlacement,
      category === 'border' ? '테두리 효과는 테두리에만 표시됩니다.' : '배경 색 흐름은 카드 배경색 자체를 바꾸므로 위치를 선택할 수 없습니다.',
      '고정');

    const rDirection = tcRow();
    const directionLab = document.createElement('span'); directionLab.className = 'tc-lab'; directionLab.textContent = '진행 방향';
    const direction = document.createElement('select');
    direction.dataset.fxControl = 'direction';
    for (const [v, lab] of [[1, '정방향'], [-1, '반대 방향']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = lab; direction.appendChild(o);
    }
    direction.value = String(f.direction || 1);
    direction.onchange = () => { f.direction = +direction.value; render(); };
    rDirection.append(directionLab, direction);
    disableFxControl(rDirection, direction, rule.direction === false,
      rule.directionReason);

    const r2 = tcRow();
    const l2 = document.createElement('span'); l2.className = 'tc-lab'; l2.textContent = rule.speedLabel;
    const speed = mkRange(rule.speedMin, rule.speedMax, rule.speedStep, f.speed || 1, (v) => { f.speed = v; render(); });
    speed.dataset.fxControl = 'speed';
    if (rule.speedTitle) { r2.title = rule.speedTitle; speed.title = rule.speedTitle; }
    r2.append(l2, speed);

    const r3 = tcRow();
    const l3 = document.createElement('span'); l3.className = 'tc-lab'; l3.textContent = rule.densityLabel;
    const density = mkRange(0.1, 1, 0.05, f.density != null ? f.density : 0.5, (v) => { f.density = v; render(); });
    density.dataset.fxControl = 'density';
    r3.append(l3, density);
    disableFxControl(r3, density, rule.density === false,
      '이 효과는 카드 배경색 자체를 순환시키므로 강도 설정이 적용되지 않습니다.');

    let rWaveCount = null;
    if (f.type === 'signalwave') {
      rWaveCount = tcRow();
      const waveCountLab = document.createElement('span'); waveCountLab.className = 'tc-lab'; waveCountLab.textContent = '파형 수';
      const waveCount = mkRange(1, 4, 1, Math.round(f.waveCount || 3), (v) => { f.waveCount = Math.round(v); render(); });
      waveCount.dataset.fxControl = 'wave-count';
      waveCount.title = '동시에 표시할 파형 줄 수를 1~4개 중에서 선택합니다. 1개는 카드 중앙에 표시됩니다.';
      rWaveCount.title = waveCount.title;
      rWaveCount.append(waveCountLab, waveCount);
    }

    const rColor = tcRow();
    const colorLab = document.createElement('span'); colorLab.className = 'tc-lab'; colorLab.textContent = '효과 색';
    const colorControl = mkColor(f.color || '#ffffff', '효과 색', (v) => { f.color = v; render(); });
    colorControl.dataset.fxControl = 'color';
    rColor.append(colorLab, colorControl);
    disableFxControl(rColor, colorControl, rule.color === false,
      '이 효과는 카드 색상 또는 고정 다색 팔레트를 사용하므로 개별 효과 색이 적용되지 않습니다.');

    const r4 = tcRow();
    const op = document.createElement('span'); op.className = 'tc-lab'; op.textContent = '불투명도';
    const opacity = mkRange(0, 1, 0.02, f.opacity, (v) => { f.opacity = v; render(); });
    opacity.dataset.fxControl = 'opacity';
    r4.append(op, opacity);
    disableFxControl(r4, opacity, rule.opacity === false,
      '배경 색 흐름은 배경색 자체를 바꾸는 효과라 별도의 불투명도가 적용되지 않습니다.');

    card.append(r1, rKind, rType);
    if (rVariant) card.append(rVariant);
    card.append(rLayer, rDirection, r2, r3);
    if (rWaveCount) card.append(rWaveCount);
    card.append(rColor, r4);
    wrap.appendChild(card);
  });
  const btn = document.getElementById('btn-add-fx');
  if (btn) {
    const n = (state.fxs || []).length;
    btn.disabled = n >= MAX_FX;
    btn.textContent = n >= MAX_FX ? `+ 효과 (최대 ${MAX_FX}개)` : '+ 효과 추가';
  }
}

// ---------------- 스티커 (이모지 샘플 + 유저 이미지) ----------------
const MAX_STICKERS = 32;
const STICKER_EMOJIS = [
  // 컴퓨터 · 주변기기
  '🖥️', '💻', '🖱️', '⌨️', '🎧', '🕹️', '🎮', '🖨️',
  '💾', '💿', '📀', '💽', '📡', '🔌', '🔋', '🪫',
  // 부품 · 조립 · 성능
  '⚙️', '🔧', '🪛', '🧰', '🌡️', '🧊', '💨', '🚀',
  '⚡', '❄️', '💡', '🤖', '👾', '📈', '💸', '🛒',
  // 꾸미기
  '⭐', '🌟', '✨', '🔥', '❤️', '💖', '💜', '🎀',
  '🌸', '🍀', '👍', '💯', '😎', '😍', '🏆', '🎉',
  '🐱', '🐶', '🍒', '👑', '🎯', '🍜', '☕', '🌙',
];
const stickerCache = new Map();
function stickerImg(dataUrl) {
  if (!stickerCache.has(dataUrl)) {
    const im = new Image();
    im.onload = () => render();
    im.src = dataUrl;
    stickerCache.set(dataUrl, im);
  }
  return stickerCache.get(dataUrl);
}
function addSticker(st) {
  state.stickers = state.stickers || [];
  if (state.stickers.length >= MAX_STICKERS) {
    toast(`스티커는 최대 ${MAX_STICKERS}개까지예요`);
    return;
  }
  st.id = st.id || makeId('sticker');
  st.opacity = st.opacity == null ? 1 : st.opacity;
  st.mirrorX = !!st.mirrorX;
  st.x = Math.round(state.card.width / 2);
  st.y = Math.round(state.card.height / 2);
  state.stickers.push(st);
  renderStickers(); render();
}
function renderStickers() {
  const wrap = document.getElementById('stickers-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  (state.stickers || []).forEach((st, i) => {
    const card = document.createElement('div');
    card.className = 'text-card';
    const r1 = tcRow();
    const prev = document.createElement('span');
    prev.className = 'sticker-prev';
    prev.textContent = st.type === 'image' ? '🖼' : (st.emoji || '⭐');
    const szLab = document.createElement('span');
    szLab.className = 'tc-lab'; szLab.textContent = '크기';
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×'; del.title = '삭제';
    del.onclick = () => { state.stickers.splice(i, 1); renderStickers(); render(); };
    const dup = document.createElement('button'); dup.className = 'mv'; dup.textContent = '⧉'; dup.title = '복제';
    dup.onclick = () => { selected = { kind: 'sticker', idx: i }; duplicateSelected(); };
    r1.append(prev, szLab, mkRange(16, 480, 1, st.size || 48, (v) => { st.size = v; render(); }), dup, del);
    const r2 = tcRow();
    const rotLab = document.createElement('span');
    rotLab.className = 'tc-lab'; rotLab.textContent = '회전';
    r2.append(rotLab, mkRange(-180, 180, 1, st.rotate || 0, (v) => { st.rotate = v; render(); }));
    const r3 = tcRow();
    const xLab = document.createElement('span'); xLab.className = 'tc-lab'; xLab.textContent = 'X';
    const yLab = document.createElement('span'); yLab.className = 'tc-lab'; yLab.textContent = 'Y';
    r3.append(xLab, mkRange(-state.card.width, state.card.width * 2, 1, st.x || 0, (v) => { st.x = v; render(); }),
      yLab, mkRange(-state.card.height, state.card.height * 2, 1, st.y || 0, (v) => { st.y = v; render(); }));
    const r4 = tcRow();
    const mirror = document.createElement('input'); mirror.type = 'checkbox'; mirror.checked = !!st.mirrorX;
    mirror.onchange = () => { st.mirrorX = mirror.checked; render(); };
    const mirrorLab = document.createElement('span'); mirrorLab.className = 'tc-lab'; mirrorLab.textContent = '좌우 반전';
    const opLab = document.createElement('span'); opLab.className = 'tc-lab'; opLab.textContent = '불투명도';
    r4.append(mirror, mirrorLab, opLab, mkRange(0, 1, 0.02, st.opacity == null ? 1 : st.opacity, (v) => { st.opacity = v; render(); }));
    card.append(r1, r2, r3, r4);
    wrap.appendChild(card);
  });
}
function initStickers() {
  const grid = document.getElementById('emoji-grid');
  if (grid) {
    for (const em of STICKER_EMOJIS) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = em; b.title = '스티커로 추가';
      b.onclick = () => addSticker({ type: 'emoji', emoji: em, size: 48, rotate: 0 });
      grid.appendChild(b);
    }
  }
  const btn = document.getElementById('btn-sticker-image');
  if (btn) {
    btn.onclick = async () => {
      const url = await window.api.pickImage();
      if (!url) return;
      addSticker({ type: 'image', dataUrl: url, size: 110, rotate: 0 });
    };
  }
}

// ---------------- 색상 팔레트 (추천 + 최근) ----------------
const RECENT_KEY = 'speccard-recent-colors';
const RECOMMENDED = [
  '#000000', '#ffffff', '#6b7280', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#c026d3', '#ec4899', '#a12ea1',
];
let cpTarget = null;      // 현재 편집 중인 color input
let cpPop = null;         // 팝오버 DOM
function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (_) { return []; } }
function recordColor(hex) {
  if (!hex) return;
  let a = loadRecent().filter((c) => c.toLowerCase() !== hex.toLowerCase());
  a.unshift(hex);
  localStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 14)));
}
// 색을 대상 입력에 반영만 함 — '최근' 기록은 팝오버의 '적용' 버튼에서만
function applyColorToTarget(hex) {
  if (!cpTarget) return;
  cpTarget.value = hex;
  cpTarget.dispatchEvent(new Event('input', { bubbles: true }));
}
function buildPopover() {
  cpPop = document.createElement('div');
  cpPop.id = 'color-pop';
  cpPop.className = 'color-pop hidden';
  // 입력칸(RGB 숫자)은 포커스가 필요하므로 예외
  cpPop.onmousedown = (e) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); };
  document.body.appendChild(cpPop);
  document.addEventListener('mousedown', (e) => {
    if (cpPop && !cpPop.classList.contains('hidden') && !cpPop.contains(e.target) && e.target !== cpTarget) hideColorPop();
  });
}

// ---- 색 변환 헬퍼 (자체 색 선택 패널용) ----
function hexToRgbArr(hex) {
  let h = String(hex || '#ffffff').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHexStr(r, g, b) {
  const to2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d !== 0) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return [(h + 360) % 360, mx === 0 ? 0 : d / mx, mx];
}
function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
// 캔버스 드래그 공통 (0~1 비율 콜백)
function dragCanvas(cv, cb) {
  const pick = (e) => {
    const r = cv.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    const y = Math.max(0, Math.min(r.height, e.clientY - r.top));
    cb(x / r.width, y / r.height);
  };
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    cv.setPointerCapture(e.pointerId); // 손가락이 캔버스 밖으로 나가도 계속 추적
    pick(e);
    const mv = (ev) => { ev.preventDefault(); pick(ev); };
    const up = () => {
      cv.removeEventListener('pointermove', mv);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
    };
    cv.addEventListener('pointermove', mv);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  });
}

// 자체 색 선택 패널 — 고른 뒤 '적용'을 눌러야 확정·최근 기록·닫힘
function showCustomPicker(target) {
  const orig = target.value || '#ffffff';
  let [h, s, v] = rgbToHsv(...hexToRgbArr(orig));
  cpPop.innerHTML = '';

  const t1 = document.createElement('div');
  t1.className = 'cp-title'; t1.textContent = '직접 선택';
  const sv = document.createElement('canvas');
  sv.width = 188; sv.height = 120; sv.className = 'cp-sv';
  const hue = document.createElement('canvas');
  hue.width = 188; hue.height = 14; hue.className = 'cp-hue';
  const svc = sv.getContext('2d'), huc = hue.getContext('2d');

  const rgbRow = document.createElement('div');
  rgbRow.className = 'cp-rgb';
  const prev = document.createElement('span');
  prev.className = 'cp-prev';
  const mkNum = (lab) => {
    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = 0; inp.max = 255; inp.title = lab;
    return inp;
  };
  const rIn = mkNum('R'), gIn = mkNum('G'), bIn = mkNum('B');
  rgbRow.append(prev, rIn, gIn, bIn);
  // 스포이드 (화면에서 색 추출 — 지원 환경에서만)
  if (window.EyeDropper) {
    const eye = document.createElement('button');
    eye.textContent = '💉'; eye.title = '화면에서 색 추출';
    eye.className = 'cp-eye';
    eye.onclick = async () => {
      try {
        const res = await new window.EyeDropper().open();
        [h, s, v] = rgbToHsv(...hexToRgbArr(res.sRGBHex));
        refresh();
      } catch (_) { /* 취소 */ }
    };
    rgbRow.appendChild(eye);
  }

  const btns = document.createElement('div');
  btns.className = 'cp-btns';
  const cancel = document.createElement('button');
  cancel.textContent = '취소';
  const apply = document.createElement('button');
  apply.className = 'primary'; apply.textContent = '적용';

  const curHex = () => rgbToHexStr(...hsvToRgb(h, s, v));
  function drawSV() {
    const w = sv.width, hh = sv.height;
    const g1 = svc.createLinearGradient(0, 0, w, 0);
    g1.addColorStop(0, '#ffffff');
    g1.addColorStop(1, `hsl(${h}, 100%, 50%)`);
    svc.fillStyle = g1; svc.fillRect(0, 0, w, hh);
    const g2 = svc.createLinearGradient(0, 0, 0, hh);
    g2.addColorStop(0, 'rgba(0,0,0,0)');
    g2.addColorStop(1, '#000000');
    svc.fillStyle = g2; svc.fillRect(0, 0, w, hh);
    // 선택 지점 마커
    const mx = s * w, my = (1 - v) * hh;
    svc.beginPath(); svc.arc(mx, my, 6, 0, Math.PI * 2);
    svc.strokeStyle = '#000'; svc.lineWidth = 3; svc.stroke();
    svc.beginPath(); svc.arc(mx, my, 6, 0, Math.PI * 2);
    svc.strokeStyle = '#fff'; svc.lineWidth = 1.6; svc.stroke();
  }
  function drawHue() {
    const w = hue.width, hh = hue.height;
    const g = huc.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
    huc.fillStyle = g; huc.fillRect(0, 0, w, hh);
    const mx = (h / 360) * w;
    huc.strokeStyle = '#fff'; huc.lineWidth = 3;
    huc.strokeRect(mx - 2, 0.5, 4, hh - 1);
    huc.strokeStyle = '#000'; huc.lineWidth = 1;
    huc.strokeRect(mx - 2, 0.5, 4, hh - 1);
  }
  function refresh(live = true) {
    drawSV(); drawHue();
    const [r, g, b] = hsvToRgb(h, s, v);
    rIn.value = Math.round(r); gIn.value = Math.round(g); bIn.value = Math.round(b);
    prev.style.background = curHex();
    if (live) applyColorToTarget(curHex()); // 미리보기 반영 (기록은 '적용'에서만)
  }
  dragCanvas(sv, (fx, fy) => { s = fx; v = 1 - fy; refresh(); });
  dragCanvas(hue, (fx) => { h = fx * 360; refresh(); });
  const fromInputs = () => {
    [h, s, v] = rgbToHsv(+rIn.value || 0, +gIn.value || 0, +bIn.value || 0);
    refresh();
  };
  rIn.onchange = gIn.onchange = bIn.onchange = fromInputs;

  apply.onclick = () => {
    applyColorToTarget(curHex());
    recordColor(curHex());
    hideColorPop();
  };
  cancel.onclick = () => {
    applyColorToTarget(orig); // 원래 색으로 되돌림
    hideColorPop();
  };

  btns.append(cancel, apply);
  cpPop.append(t1, sv, hue, rgbRow, btns);
  refresh(false);
}
function hideColorPop() { if (cpPop) cpPop.classList.add('hidden'); cpTarget = null; }
function swatchRow(colors) {
  const row = document.createElement('div');
  row.className = 'cp-swatches';
  colors.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.style.background = c; b.title = c;
    b.onclick = () => { applyColorToTarget(c); hideColorPop(); };
    row.appendChild(b);
  });
  return row;
}
function showColorPop(target) {
  cpTarget = target;
  cpPop.innerHTML = '';
  const t1 = document.createElement('div'); t1.className = 'cp-title'; t1.textContent = '추천';
  cpPop.append(t1, swatchRow(RECOMMENDED));
  const recent = loadRecent();
  if (recent.length) {
    const t2 = document.createElement('div'); t2.className = 'cp-title'; t2.textContent = '최근';
    cpPop.append(t2, swatchRow(recent));
  }
  const custom = document.createElement('button');
  custom.className = 'cp-custom';
  custom.textContent = '🎨 직접 선택…';
  custom.onclick = () => showCustomPicker(target);
  cpPop.appendChild(custom);
  cpPop.classList.remove('hidden');
  const r = target.getBoundingClientRect();
  const pw = 210, ph = cpPop.offsetHeight || 190;
  let left = r.left, top = r.bottom + 6;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  if (top + ph > window.innerHeight - 8) top = r.top - ph - 6;
  cpPop.style.left = Math.max(8, left) + 'px';
  cpPop.style.top = Math.max(8, top) + 'px';
}
function isPickerColorInput(el) {
  return el && el.tagName === 'INPUT' && el.type === 'color' && !el.disabled && el.id !== 'cp-native';
}
function initPalette() {
  buildPopover();
  // 팝오버는 mousedown에서 표시
  document.addEventListener('mousedown', (e) => {
    if (isPickerColorInput(e.target)) { e.preventDefault(); e.stopPropagation(); showColorPop(e.target); }
  }, true);
  // 네이티브 색 대화상자는 click에서 열리므로 여기서 확실히 차단 ('직접 선택' 버튼으로만 열림)
  document.addEventListener('click', (e) => {
    if (isPickerColorInput(e.target)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}

// ---------------- 내 사양 저장 (사양 내용만, 앱 내부 보관) ----------------
const MY_SPECS_KEY = 'speccard-my-specs';
const MY_SPEC_PROFILES_KEY = 'speccard-spec-profiles-v2';
function loadSpecProfiles() {
  try {
    const profiles = JSON.parse(localStorage.getItem(MY_SPEC_PROFILES_KEY));
    if (profiles && typeof profiles === 'object' && !Array.isArray(profiles)) return profiles;
  } catch (_) { /* 구형 데이터로 폴백 */ }
  try {
    const rows = JSON.parse(localStorage.getItem(MY_SPECS_KEY));
    if (Array.isArray(rows) && rows.length) return { '기본 사양': rows.map(V2.normalizeRow) };
  } catch (_) { /* 없음 */ }
  return {};
}
function saveSpecProfiles(profiles) {
  localStorage.setItem(MY_SPEC_PROFILES_KEY, JSON.stringify(profiles));
}
function loadMySpecs() {
  const profiles = loadSpecProfiles();
  const first = Object.keys(profiles)[0];
  return first ? profiles[first].map(V2.normalizeRow) : null;
}
function updateMySpecsUI() {
  const btn = document.getElementById('btn-spec-load');
  if (btn) btn.disabled = !Object.keys(loadSpecProfiles()).length;
}

function chooseSpecProfile() {
  return new Promise((resolve) => {
    const profiles = loadSpecProfiles();
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    const box = document.createElement('div'); box.className = 'modal-card modal-wide';
    const title = document.createElement('h3'); title.textContent = '내 사양 프로필';
    const list = document.createElement('div'); list.className = 'profile-list';
    const names = Object.keys(profiles);
    if (!names.length) { const empty = document.createElement('p'); empty.textContent = '저장된 프로필이 없습니다.'; list.appendChild(empty); }
    names.forEach((name) => {
      const row = document.createElement('div'); row.className = 'profile-row';
      const open = document.createElement('button'); open.textContent = `${name} · ${profiles[name].length}개 항목`;
      open.onclick = () => { overlay.remove(); resolve({ name, rows: profiles[name].map(V2.normalizeRow) }); };
      const del = document.createElement('button'); del.textContent = '🗑'; del.title = '프로필 삭제';
      del.onclick = async () => {
        if (!(await confirmBox(`'${name}' 사양 프로필을 삭제할까요?`))) return;
        delete profiles[name]; saveSpecProfiles(profiles); row.remove(); updateMySpecsUI();
      };
      row.append(open, del); list.appendChild(row);
    });
    const close = document.createElement('button'); close.textContent = '닫기'; close.onclick = () => { overlay.remove(); resolve(null); };
    const buttons = document.createElement('div'); buttons.className = 'modal-btns'; buttons.append(close);
    box.append(title, list, buttons); overlay.appendChild(box); document.body.appendChild(overlay);
  });
}

function chooseDetectedSpecs(rows) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    const box = document.createElement('div'); box.className = 'modal-card modal-wide';
    const title = document.createElement('h3'); title.textContent = '자동 감지 결과 확인';
    const desc = document.createElement('p');
    desc.textContent = '가져올 항목만 선택하세요. 이미 직접 입력한 값은 선택해도 덮어쓰지 않습니다.';
    const list = document.createElement('div'); list.className = 'detect-list';
    const checks = [];
    rows.forEach((row, index) => {
      const label = document.createElement('label'); label.className = 'detect-row';
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = !!String(row.value || '').trim();
      const key = document.createElement('b'); key.textContent = row.label;
      const value = document.createElement('span'); value.textContent = row.value || '(값 없음)';
      label.append(check, key, value); list.appendChild(label); checks.push({ check, index });
    });
    const buttons = document.createElement('div'); buttons.className = 'modal-btns';
    const cancel = document.createElement('button'); cancel.textContent = '취소';
    const apply = document.createElement('button'); apply.className = 'primary'; apply.textContent = '선택 항목 적용';
    const close = (value) => { overlay.remove(); resolve(value); };
    cancel.onclick = () => close(null);
    apply.onclick = () => close(checks.filter((item) => item.check.checked).map((item) => item.index));
    overlay.onclick = (e) => { if (e.target === overlay) close(null); };
    buttons.append(cancel, apply); box.append(title, desc, list, buttons); overlay.appendChild(box);
    document.body.appendChild(overlay); apply.focus();
  });
}

// ---------------- 토스트 ----------------
let toastT = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 1800);
}

function makeDesignThumbnail() {
  const previous = exportRendering;
  try {
    exportRendering = true;
    render(performance.now());
    const thumb = document.createElement('canvas');
    const maxW = 240;
    thumb.width = Math.max(1, Math.min(maxW, Math.round(canvas.width / RES)));
    thumb.height = Math.max(1, Math.round((canvas.height / canvas.width) * thumb.width));
    const g = thumb.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    return thumb.toDataURL('image/webp', 0.72);
  } finally {
    exportRendering = previous;
    render(performance.now());
  }
}

async function saveCurrentDesign(asNew = false) {
  const nameInput = document.getElementById('design-name');
  state.name = nameInput.value.trim() || '무제';
  const previousFile = state.file;
  if (asNew) state.file = null;
  try {
    const payload = V2.clone(state);
    payload._thumbnail = makeDesignThumbnail();
    const result = await window.api.saveDesign(payload);
    state.file = result.file;
    await markSaved();
    await refreshList();
    toast(asNew ? `새 디자인으로 저장: ${result.name}` : `저장했어요: ${result.name}`);
  } catch (error) {
    state.file = previousFile;
    toast(`저장 실패: ${error.message}`);
  }
}

// ---------------- 컨트롤 바인딩 ----------------
function bindControls() {
  const $ = (id) => document.getElementById(id);

  $('btn-auto').onclick = async () => {
    try {
      $('btn-auto').disabled = true;
      $('btn-auto').textContent = '읽는 중…';
      const auto = await window.api.readSpecs();
      if (!auto.length) { toast('감지할 수 있는 사양이 없습니다.'); return; }
      const selectedIndexes = await chooseDetectedSpecs(auto);
      if (!selectedIndexes) return;
      state.rows = V2.mergeAutoSpecs(state.rows, auto, selectedIndexes);
      renderRows(); render();
      toast(`${selectedIndexes.length}개 자동 항목을 적용했습니다.`);
    } catch (e) {
      toast('읽기 실패: ' + e.message);
    } finally {
      $('btn-auto').disabled = false;
      $('btn-auto').textContent = '⚙ 사양 자동 채우기';
    }
  };

  $('btn-add-row').onclick = () => { state.rows.push({ label: 'NEW', value: '' }); renderRows(); render(); };

  // 내 사양 프로필 — 디자인과 별개로 여러 사양 묶음을 보관
  $('btn-spec-save').onclick = async () => {
    const name = await promptBox('사양 프로필 이름', state.name ? `${state.name} 사양` : '기본 사양');
    if (!name) return;
    const profiles = loadSpecProfiles();
    if (profiles[name] && !(await confirmBox(`'${name}' 프로필을 덮어쓸까요?`))) return;
    profiles[name] = state.rows.map(V2.normalizeRow);
    saveSpecProfiles(profiles);
    updateMySpecsUI();
    toast(`'${name}' 사양 프로필을 저장했습니다.`);
  };
  $('btn-spec-load').onclick = async () => {
    const profile = await chooseSpecProfile();
    if (!profile) return;
    state.rows = profile.rows;
    renderRows(); render();
    toast(`'${profile.name}' 사양을 불러왔습니다.`);
  };
  const manageProfiles = $('btn-spec-profile-manage');
  if (manageProfiles) manageProfiles.onclick = () => chooseSpecProfile();

  $('btn-image').onclick = async () => {
    try {
      const url = await window.api.pickImage();
      if (!url) return;
      state.image.dataUrl = url; state.image.x = 0; state.image.y = 0;
      await loadImage(url);
      if (!imgEl && !gifAnim) throw new Error('지원하지 않거나 손상된 이미지입니다.');
      render();
    } catch (error) { toast(`이미지 불러오기 실패: ${error.message}`); }
  };
  $('btn-image-clear').onclick = async () => {
    state.image.dataUrl = null; await loadImage(null); render();
  };
  $('img-scale').oninput = (e) => { state.image.scale = +e.target.value; render(); };
  $('img-radius').oninput = (e) => { state.image.radius = +e.target.value; render(); };
  $('img-fit').onchange = (e) => {
    state.image.fit = e.target.value;
    state.image.x = 0; state.image.y = 0; // 기준 변경 시 위치 리셋
    updateFitUI(); render();
  };
  $('img-shape').onchange = (e) => { state.image.shape = e.target.value; updateConditionalControls(); render(); };
  $('layer-top').onchange = (e) => { state.layerTop = e.target.value; render(); };
  $('img-slant').oninput = (e) => { state.image.slant = +e.target.value; render(); };

  // 슬라이더 ↔ 숫자 입력 페어
  function pair(sliderId, numId, setter) {
    const sl = $(sliderId), num = $(numId);
    if (!sl || !num) return;
    const apply = (v) => {
      v = Math.round(+v) || 0;
      sl.value = v; num.value = v;
      setter(v); render();
    };
    sl.oninput = (e) => apply(e.target.value);
    num.onchange = (e) => apply(e.target.value);
  }
  $('img-panel-x').onchange = (e) => { state.image.panelX = +e.target.value; render(); };
  $('img-panel-y').onchange = (e) => { state.image.panelY = +e.target.value; render(); };
  $('img-rotation-reset').onclick = () => {
    state.image.panelRotate = 0;
    render(); syncPanelTransformControls();
    toast('이미지 패널 회전만 초기화했습니다.');
  };
  $('img-reset').onclick = () => {
    Object.assign(state.image, { panelX: null, panelY: null, panelRotate: 0, width: 0.4, hFrac: 1, pX: 0, pY: 0 });
    syncControls(); render();
    toast('이미지 패널 위치·크기·회전을 초기화했습니다.');
  };
  $('img-crop-center').onclick = () => {
    state.image.x = 0; state.image.y = 0;
    render();
    toast('사진을 패널 중앙에 맞췄습니다.');
  };
  $('img-crop-reset').onclick = () => {
    Object.assign(state.image, { x: 0, y: 0, scale: 1, rotate: 0, mirrorX: false });
    syncControls(); render();
    toast('사진 크롭을 초기화했습니다.');
  };
  $('img-sh-c').oninput = (e) => { state.image.shadowColor = e.target.value; render(); };
  $('img-sh-a').oninput = (e) => { state.image.shadowAlpha = +e.target.value; render(); };
  $('img-sh-blur').oninput = (e) => { state.image.shadowBlur = +e.target.value; render(); };
  $('img-sh-y').oninput = (e) => { state.image.shadowY = +e.target.value; render(); };
  $('img-frame').onchange = (e) => { state.image.frame = e.target.value; updateConditionalControls(); render(); };
  $('img-frame-c').oninput = (e) => { state.image.frameColor = e.target.value; colorsDirty = true; render(); };
  $('img-frame-c2').oninput = (e) => { state.image.frameColor2 = e.target.value; colorsDirty = true; render(); };
  $('img-frame-w').oninput = (e) => { state.image.frameWidth = +e.target.value; render(); };
  $('img-shadow').onchange = (e) => { state.image.shadow = e.target.checked; render(); };

  $('btn-add-text').onclick = () => {
    if (state.texts.length >= MAX_TEXTS) return;
    const t = newTextEl();
    t.x = state.card.width / 2;
    t.y = state.card.height / 2 + state.texts.length * 38;
    t.align = 'center';
    state.texts.push(t);
    renderTexts(); render();
  };

  // 사양 패널(내용 층)
  $('sp-on').onchange = (e) => { state.specPanel.on = e.target.checked; render(); };
  $('sp-fill').oninput = (e) => { state.specPanel.fill = e.target.value; render(); };
  $('sp-alpha').oninput = (e) => { state.specPanel.alpha = +e.target.value; render(); };
  $('sp-radius').oninput = (e) => { state.specPanel.radius = +e.target.value; render(); };
  $('sp-shape').onchange = (e) => { state.specPanel.shape = e.target.value; updateConditionalControls(); render(); };
  $('sp-slant').oninput = (e) => { state.specPanel.slant = +e.target.value; render(); };
  $('sp-pad-x').oninput = (e) => { state.specPanel.padX = +e.target.value; render(); };
  $('sp-pad-y').oninput = (e) => { state.specPanel.padY = +e.target.value; render(); };
  $('sp-border').onchange = (e) => { state.specPanel.border = e.target.checked; render(); };
  $('sp-border-c').oninput = (e) => { state.specPanel.borderColor = e.target.value; render(); };
  $('sp-shadow').onchange = (e) => { state.specPanel.shadow = e.target.checked; render(); };

  // 밴드 (가로 띠 / 팝업 / 포스트잇 / 말풍선) — 탭으로 선택된 밴드를 편집
  $('band-on').onchange = (e) => { curBand().on = e.target.checked; renderBandTabs(); render(); };
  $('band-style').onchange = (e) => { curBand().style = e.target.value; updateBandUI(); render(); };
  $('band-pos').onchange = (e) => { curBand().pos = e.target.value; render(); };
  $('band-h').oninput = (e) => { curBand().height = +e.target.value; render(); };
  $('band-w').oninput = (e) => { curBand().width = +e.target.value; render(); };
  $('band-radius').oninput = (e) => { curBand().radius = +e.target.value; render(); };
  $('band-rotate').oninput = (e) => { curBand().rotate = +e.target.value; render(); };
  $('band-tail').onchange = (e) => { curBand().tail = e.target.value; render(); };
  $('band-fill').oninput = (e) => { curBand().fill = e.target.value; render(); };
  $('band-alpha').oninput = (e) => { curBand().alpha = +e.target.value; render(); };
  $('band-pattern').onchange = (e) => { curBand().pattern = e.target.value; render(); };
  $('band-pattern-c').oninput = (e) => { curBand().patternColor = e.target.value; render(); };
  $('band-pattern-a').oninput = (e) => { curBand().patternAlpha = +e.target.value; render(); };
  $('band-border').onchange = (e) => { curBand().border = e.target.value; render(); };
  $('band-border-c').oninput = (e) => { curBand().borderColor = e.target.value; render(); };
  $('band-border-w').oninput = (e) => { curBand().borderWidth = +e.target.value; render(); };

  // 사양 패널 패턴
  $('sp-pattern').onchange = (e) => { state.specPanel.pattern = e.target.value; render(); };
  $('sp-pattern-c').oninput = (e) => { state.specPanel.patternColor = e.target.value; render(); };
  $('sp-pattern-a').oninput = (e) => { state.specPanel.patternAlpha = +e.target.value; render(); };

  $('deco-style').onchange = (e) => { state.deco.style = e.target.value; render(); };

  $('bg-style').onchange = (e) => { state.card.bgStyle = e.target.value; updateConditionalControls(); render(); };
  $('deco-on').onchange = (e) => { state.deco.on = e.target.checked; render(); };
  $('deco-color').oninput = (e) => { state.deco.color = e.target.value; render(); };
  $('deco-inset').oninput = (e) => { state.deco.inset = +e.target.value; render(); };
  $('deco-width').oninput = (e) => { state.deco.width = +e.target.value; render(); };
  $('clip-glow').onchange = (e) => { state.card.clipGlow = e.target.checked; render(); updatePreviewInfo(); };
  $('export-bg').onchange = (e) => { state.card.exportBg = e.target.value; render(); };

  $('font-family').onchange = (e) => { state.text.fontFamily = e.target.value; render(); };
  $('btn-load-fonts').onclick = loadSystemFonts;
  $('bg-pattern').onchange = (e) => { state.card.pattern = e.target.value; render(); };
  $('pattern-color').oninput = (e) => { state.card.patternColor = e.target.value; render(); };
  $('pattern-alpha').oninput = (e) => { state.card.patternAlpha = +e.target.value; render(); };
  document.querySelectorAll('button.theme').forEach((b) => {
    b.onclick = async () => {
      if (colorsDirty) {
        const go = await confirmBox('테마를 적용하면 직접 바꾼 색상이 초기화됩니다. 계속하시겠습니까?');
        if (!go) return;
      }
      applyTheme(b.dataset.theme);
    };
  });

  // 테마가 덮어쓰는 색상들 — 수동 변경 시 dirty 표시
  $('c-label').oninput = (e) => { state.text.labelColor = e.target.value; colorsDirty = true; render(); };
  $('c-value').oninput = (e) => { state.text.valueColor = e.target.value; colorsDirty = true; render(); };

  // 사양 글자 효과 (라벨/값 각각 그라디언트·그림자)
  $('lbl-bold').onchange = (e) => { state.text.labelBold = e.target.checked; render(); };
  $('val-bold').onchange = (e) => { state.text.valueBold = e.target.checked; render(); };
  $('lbl-grad').onchange = (e) => { state.text.labelGrad = e.target.checked; render(); };
  $('c-label2').oninput = (e) => { state.text.labelColor2 = e.target.value; render(); };
  $('lbl-shadow').onchange = (e) => { state.text.labelShadow = e.target.checked; render(); };
  $('lbl-sh-c').oninput = (e) => { state.text.labelShadowColor = e.target.value; render(); };
  $('val-grad').onchange = (e) => { state.text.valueGrad = e.target.checked; render(); };
  $('c-value2').oninput = (e) => { state.text.valueColor2 = e.target.value; render(); };
  $('val-shadow').onchange = (e) => { state.text.valueShadow = e.target.checked; render(); };
  $('val-sh-c').oninput = (e) => { state.text.valueShadowColor = e.target.value; render(); };
  $('c-bg1').oninput = (e) => { state.card.bg1 = e.target.value; colorsDirty = true; render(); };
  $('c-bg2').oninput = (e) => { state.card.bg2 = e.target.value; colorsDirty = true; render(); };
  $('bg-angle').oninput = (e) => { state.card.bgAngle = +e.target.value; render(); };
  $('c-border').oninput = (e) => { state.card.borderColor = e.target.value; colorsDirty = true; render(); };
  $('c-border2').oninput = (e) => { state.card.borderColor2 = e.target.value; render(); };
  $('border-style').onchange = (e) => { state.card.borderStyle = e.target.value; render(); };
  $('border-w').oninput = (e) => { state.card.borderWidth = +e.target.value; render(); };
  $('radius').oninput = (e) => { state.card.radius = +e.target.value; render(); };
  $('font-size').oninput = (e) => { state.text.fontSize = +e.target.value; render(); };

  // 카드 크기: 슬라이더 ↔ 숫자 입력 동기화
  const setCardW = (v) => {
    v = Math.max(300, Math.min(2400, Math.round(v) || 850));
    state.card.width = v; $('card-w').value = v; $('card-w-num').value = v; render();
  };
  const setCardH = (v) => {
    v = Math.max(120, Math.min(1200, Math.round(v) || 300));
    state.card.height = v; $('card-h').value = v; $('card-h-num').value = v; render();
  };
  $('card-w').oninput = (e) => setCardW(+e.target.value);
  $('card-h').oninput = (e) => setCardH(+e.target.value);
  $('card-w-num').onchange = (e) => setCardW(+e.target.value);
  $('card-h-num').onchange = (e) => setCardH(+e.target.value);

  $('corner').onchange = (e) => { state.card.corner = e.target.value; updateConditionalControls(); render(); };
  $('label-w').oninput = (e) => { state.text.labelWidth = +e.target.value; render(); };
  $('spec-x-num').onchange = (e) => { state.specPanel.x = +e.target.value; render(); };
  $('spec-y-num').onchange = (e) => { state.specPanel.y = +e.target.value; render(); };
  $('spec-spacing').oninput = (e) => { state.text.spacing = +e.target.value; render(); };
  $('spec-rotation-reset').onclick = () => {
    state.specPanel.rotate = 0;
    render(); syncPanelTransformControls();
    toast('사양 패널 회전만 초기화했습니다.');
  };
  $('spec-reset').onclick = () => {
    state.text.offX = 34; state.text.offY = 0;
    Object.assign(state.specPanel, { x: null, y: null, width: null, height: null, rotate: 0 });
    syncControls(); render();
    toast('사양 패널 위치·크기·회전을 초기화했습니다.');
  };
  $('columns').onchange = (e) => { state.text.columns = +e.target.value; updateConditionalControls(); render(); };
  $('autofit').onchange = (e) => { state.text.autofit = e.target.checked; updateAutofitUI(); render(); };
  $('c-uniform').onchange = (e) => { state.text.uniform = e.target.checked; renderRows(); render(); };

  $('design-name').oninput = (e) => { state.name = e.target.value; setDirty(true); };

  $('btn-save').onclick = () => saveCurrentDesign(false);
  $('btn-save-as').onclick = () => saveCurrentDesign(true);
  $('btn-new').onclick = async () => {
    if (dirty && !(await confirmBox('저장하지 않은 변경사항을 닫고 새 디자인을 만들까요?'))) return;
    changeTracking = false;
    state = V2.normalizeState(defaultState(), defaultState()); colorsDirty = false;
    await loadImage(null); // 정지 이미지·움짤 모두 정리
    await loadBackgroundImage(null);
    selected = null;
    syncControls(); renderRows(); renderTexts(); render(); syncPanelTransformControls();
    changeTracking = true;
    await markSaved();
    toast('새 디자인');
  };
  $('btn-export').onclick = () => openExportDialog('png');
  $('btn-export-webp').onclick = () => openExportDialog('webp');

  // 움직임 효과 추가
  $('btn-add-fx').onclick = () => {
    state.fxs = state.fxs || [];
    if (state.fxs.length >= MAX_FX) return;
    state.fxs.push({ id: makeId('fx'), type: 'sparkle', enabled: true, layer: 'background',
      direction: 1, opacity: 0.45, speed: 1, density: 0.35, color: '#ffffff' });
    renderFxs(); render(); ensureAnim();
  };
  const fxPause = $('btn-fx-pause');
  if (fxPause) fxPause.onclick = () => {
    fxPaused = !fxPaused;
    fxPauseAt = performance.now();
    fxPause.setAttribute('aria-pressed', String(fxPaused));
    fxPause.textContent = fxPaused ? '▶ 미리보기 재생' : '⏸ 미리보기 일시정지';
    if (fxPaused) stopAnim(); else ensureAnim();
    render(fxPauseAt);
  };

  // 실행 취소 / 다시 실행
  $('btn-undo').onclick = () => restoreHist(histPos - 1);
  $('btn-redo').onclick = () => restoreHist(histPos + 1);

  // 상단바 — 저장된 디자인 드롭다운
  const dpop = $('design-pop');
  $('btn-designs').onclick = (e) => {
    e.stopPropagation();
    dpop.classList.toggle('hidden');
  };
  document.addEventListener('click', (e) => {
    if (!dpop.classList.contains('hidden') && !dpop.contains(e.target) && e.target.id !== 'btn-designs') {
      dpop.classList.add('hidden');
    }
  });

  const bindValue = (id, apply, eventName = 'input') => {
    const el = $(id);
    if (el) el.addEventListener(eventName, (e) => { apply(e.target); render(); });
  };
  bindValue('column-break', (el) => { state.text.columnBreak = +el.value; });
  bindValue('column-gap', (el) => { state.text.columnGap = +el.value; });
  bindValue('item-gap', (el) => { state.text.itemGap = +el.value; });
  bindValue('inner-line-gap', (el) => { state.text.innerLineGap = +el.value; });
  bindValue('value-gap', (el) => { state.text.valueGap = +el.value; });
  bindValue('wrap-width', (el) => { state.text.wrapWidth = +el.value; });
  bindValue('label-align', (el) => { state.text.labelAlign = el.value; }, 'change');
  bindValue('value-align', (el) => { state.text.valueAlign = el.value; }, 'change');
  bindValue('column-valign', (el) => { state.text.columnVAlign = el.value; }, 'change');

  bindValue('deco-alpha', (el) => { state.deco.alpha = +el.value; });
  bindValue('sp-border-w', (el) => { state.specPanel.borderWidth = +el.value; });
  bindValue('sp-sh-color', (el) => { state.specPanel.shadowColor = el.value; });
  bindValue('sp-sh-alpha', (el) => { state.specPanel.shadowAlpha = +el.value; });
  bindValue('sp-sh-blur', (el) => { state.specPanel.shadowBlur = +el.value; });
  bindValue('sp-sh-x', (el) => { state.specPanel.shadowX = +el.value; });
  bindValue('sp-sh-y', (el) => { state.specPanel.shadowY = +el.value; });

  bindValue('pattern-scale', (el) => { state.card.patternScale = +el.value; });
  bindValue('pattern-rotate', (el) => { state.card.patternRotate = +el.value; });
  bindValue('pattern-line-w', (el) => { state.card.patternLineWidth = +el.value; });
  bindValue('pattern-x', (el) => { state.card.patternX = +el.value; });
  bindValue('pattern-y', (el) => { state.card.patternY = +el.value; });
  bindValue('border-angle', (el) => { state.card.borderAngle = +el.value; });
  bindValue('border-dash', (el) => { state.card.borderDash = +el.value; });
  bindValue('border-gap', (el) => { state.card.borderGap = +el.value; });
  bindValue('border-glow', (el) => { state.card.borderGlow = +el.value; });
  bindValue('export-bg2', (el) => { state.card.exportBg2 = el.value; });

  bindValue('img-x', (el) => { state.image.x = +el.value; });
  bindValue('img-y', (el) => { state.image.y = +el.value; });
  bindValue('img-rotate', (el) => { state.image.rotate = +el.value; });
  bindValue('img-opacity', (el) => { state.image.opacity = +el.value; });
  bindValue('img-brightness', (el) => { state.image.brightness = +el.value; });
  bindValue('img-contrast', (el) => { state.image.contrast = +el.value; });
  bindValue('img-saturation', (el) => { state.image.saturation = +el.value; });
  bindValue('img-mirror-x', (el) => { state.image.mirrorX = el.checked; }, 'change');
  bindValue('img-edit-mode', (el) => { state.image.editMode = el.value; }, 'change');
  bindValue('img-sh-x', (el) => { state.image.shadowX = +el.value; });

  bindValue('bg-image-opacity', (el) => { state.card.bgImageOpacity = +el.value; });
  bindValue('bg-image-blur', (el) => { state.card.bgImageBlur = +el.value; });
  bindValue('bg-image-dim', (el) => { state.card.bgImageDim = +el.value; });
  bindValue('bg-image-x', (el) => { state.card.bgImageX = +el.value; });
  bindValue('bg-image-y', (el) => { state.card.bgImageY = +el.value; });
  bindValue('bg-image-scale', (el) => { state.card.bgImageScale = +el.value; });
  bindValue('band-shadow', (el) => { curBand().shadow = el.checked; }, 'change');
  bindValue('band-sh-color', (el) => { curBand().shadowColor = el.value; });
  bindValue('band-sh-alpha', (el) => { curBand().shadowAlpha = +el.value; });
  bindValue('band-sh-blur', (el) => { curBand().shadowBlur = +el.value; });
  bindValue('band-sh-x', (el) => { curBand().shadowX = +el.value; });
  bindValue('band-sh-y', (el) => { curBand().shadowY = +el.value; });

  const bgPick = $('btn-image-bg');
  if (bgPick) bgPick.onclick = async () => {
    try {
      const url = await window.api.pickImage();
      if (!url) return;
      state.card.bgImageDataUrl = url;
      await loadBackgroundImage(url);
      setBackgroundDragMode(true);
      render();
      toast('배경 이미지를 넣었습니다. 미리보기에서 바로 끌어 위치를 맞추세요.');
    } catch (error) { toast(`배경 이미지 실패: ${error.message}`); }
  };
  const bgClear = $('btn-image-bg-clear');
  if (bgClear) bgClear.onclick = async () => {
    state.card.bgImageDataUrl = null;
    setBackgroundDragMode(false);
    await loadBackgroundImage(null); render();
  };
  const bgDrag = $('btn-bg-drag');
  if (bgDrag) bgDrag.onclick = () => setBackgroundDragMode(!bgImageDragMode);
  const bgReset = $('btn-bg-position-reset');
  if (bgReset) bgReset.onclick = () => {
    state.card.bgImageX = 0; state.card.bgImageY = 0;
    syncBackgroundPositionControls(); render();
    toast('배경 이미지 위치를 가운데 기준으로 초기화했습니다.');
  };
  const projectOut = $('btn-project-export');
  if (projectOut) projectOut.onclick = async () => {
    try {
      const path = await window.api.exportProject(V2.clone(state));
      if (path) toast('편집 프로젝트를 저장했습니다.');
    } catch (error) { toast(`프로젝트 저장 실패: ${error.message}`); }
  };
  const projectIn = $('btn-project-import');
  if (projectIn) projectIn.onclick = async () => {
    try {
      const result = await window.api.importProject();
      if (!result) return;
      if (dirty && !(await confirmBox('현재 변경사항을 닫고 프로젝트를 불러올까요?'))) return;
      await applyLoadedState(result.state, null);
      setDirty(false);
      toast('프로젝트를 불러왔습니다.');
    } catch (error) { toast(`프로젝트 열기 실패: ${error.message}`); }
  };
  const paste = $('btn-paste-image');
  if (paste) paste.onclick = async () => {
    const url = await window.api.pasteImage();
    if (!url) { toast('클립보드에 이미지가 없습니다.'); return; }
    state.image.dataUrl = url; state.image.x = 0; state.image.y = 0;
    await loadImage(url); render();
  };
  const copy = $('btn-copy-image');
  if (copy) copy.onclick = async () => {
    try {
      const dataUrl = await renderPngDataUrl({ boundary: 'fixed', scale: 1, bg: 'transparent', frame: 0 });
      await window.api.copyImage(dataUrl);
      toast('카드 이미지를 클립보드에 복사했습니다.');
    } catch (error) { toast(`이미지 복사 실패: ${error.message}`); }
  };
}

// 자동 맞춤 켜짐 → 글자 크기/줄 간격 수동 조절 비활성
function updateAutofitUI() {
  const size = document.getElementById('font-size');
  if (size) size.title = state.text.autofit ? '자동 맞춤의 시작 글자 크기' : '글자 크기';
}

// 크기(scale)는 '자유 배치'에서만 의미 있음
function updateFitUI() {
  const scale = document.getElementById('img-scale');
  if (scale) scale.disabled = state.image.fit !== 'free';
}

function setControlDisabled(id, disabled, reason = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.disabled = !!disabled;
  if (el._numEl) el._numEl.disabled = !!disabled;
  const label = el.closest('label');
  if (label) {
    label.classList.toggle('control-disabled', !!disabled);
    label.title = disabled ? reason : '';
  }
}

function updateConditionalControls() {
  const imageShape = state.image.shape || 'rect';
  setControlDisabled('radius', state.card.corner !== 'round', '모서리 모양을 “둥글게”로 선택하면 조절할 수 있습니다.');
  setControlDisabled('img-slant', !['diag', 'trape', 'para'].includes(imageShape), '대각선 분할, 사다리꼴, 평행사변형에서만 사용합니다.');
  setControlDisabled('img-radius', imageShape !== 'round', '패널 모양을 “둥근 사각 프레임”으로 선택하면 조절할 수 있습니다.');
  setControlDisabled('sp-slant', state.specPanel.shape !== 'para', '평행사변형 패널 배경에서만 사용합니다.');
  setControlDisabled('sp-radius', state.specPanel.shape !== 'round', '패널 배경 모양을 “둥근 사각형”으로 선택하면 조절할 수 있습니다.');
  setControlDisabled('img-frame-c2', state.image.frame !== 'gradient', '그라디언트 프레임에서만 두 번째 색을 사용합니다.');
  setControlDisabled('c-bg2', state.card.bgStyle === 'solid', '단색 배경에서는 두 번째 색을 사용하지 않습니다.');
  setControlDisabled('bg-angle', state.card.bgStyle !== 'gradient', '선형 그라디언트에서만 각도를 사용합니다.');

  const twoColumns = Number(state.text.columns) === 2;
  const columnWrap = document.getElementById('two-column-controls');
  if (columnWrap) columnWrap.classList.toggle('control-disabled', !twoColumns);
  setControlDisabled('column-break', !twoColumns, '2열 구성에서만 오른쪽 열 시작점을 사용합니다.');
  setControlDisabled('column-gap', !twoColumns, '2열 구성에서만 열 간격을 사용합니다.');
}

function syncBackgroundPositionControls() {
  const x = document.getElementById('bg-image-x');
  const y = document.getElementById('bg-image-y');
  if (x) x.value = Math.round(state.card.bgImageX || 0);
  if (y) y.value = Math.round(state.card.bgImageY || 0);
}

function updateBackgroundImageUI() {
  const hasImage = !!state.card.bgImageDataUrl;
  if (!hasImage) bgImageDragMode = false;
  const dragButton = document.getElementById('btn-bg-drag');
  const resetButton = document.getElementById('btn-bg-position-reset');
  if (dragButton) {
    dragButton.disabled = !hasImage;
    dragButton.classList.toggle('toggle-active', hasImage && bgImageDragMode);
    dragButton.setAttribute('aria-pressed', String(hasImage && bgImageDragMode));
    dragButton.textContent = bgImageDragMode ? '위치 조정 끝내기' : '미리보기에서 위치 조정';
  }
  if (resetButton) resetButton.disabled = !hasImage;
  updateCanvasCursor();
}

function setBackgroundDragMode(enabled) {
  bgImageDragMode = !!enabled && !!state.card.bgImageDataUrl;
  if (bgImageDragMode) selected = null;
  updateBackgroundImageUI();
  render();
}

function syncPanelTransformControls() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el && Number.isFinite(value)) el.value = Math.round(value);
  };
  const iw = state.card.width * state.image.width;
  const ih = state.card.height * state.image.hFrac;
  const ix = state.image.panelX == null
    ? (state.image.side === 'left' ? 0 : state.card.width - iw) + (state.image.pX || 0)
    : state.image.panelX;
  const iy = state.image.panelY == null
    ? (state.card.height - ih) / 2 + (state.image.pY || 0)
    : state.image.panelY;
  set('img-panel-x', ix);
  set('img-panel-y', iy);

  const specBox = hit.specBase;
  const sx = state.specPanel.x == null
    ? (specBox ? specBox.x : state.text.offX - (state.specPanel.padX || 0))
    : state.specPanel.x;
  const sy = state.specPanel.y == null
    ? (specBox ? specBox.y : state.text.offY)
    : state.specPanel.y;
  set('spec-x-num', sx);
  set('spec-y-num', sy);
}

function refreshColumnBreakOptions() {
  const select = document.getElementById('column-break');
  if (!select) return;
  const rows = state.rows || [];
  const previous = Math.max(1, Math.min(Math.max(1, rows.length - 1), Number(state.text.columnBreak) || Math.ceil(rows.length / 2)));
  select.innerHTML = '';
  if (rows.length < 2) {
    const option = document.createElement('option');
    option.value = '1'; option.textContent = '항목이 2개 이상 필요합니다.';
    select.appendChild(option);
    return;
  }
  for (let index = 1; index < rows.length; index++) {
    const option = document.createElement('option');
    option.value = String(index);
    const name = String(rows[index].label || '이름 없는 항목').trim();
    option.textContent = `${index + 1}번째 ${name}부터 오른쪽`;
    select.appendChild(option);
  }
  state.text.columnBreak = previous;
  select.value = String(previous);
}

// ---------------- 밴드 선택 (최대 3개, 탭으로 전환) ----------------
const MAX_BANDS = 12;
let bandSel = 0; // 현재 편집 중인 밴드 인덱스
function curBand() {
  if (!state.bands || !state.bands.length) state.bands = [newBand()];
  if (bandSel >= state.bands.length) bandSel = 0;
  return state.bands[bandSel];
}
function renderBandTabs() {
  const wrap = document.getElementById('band-tabs');
  if (!wrap) return;
  curBand(); // bandSel 범위 보정
  wrap.innerHTML = '';
  state.bands.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.textContent = `밴드 ${i + 1}${b.on ? '' : ' ·꺼짐'}`;
    if (i === bandSel) btn.className = 'primary';
    btn.onclick = () => { bandSel = i; renderBandTabs(); syncBandControls(); };
    wrap.appendChild(btn);
  });
  if (state.bands.length < MAX_BANDS) {
    const add = document.createElement('button');
    add.className = 'ghost'; add.textContent = '＋'; add.title = '밴드 추가';
    add.onclick = () => {
      const nb = newBand();
      nb.on = true; nb.style = 'float';
      state.bands.push(nb);
      bandSel = state.bands.length - 1;
      renderBandTabs(); syncBandControls(); render();
    };
    wrap.appendChild(add);
  }
  if (state.bands.length > 1) {
    const del = document.createElement('button');
    del.className = 'ghost'; del.textContent = '🗑'; del.title = '현재 밴드 삭제';
    del.onclick = () => {
      state.bands.splice(bandSel, 1);
      bandSel = 0;
      renderBandTabs(); syncBandControls(); render();
    };
    wrap.appendChild(del);
  }
}
function syncBandControls() {
  const b = curBand(), $ = (id) => document.getElementById(id);
  $('band-on').checked = !!b.on;
  $('band-style').value = b.style || 'strip';
  $('band-pos').value = b.pos;
  $('band-h').value = b.height;
  $('band-w').value = b.width || 280;
  $('band-radius').value = b.radius != null ? b.radius : 14;
  $('band-rotate').value = b.rotate != null ? b.rotate : -3;
  $('band-tail').value = b.tail || 'bl';
  $('band-fill').value = b.fill;
  $('band-alpha').value = b.alpha;
  $('band-pattern').value = b.pattern || 'none';
  $('band-pattern-c').value = b.patternColor;
  $('band-pattern-a').value = b.patternAlpha;
  $('band-border').value = b.border || 'none';
  $('band-border-c').value = b.borderColor;
  $('band-border-w').value = b.borderWidth;
  const put = (id, value, checked = false) => {
    const el = $(id); if (!el) return;
    if (checked) el.checked = !!value; else el.value = value;
  };
  put('band-shadow', b.shadow !== false, true);
  put('band-sh-color', b.shadowColor || '#000000');
  put('band-sh-alpha', b.shadowAlpha == null ? 0.28 : b.shadowAlpha);
  put('band-sh-blur', b.shadowBlur == null ? 10 : b.shadowBlur);
  put('band-sh-x', b.shadowX || 0); put('band-sh-y', b.shadowY == null ? 4 : b.shadowY);
  updateBandUI();
  refreshRangeNums();
}
// 밴드 형태별로 관련 컨트롤만 활성화
function updateBandUI() {
  const st = curBand().style || 'strip';
  const $ = (id) => document.getElementById(id);
  $('band-pos').disabled = st !== 'strip';
  $('band-w').disabled = st === 'strip';
  $('band-radius').disabled = !(st === 'float' || st === 'bubble'); // 타원·하트·별은 둥글기 무관
  $('band-rotate').disabled = st !== 'postit';
  $('band-tail').disabled = st !== 'bubble';
}

function refreshObjectEditors() {
  renderTexts();
  renderStickers();
  renderBandTabs();
  syncBandControls();
}

function duplicateSelected() {
  if (!selected || !['text', 'sticker', 'band'].includes(selected.kind)) return;
  const list = selected.kind === 'text' ? state.texts : selected.kind === 'sticker' ? state.stickers : state.bands;
  const limit = selected.kind === 'text' ? MAX_TEXTS : selected.kind === 'sticker' ? MAX_STICKERS : MAX_BANDS;
  if (list.length >= limit) { toast(`최대 ${limit}개까지 추가할 수 있습니다.`); return; }
  const source = list[selected.idx];
  if (!source) return;
  const copy = V2.clone(source);
  copy.id = makeId(selected.kind);
  copy.x = (copy.x == null ? state.card.width / 2 : copy.x) + 18;
  copy.y = (copy.y == null ? state.card.height / 2 : copy.y) + 18;
  copy.locked = false;
  list.splice(selected.idx + 1, 0, copy);
  selected.idx += 1;
  refreshObjectEditors(); render();
}

function applySelectionField(field, value) {
  const obj = selectedObject();
  if (!obj || !selected || obj.locked) return;
  const n = Number(value);
  if (!Number.isFinite(n)) return;
  if (field === 'x') {
    if (selected.kind === 'image') obj.panelX = n;
    else if (selected.kind === 'spec') obj.x = n;
    else obj.x = n;
  } else if (field === 'y') {
    if (selected.kind === 'image') obj.panelY = n;
    else if (selected.kind === 'spec') obj.y = n;
    else obj.y = n;
  } else if (field === 'w') {
    if (selected.kind === 'image') obj.width = Math.max(0.05, Math.min(1, n / state.card.width));
    else if (selected.kind === 'spec') obj.width = Math.max(40, n);
    else if (selected.kind === 'band') obj.width = Math.max(40, n);
    else if (selected.kind === 'sticker') obj.size = Math.max(8, n);
    else if (selected.kind === 'text') obj.boxWidth = Math.max(0, n);
  } else if (field === 'h') {
    if (selected.kind === 'image') obj.hFrac = Math.max(0.05, Math.min(1, n / state.card.height));
    else if (selected.kind === 'spec') obj.height = Math.max(30, n);
    else if (selected.kind === 'band') obj.height = Math.max(20, n);
    else if (selected.kind === 'sticker') obj.size = Math.max(8, n);
    else if (selected.kind === 'text') obj.size = Math.max(10, Math.min(240, n / Math.max(1, obj.lineHeight || 1.15)));
  } else if (field === 'rotate') {
    if (selected.kind === 'image') obj.panelRotate = Math.max(-180, Math.min(180, n));
    else obj.rotate = Math.max(-180, Math.min(180, n));
  } else if (field === 'opacity' && selected.kind !== 'spec') {
    if (selected.kind === 'band') obj.alpha = Math.max(0, Math.min(1, n));
    else obj.opacity = Math.max(0, Math.min(1, n));
  }
  refreshObjectEditors(); render();
}

function bindSelectionControls() {
  // 별도 레이어 패널 없이, 선택한 요소는 방향키로 1px(Shift: 10px) 정밀 이동한다.
  window.addEventListener('keydown', (event) => {
    if (!selected || event.ctrlKey || event.metaKey || event.altKey) return;
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const delta = event.shiftKey ? 10 : 1;
    const map = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] };
    if (!map[event.key]) return;
    event.preventDefault();
    const tr = selectionTransform();
    if (!tr) return;
    applySelectionField('x', tr.x + map[event.key][0]);
    applySelectionField('y', tr.y + map[event.key][1]);
  });
}

// 컨트롤 값 → state 반영(불러오기/새로만들기 후 UI 동기화)
function syncControls() {
  const s = state, $ = (id) => document.getElementById(id);
  $('img-scale').value = s.image.scale;
  $('img-radius').value = s.image.radius;
  $('img-fit').value = s.image.fit || 'free';
  $('layer-top').value = s.layerTop || 'spec';
  $('img-shape').value = s.image.shape || 'rect';
  $('img-slant').value = s.image.slant;
  $('img-frame').value = s.image.frame;
  $('img-frame-c').value = s.image.frameColor;
  $('img-frame-c2').value = s.image.frameColor2;
  $('img-frame-w').value = s.image.frameWidth;
  $('img-shadow').checked = !!s.image.shadow;
  $('img-sh-c').value = s.image.shadowColor || '#000000';
  $('img-sh-a').value = s.image.shadowAlpha != null ? s.image.shadowAlpha : 0.45;
  $('img-sh-blur').value = s.image.shadowBlur != null ? s.image.shadowBlur : 22;
  $('img-sh-y').value = s.image.shadowY != null ? s.image.shadowY : 10;
  updateFitUI();
  $('sp-on').checked = !!s.specPanel.on;
  $('sp-fill').value = s.specPanel.fill;
  $('sp-alpha').value = s.specPanel.alpha;
  $('sp-radius').value = s.specPanel.radius;
  $('sp-shape').value = s.specPanel.shape || 'rect';
  $('sp-slant').value = s.specPanel.slant != null ? s.specPanel.slant : 40;
  $('sp-pad-x').value = s.specPanel.padX != null ? s.specPanel.padX : 16;
  $('sp-pad-y').value = s.specPanel.padY != null ? s.specPanel.padY : 16;
  $('sp-border').checked = !!s.specPanel.border;
  $('sp-border-c').value = s.specPanel.borderColor;
  $('sp-shadow').checked = !!s.specPanel.shadow;
  renderBandTabs();
  syncBandControls();
  $('sp-pattern').value = s.specPanel.pattern || 'none';
  $('sp-pattern-c').value = s.specPanel.patternColor;
  $('sp-pattern-a').value = s.specPanel.patternAlpha;
  $('deco-style').value = s.deco.style || 'solid';
  $('bg-style').value = s.card.bgStyle || 'gradient';
  $('deco-on').checked = !!s.deco.on;
  $('deco-color').value = s.deco.color;
  $('deco-inset').value = s.deco.inset;
  $('deco-width').value = s.deco.width;
  $('clip-glow').checked = s.card.clipGlow !== false;
  $('export-bg').value = s.card.exportBg || 'transparent';
  $('c-label').value = s.text.labelColor;
  $('c-value').value = s.text.valueColor;
  $('lbl-bold').checked = s.text.labelBold !== false;
  $('val-bold').checked = s.text.valueBold !== false;
  $('lbl-grad').checked = !!s.text.labelGrad;
  $('c-label2').value = s.text.labelColor2 || '#7c3aed';
  $('lbl-shadow').checked = !!s.text.labelShadow;
  $('lbl-sh-c').value = s.text.labelShadowColor || '#000000';
  $('val-grad').checked = !!s.text.valueGrad;
  $('c-value2').value = s.text.valueColor2 || '#7c3aed';
  $('val-shadow').checked = !!s.text.valueShadow;
  $('val-sh-c').value = s.text.valueShadowColor || '#000000';
  $('c-bg1').value = s.card.bg1;
  $('c-bg2').value = s.card.bg2;
  $('bg-angle').value = s.card.bgAngle;
  $('c-border').value = s.card.borderColor;
  $('c-border2').value = s.card.borderColor2 || '#7c3aed';
  $('border-style').value = s.card.borderStyle || 'solid';
  $('border-w').value = s.card.borderWidth;
  $('radius').value = s.card.radius;
  $('font-size').value = s.text.fontSize;
  $('card-w').value = s.card.width; $('card-w-num').value = s.card.width;
  $('card-h').value = s.card.height; $('card-h-num').value = s.card.height;
  $('corner').value = s.card.corner || 'round';
  $('label-w').value = s.text.labelWidth;
  $('spec-spacing').value = s.text.spacing || 0;
  $('columns').value = s.text.columns || 1;
  $('autofit').checked = !!s.text.autofit;
  $('c-uniform').checked = !!s.text.uniform;
  updateAutofitUI();
  $('font-family').value = s.text.fontFamily;
  $('bg-pattern').value = s.card.pattern || 'none';
  $('pattern-color').value = s.card.patternColor;
  $('pattern-alpha').value = s.card.patternAlpha;
  const put = (id, value, checked = false) => {
    const el = $(id); if (!el) return;
    if (checked) el.checked = !!value; else el.value = value == null ? '' : value;
  };
  put('column-break', s.text.columnBreak); put('column-gap', s.text.columnGap);
  put('item-gap', s.text.itemGap); put('inner-line-gap', s.text.innerLineGap);
  put('value-gap', s.text.valueGap); put('wrap-width', s.text.wrapWidth);
  put('label-align', s.text.labelAlign); put('value-align', s.text.valueAlign); put('column-valign', s.text.columnVAlign);
  put('deco-alpha', s.deco.alpha); put('sp-border-w', s.specPanel.borderWidth);
  put('sp-sh-color', s.specPanel.shadowColor); put('sp-sh-alpha', s.specPanel.shadowAlpha);
  put('sp-sh-blur', s.specPanel.shadowBlur); put('sp-sh-x', s.specPanel.shadowX); put('sp-sh-y', s.specPanel.shadowY);
  put('pattern-scale', s.card.patternScale); put('pattern-rotate', s.card.patternRotate);
  put('pattern-line-w', s.card.patternLineWidth); put('pattern-x', s.card.patternX); put('pattern-y', s.card.patternY);
  put('border-angle', s.card.borderAngle); put('border-dash', s.card.borderDash);
  put('border-gap', s.card.borderGap); put('border-glow', s.card.borderGlow);
  put('export-bg2', s.card.exportBg2 || '#ffffff');
  put('img-x', s.image.x); put('img-y', s.image.y); put('img-rotate', s.image.rotate);
  put('img-opacity', s.image.opacity); put('img-brightness', s.image.brightness);
  put('img-contrast', s.image.contrast); put('img-saturation', s.image.saturation);
  put('img-mirror-x', s.image.mirrorX, true); put('img-edit-mode', s.image.editMode || 'crop'); put('img-sh-x', s.image.shadowX);
  put('bg-image-opacity', s.card.bgImageOpacity); put('bg-image-blur', s.card.bgImageBlur);
  put('bg-image-dim', s.card.bgImageDim); put('bg-image-x', s.card.bgImageX);
  put('bg-image-y', s.card.bgImageY); put('bg-image-scale', s.card.bgImageScale);
  renderFxs();
  renderStickers();
  $('design-name').value = s.name;
  updateConditionalControls();
  updateBackgroundImageUI();
  syncPanelTransformControls();
  refreshRangeNums();
}

// ---------------- 저장 목록 ----------------
async function refreshList() {
  const list = await window.api.listDesigns();
  const ul = document.getElementById('design-list');
  ul.innerHTML = '';
  if (!list.length) { ul.innerHTML = '<li style="color:#777;border:none;background:none">저장된 디자인 없음</li>'; return; }
  for (const d of list) {
    const li = document.createElement('li');
    if (d.thumbnail) {
      const thumbnail = document.createElement('img');
      thumbnail.className = 'design-thumbnail';
      thumbnail.src = d.thumbnail;
      thumbnail.alt = '';
      li.appendChild(thumbnail);
    }
    const name = document.createElement('span');
    name.className = 'name'; name.textContent = d.name; name.title = '불러오기';
    name.onclick = async () => {
      if (dirty && !(await confirmBox('저장하지 않은 변경사항을 닫고 디자인을 불러올까요?'))) return;
      await openDesign(d.file);
      const pop = document.getElementById('design-pop');
      if (pop) pop.classList.add('hidden');
    };
    const x = document.createElement('button');
    x.className = 'x'; x.textContent = '🗑';
    x.onclick = async (ev) => {
      ev.stopPropagation();
      if (!(await confirmBox(`'${d.name}' 디자인을 휴지통으로 보낼까요?`))) return;
      await window.api.deleteDesign(d.file);
      refreshList();
    };
    li.append(name, x);
    ul.appendChild(li);
  }
}

// 저장본(JSON)을 현재 상태로 적용 — 옛 필드 호환 포함
async function applyLoadedState(loaded, file, options = {}) {
  const base = defaultState();
  for (const k of Object.keys(base)) {
    // 양쪽 모두 순수 객체일 때만 병합 — null(typeof 'object')이나 문자열이 섞이면 그대로 대입
    const bothObj = loaded[k] && typeof loaded[k] === 'object' && !Array.isArray(loaded[k])
      && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]);
    if (bothObj) {
      base[k] = Object.assign(base[k], loaded[k]);
    } else if (loaded[k] !== undefined) {
      base[k] = loaded[k];
    }
  }
  // 옛 저장본 호환: 단일 fx → fxs 배열
  if (!Array.isArray(loaded.fxs) && loaded.fx && loaded.fx.type && loaded.fx.type !== 'none') {
    base.fxs = [Object.assign({ speed: 1, density: 0.5, color: '#ffffff' }, loaded.fx)];
  }
  // 삭제된 효과(네온 순환·글로우 펄스·회전 그라디언트)는 걸러냄
  base.fxs = (base.fxs || []).filter((f) => f && f.type);
  // 옛 저장본 호환: 단일 band → bands 배열, 누락 필드는 기본값 채움, 전체 테두리 → 경계선
  if (!Array.isArray(loaded.bands) && loaded.band) {
    base.bands = [Object.assign(newBand(), loaded.band)];
  } else {
    base.bands = (base.bands || []).map((b) => Object.assign(newBand(), b));
    if (!base.bands.length) base.bands = [newBand()];
  }
  base.bands.forEach((b) => { if (b.border === 'full') b.border = 'edge'; });
  bandSel = 0;
  // 옛 저장본의 title/nick → texts로 이관
  if (!Array.isArray(loaded.texts)) base.texts = [];
  if (loaded.title && loaded.title.text) {
    base.texts.push(Object.assign(newTextEl(), {
      text: loaded.title.text, size: loaded.title.size, color: loaded.title.color,
      preset: 'corner', outline: loaded.title.outline, outlineColor: loaded.title.outlineColor,
    }));
  }
  if (loaded.nick && loaded.nick.text) {
    base.texts.push(Object.assign(newTextEl(), {
      text: loaded.nick.text, size: loaded.nick.size, color: loaded.nick.color,
      preset: loaded.nick.preset || 'free', x: loaded.nick.x, y: loaded.nick.y,
      align: loaded.nick.align, outline: loaded.nick.outline, outlineColor: loaded.nick.outlineColor,
    }));
  }
  state = V2.normalizeState(base, defaultState());
  state.file = file || null;
  colorsDirty = false;
  await loadImage(state.image.dataUrl);
  await loadBackgroundImage(state.card.bgImageDataUrl);
  bgImageDragMode = false;
  selected = null;
  changeTracking = false;
  syncControls(); renderRows(); renderTexts(); render(); syncPanelTransformControls();
  changeTracking = true;
  if (options.recovered) setDirty(true);
  else await markSaved();
  ensureAnim();
}

async function openDesign(file) {
  const loaded = await window.api.loadDesign(file);
  await applyLoadedState(loaded, file);
  toast('불러왔어요');
}

function u8ToB64(u8) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  }
  return btoa(s);
}

// ---------------- WebP(움짤) 내보내기 ----------------
const WEBP_FPS = 30;      // GIF(20fps)와 달리 플리커·팔레트 제약이 없어 프레임을 높임
const WEBP_QUALITY = 0.92;
// 정지 한 장은 무손실로 저장 — 크로미움은 quality가 정확히 1이면 VP8L(무손실)로 인코딩한다.
// 단색 배경 + 글자가 많은 카드에선 글자 주변 번짐(링잉)이 사라지고 용량 차이도 크지 않음.
const WEBP_QUALITY_STILL = 1.0;
// 크로미움 내장 인코더로 프레임을 1장씩 WebP로 만든 뒤,
// 애니메이션 WebP(RIFF: VP8X+ANIM+ANMF…) 컨테이너로 직접 묶는다.
// GIF와 달리 256색 제한·디더링이 없어 그라디언트가 원본 그대로 보존됨.
function wpConcat(list) {
  let n = 0;
  for (const a of list) n += a.length;
  const out = new Uint8Array(n);
  let p = 0;
  for (const a of list) { out.set(a, p); p += a.length; }
  return out;
}
function wpChunk(fourcc, payload) {
  const pad = payload.length & 1;
  const out = new Uint8Array(8 + payload.length + pad);
  for (let i = 0; i < 4; i++) out[i] = fourcc.charCodeAt(i);
  new DataView(out.buffer).setUint32(4, payload.length, true);
  out.set(payload, 8);
  return out;
}
function wp24(arr, off, v) {
  arr[off] = v & 0xff; arr[off + 1] = (v >> 8) & 0xff; arr[off + 2] = (v >> 16) & 0xff;
}
// 단일 WebP 파일에서 이미지 데이터 청크(VP8/VP8L/ALPH)만 뽑아냄
function wpSubChunks(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const out = [];
  let p = 12; // 'RIFF' + size + 'WEBP'
  while (p + 8 <= u8.length) {
    const cc = String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3]);
    const size = dv.getUint32(p + 4, true);
    if (cc === 'VP8 ' || cc === 'VP8L' || cc === 'ALPH') {
      out.push({ cc, data: u8.subarray(p + 8, p + 8 + size) });
    }
    p += 8 + size + (size & 1);
  }
  return out;
}
function buildAnimWebp(frames, W, H, bgHex) {
  let hasAlpha = false;
  const anmfs = [];
  for (const f of frames) {
    const subs = [];
    for (const c of f.chunks) {
      if (c.cc === 'ALPH') hasAlpha = true;
      subs.push(wpChunk(c.cc, c.data));
    }
    const head = new Uint8Array(16);
    wp24(head, 0, 0); wp24(head, 3, 0);          // 프레임 위치 (좌상단)
    wp24(head, 6, W - 1); wp24(head, 9, H - 1);  // 프레임 크기 - 1
    wp24(head, 12, f.delay);                     // 지속 시간(ms)
    head[15] = 0x02;                             // 블렌딩 안 함(덮어쓰기) + 폐기 안 함
    anmfs.push(wpChunk('ANMF', wpConcat([head, wpConcat(subs)])));
  }
  const vp8x = new Uint8Array(10);
  vp8x[0] = 0x02 | (hasAlpha ? 0x10 : 0); // 애니메이션 플래그 (+ 알파)
  wp24(vp8x, 4, W - 1); wp24(vp8x, 7, H - 1);
  const anim = new Uint8Array(6);
  if (bgHex) {
    // 캔버스 배경색 BGRA — 알파를 무시하고 이 색으로 채우는 디코더 대비
    const h = String(bgHex).replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16) || 0;
    anim[0] = n & 255; anim[1] = (n >> 8) & 255; anim[2] = (n >> 16) & 255; anim[3] = 0xff;
  }
  anim[4] = 0; anim[5] = 0; // 무한 반복
  const body = wpConcat([wpChunk('VP8X', vp8x), wpChunk('ANIM', anim), wpConcat(anmfs)]);
  const head = new Uint8Array(12);
  const cc = 'RIFF';
  for (let i = 0; i < 4; i++) head[i] = cc.charCodeAt(i);
  new DataView(head.buffer).setUint32(4, body.length + 4, true);
  const w = 'WEBP';
  for (let i = 0; i < 4; i++) head[8 + i] = w.charCodeAt(i);
  return wpConcat([head, body]);
}

async function exportWebp(options = {}) {
  const progress = options.progress;
  const cancelled = typeof options.cancelled === 'function' ? options.cancelled : () => false;
  const animated = hasMotionSource();
  stopAnim();
  if (!animated) {
    if (progress) progress.value = 25;
    const still = await renderExportCanvas(options);
    const blob = await new Promise((resolve) => still.toBlob(resolve, 'image/webp', 1));
    if (!blob) throw new Error('WebP 인코딩을 지원하지 않는 환경입니다.');
    if (cancelled()) throw new Error('cancelled');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (progress) progress.value = 80;
    const path = await window.api.exportWebp({ dataBase64: u8ToB64(bytes), suggestedName: state.name || 'speccard' });
    if (path) {
      if (progress) progress.value = 100;
      toast(`WebP로 내보냈어요 (정지 이미지 · ${(bytes.length / 1024).toFixed(0)}KB)`);
    }
    return path;
  }

  const duration = Math.max(500, Math.min(12000, Number(options.durationMs) || Math.min(6000, gifAnim ? gifAnim.total : fxLoopMs())));
  const fps = Math.max(8, Math.min(30, Number(options.fps) || WEBP_FPS));
  const quality = Math.max(0.5, Math.min(1, Number(options.quality) || WEBP_QUALITY));
  const frameCount = Math.max(2, Math.round(duration / 1000 * fps));
  const tAt = (index) => Math.round(index * duration / frameCount);
  const frameOptions = { ...options, boundary: options.boundary === 'trim' ? 'include' : options.boundary };
  const frames = [];
  let width = 0, height = 0;
  for (let i = 0; i < frameCount; i++) {
    if (cancelled()) throw new Error('cancelled');
    const frameCanvas = await renderExportCanvas({ ...frameOptions, frame: tAt(i) });
    if (!width) { width = frameCanvas.width; height = frameCanvas.height; }
    if (frameCanvas.width !== width || frameCanvas.height !== height) throw new Error('애니메이션 프레임 크기가 일치하지 않습니다.');
    const blob = await new Promise((resolve) => frameCanvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) throw new Error('WebP 프레임 인코딩에 실패했습니다.');
    const chunks = wpSubChunks(new Uint8Array(await blob.arrayBuffer()));
    if (!chunks.length) throw new Error('WebP 프레임 데이터를 읽지 못했습니다.');
    frames.push({ chunks, delay: tAt(i + 1) - tAt(i) });
    if (progress) progress.value = Math.round(((i + 1) / frameCount) * 85);
    // 긴 출력에서도 취소 버튼과 화면 갱신이 처리될 틈을 준다.
    if (i % 3 === 2) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (cancelled()) throw new Error('cancelled');
  const previousOptions = activeExportOptions;
  activeExportOptions = options;
  const bytes = buildAnimWebp(frames, width, height, exportBgColor());
  activeExportOptions = previousOptions;
  if (progress) progress.value = 92;
  const path = await window.api.exportWebp({ dataBase64: u8ToB64(bytes), suggestedName: state.name || 'speccard' });
  if (path) {
    if (progress) progress.value = 100;
    toast(`WebP로 내보냈어요 (${frameCount}프레임 · ${(bytes.length / 1024).toFixed(0)}KB)`);
  }
  return path;
}

// ---------------- 슬라이더 숫자 표기 · 직접 입력 ----------------
// 패널 안 모든 range 슬라이더 옆에 숫자 입력칸을 자동으로 붙임 (동적 생성분 포함)
function enhanceRange(r) {
  if (r._numEl) return;
  if (r.id && document.getElementById(r.id + '-num')) return; // 전용 숫자칸이 이미 있는 페어는 제외
  const num = document.createElement('input');
  num.type = 'number';
  num.className = 'rng-num';
  if (r.min !== '') num.min = r.min;
  if (r.max !== '') num.max = r.max;
  num.step = r.step || 'any';
  num.value = r.value;
  num.disabled = r.disabled;
  num.onchange = () => {
    let v = parseFloat(num.value);
    if (Number.isNaN(v)) { num.value = r.value; return; }
    const mn = parseFloat(r.min), mx = parseFloat(r.max);
    if (!Number.isNaN(mn)) v = Math.max(mn, v);
    if (!Number.isNaN(mx)) v = Math.min(mx, v);
    num.value = v;
    r.value = v;
    r.dispatchEvent(new Event('input')); // 기존 슬라이더 핸들러 그대로 실행
  };
  r.addEventListener('input', () => { num.value = r.value; });
  r._numEl = num;
  r.insertAdjacentElement('afterend', num);
}
function enhanceAllRanges() {
  document.querySelectorAll('#panel input[type="range"]').forEach(enhanceRange);
}
// 코드로 슬라이더 값을 바꾼 뒤(불러오기 등) 숫자칸 동기화
function refreshRangeNums() {
  document.querySelectorAll('#panel input[type="range"]').forEach((r) => {
    if (r._numEl) {
      r._numEl.value = r.value;
      r._numEl.disabled = r.disabled;
    }
  });
}
function initRangeNums() {
  enhanceAllRanges();
  // 텍스트·효과·스티커 편집기처럼 나중에 생기는 슬라이더도 자동 처리
  new MutationObserver(() => enhanceAllRanges())
    .observe(document.getElementById('panel'), { childList: true, subtree: true });
}

// ---------------- 그룹 접기 (제목 클릭) — 시작 시 모두 접힌 상태 ----------------
function initCollapse() {
  document.querySelectorAll('#panel section.group').forEach((sec) => {
    const h2 = sec.querySelector('h2');
    if (!h2) return;
    sec.classList.add('collapsed');
    h2.onclick = () => sec.classList.toggle('collapsed');
    // 그룹 맨 아래에도 접기 버튼 (긴 그룹을 다 내려본 뒤 바로 접을 수 있게)
    const foot = document.createElement('button');
    foot.className = 'collapse-foot';
    foot.textContent = '▴ 이 그룹 접기';
    foot.onclick = () => {
      sec.classList.add('collapsed');
      sec.scrollIntoView({ block: 'nearest' });
    };
    sec.appendChild(foot);
  });
}

// ---------------- 실행 취소 / 다시 실행 (최대 100단계) ----------------
const HIST_MAX = 100;
let hist = [], histPos = -1, histLock = false, histT = null;
// 상태 서명 — 긴 문자열(이미지 dataURL)은 길이+앞부분만 사용해 비교 비용 절감
function stateSig() {
  return JSON.stringify(state, (k, v) =>
    (typeof v === 'string' && v.length > 256 ? 'S' + v.length + v.slice(0, 24) : v));
}
function pushHist() {
  if (histLock) return;
  const sig = stateSig();
  if (histPos >= 0 && hist[histPos] && hist[histPos].sig === sig) return;
  hist = hist.slice(0, histPos + 1);
  hist.push({ snap: structuredClone(state), sig });
  if (hist.length > HIST_MAX) hist.shift();
  histPos = hist.length - 1;
  updateHistUI();
}
// 변경이 잦은 조작(드래그·슬라이더)은 0.4초 조용해진 뒤 한 번만 기록
function scheduleHist() {
  if (histLock) return;
  clearTimeout(histT);
  histT = setTimeout(pushHist, 400);
}
async function restoreHist(pos) {
  if (pos < 0 || pos >= hist.length || pos === histPos) return;
  clearTimeout(histT);
  histLock = true;
  histPos = pos;
  const prevImg = state.image.dataUrl;
  state = structuredClone(hist[pos].snap);
  if (state.image.dataUrl !== prevImg) await loadImage(state.image.dataUrl);
  bandSel = 0;
  syncControls(); renderRows(); renderTexts(); render(); syncPanelTransformControls(); ensureAnim();
  histLock = false;
  updateHistUI();
}
function updateHistUI() {
  const u = document.getElementById('btn-undo');
  const r = document.getElementById('btn-redo');
  if (u) u.disabled = histPos <= 0;
  if (r) r.disabled = histPos >= hist.length - 1;
}
window.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); restoreHist(histPos - 1); }
  else if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); restoreHist(histPos + 1); }
});

// ---------------- 앱 UI 테마 (라이트/다크) ----------------
const UI_THEME_KEY = 'speccard-ui-theme';

function arrangeEditorSections() {
  const layout = {
    'task-content': ['grp-spec', 'grp-palette', 'grp-card'],
    'task-layout': ['grp-spectext', 'grp-spec-panel', 'grp-spec-typography'],
    'task-style': ['grp-image'],
    'task-elements': ['grp-background', 'grp-border'],
    'task-output': ['grp-texts', 'grp-stickers', 'grp-band', 'grp-fx'],
  };
  for (const [pageId, groupIds] of Object.entries(layout)) {
    const page = document.getElementById(pageId);
    if (!page) continue;
    groupIds.forEach((id) => {
      const group = document.getElementById(id);
      if (group) page.appendChild(group);
    });
    const visibleGroups = [...page.querySelectorAll(':scope > details.group:not([hidden])')];
    visibleGroups.forEach((group) => { group.open = true; });
  }
}

function applyUiTheme(mode) {
  document.body.classList.toggle('dark', mode === 'dark');
  const btn = document.getElementById('btn-ui-theme');
  if (btn) btn.textContent = mode === 'dark' ? '☀' : '🌙';
  localStorage.setItem(UI_THEME_KEY, mode);
}
function initUiTheme() {
  applyUiTheme(localStorage.getItem(UI_THEME_KEY) || 'light');
  document.getElementById('btn-ui-theme').onclick = () => {
    applyUiTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
  };
}

async function offerRecovery() {
  let recovery = null;
  try { recovery = await window.api.readAutosave(); } catch (_) { return; }
  if (!recovery || !recovery.state) return;
  const when = recovery.savedAt ? new Date(recovery.savedAt).toLocaleString('ko-KR') : '이전 실행';
  const restore = await confirmBox(`${when}에 남은 자동 복구본이 있습니다. 이어서 편집할까요?`);
  if (restore) {
    await applyLoadedState(recovery.state, recovery.state.file || null, { recovered: true });
    hist = []; histPos = -1; pushHist();
    toast('자동 복구본을 불러왔습니다. 저장해 확정하세요.');
  } else {
    await window.api.clearAutosave();
    updateSaveStatus('복구본 없음');
  }
}

// ---------------- 시작 ----------------
async function initApp() {
  arrangeEditorSections();
  initUiTheme();
  populatePatternSelects();
  bindControls();
  bindSelectionControls();
  initExportDialog();
  initPalette();
  initFonts();
  syncControls();
  renderRows();
  renderTexts();
  initStickers();
  updateMySpecsUI();
  initRangeNums();
  updateConditionalControls();
  render(performance.now());
  syncPanelTransformControls();
  pushHist(); // 초기 상태를 히스토리 기준점으로
  await refreshList();
  initPreviewInfo();
  initZoom();
  setDirty(false);
  changeTracking = true;
  await offerRecovery();
}

initApp().catch((error) => {
  console.error(error);
  toast(`앱 초기화 실패: ${error.message}`);
});

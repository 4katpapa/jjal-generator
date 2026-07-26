'use strict';

// ---------------- 상태 ----------------
function newBand() {
  return { on: false, style: 'strip', pos: 'bottom', height: 70, fill: '#ffffff', alpha: 0.5,
           width: 280, x: null, y: null, radius: 14, rotate: -3, tail: 'bl',
           pattern: 'none', patternColor: '#ffffff', patternAlpha: 0.15,
           border: 'none', borderColor: '#ffffff', borderWidth: 2 };
}

function defaultState() {
  return {
    name: '',
    file: null, // 저장 파일명 (있으면 덮어쓰기)
    card: { width: 850, height: 300, radius: 18, corner: 'round',
            borderColor: '#e9a8ff', borderWidth: 6, borderStyle: 'solid', borderColor2: '#7c3aed',
            bg1: '#fbe4ff', bg2: '#f3d0ff', bgAngle: 90, bgStyle: 'gradient',
            pattern: 'none', patternColor: '#ffffff', patternAlpha: 0.15 },
    text: { labelColor: '#c026d3', valueColor: '#6b21a8', uniform: true, fontSize: 24,
            offX: 34, offY: 0, rowGap: 4, spacing: 0, labelWidth: 66, columns: 1, autofit: true,
            fontFamily: '"Malgun Gothic","Segoe UI",sans-serif',
            labelBold: true, valueBold: true,
            labelGrad: false, labelColor2: '#7c3aed', labelShadow: false, labelShadowColor: '#000000',
            valueGrad: false, valueColor2: '#7c3aed', valueShadow: false, valueShadowColor: '#000000' },
    image: { dataUrl: null, side: 'right', width: 0.4, scale: 1, x: 0, y: 0,
             radius: 0, fit: 'free', shape: 'rect', slant: 70, flip: false,
             hFrac: 1, pX: 0, pY: 0, frame: 'none', frameColor: '#ffffff',
             frameColor2: '#c026d3', frameWidth: 6,
             shadow: false, shadowColor: '#000000', shadowAlpha: 0.45, shadowBlur: 22, shadowY: 10 },
    layerTop: 'spec', // 사양/이미지 패널이 겹칠 때 위에 그릴 쪽
    shadow: { on: false, color: '#000000', alpha: 0.35, blur: 28, x: 0, y: 14 },
    deco: { on: false, color: '#ffffff', alpha: 0.9, inset: 12, width: 2, style: 'solid' },
    specPanel: { on: false, fill: '#ffffff', alpha: 0.3, radius: 16,
                 shape: 'rect', slant: 40, padX: 16, padY: 16,
                 pattern: 'none', patternColor: '#ffffff', patternAlpha: 0.15,
                 border: false, borderColor: '#ffffff', borderWidth: 2, shadow: false },
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

const MAX_TEXTS = 5;
function newTextEl() {
  return {
    text: '새 텍스트', size: 34, color: '#a12ea1',
    x: null, y: null, align: 'center', fontFamily: '',
    fillType: 'solid', color2: '#7c3aed', gradAngle: 0,
    outline: false, outlineColor: '#ffffff', outlineWidth: 4,
    shadow: false, shadowColor: '#000000',
    // 굵게는 꺼진 상태로 시작 — 켜져 있으면 B를 눌러도 굵어지지 않고 얇아져서 안 먹는 것처럼 보임
    bold: false, italic: false, underline: false, strike: false, spacing: 0,
    vertical: false, // 세로쓰기
  };
}

let state = defaultState();
let imgEl = null;          // 로드된 Image 객체 캐시 (정지 이미지)
let gifAnim = null;        // GIF 움짤: { frames: [{bmp, delay}], total }
let hit = { texts: [] };   // render()가 채우는 히트박스 (드래그용)
let layout = { ox: 0, oy: 0 }; // 캔버스 내 카드 원점(그림자 마진)

// ---------------- 애니메이션 루프 ----------------
let animReq = null;
function needsAnim() {
  return !!gifAnim || (state.fxs && state.fxs.length > 0);
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
  return ((tMs % L) + L) % L / L; // 0..1
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

// 내보내기용: 렌더 배율을 올린 뒤 콜백 실행, 끝나면 화면 배율로 복구
async function withExportRes(fn) {
  RES = EXPORT_RES;
  try {
    return await fn();
  } finally {
    RES = SCREEN_RES;
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
function drawDownscaled(tctx, w, h) {
  let cur = canvas, cw = canvas.width, ch = canvas.height, i = 0;
  while (cw >= w * 2 && ch >= h * 2) {
    const [c, g] = scratchCanvas(i++, Math.max(w, Math.round(cw / 2)), Math.max(h, Math.round(ch / 2)));
    g.drawImage(cur, 0, 0, c.width, c.height);
    cur = c; cw = c.width; ch = c.height;
  }
  tctx.clearRect(0, 0, w, h);
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = 'high';
  tctx.drawImage(cur, 0, 0, w, h);
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
function drawPattern(W, H, type, color, alpha) {
  if (!type || type === 'none' || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  const step = 22;
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
function drawTextEl(t) {
  const fam = t.fontFamily || state.text.fontFamily;
  // 굵게 끔은 400(진짜 보통 굵기) — 500은 대부분 폰트에서 400과 같은 얼굴이라 차이가 안 났음
  const weight = t.bold === false ? 400 : (t.weight || 800);
  const styleP = t.italic ? 'italic ' : '';
  // 세로쓰기: 글자를 위→아래로 한 자씩 쌓음 (x = 세로축 중심, y = 시작 위치)
  if (t.vertical) {
    const chars = [...String(t.text)];
    const lh = t.size * 1.08 + (t.spacing || 0);
    const totalH = Math.max(t.size, chars.length * lh);
    ctx.save();
    ctx.font = `${styleP}${weight} ${t.size}px ${fam}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    if (t.shadow) {
      ctx.shadowColor = hexToRgba(t.shadowColor || '#000000', 0.55);
      ctx.shadowBlur = Math.max(2, t.size * 0.18);
      ctx.shadowOffsetY = 2;
    }
    if (t.outline) {
      ctx.lineWidth = t.outlineWidth || 4;
      ctx.strokeStyle = t.outlineColor || '#ffffff';
      ctx.lineJoin = 'round';
      chars.forEach((ch, i) => ctx.strokeText(ch, t.x, t.y + i * lh));
      if (t.shadow) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
    }
    ctx.fillStyle = t.fillType === 'gradient'
      ? makeGradient(t.x - t.size / 2, t.y, t.size, totalH, t.color, t.color2 || t.color, 90)
      : t.color;
    chars.forEach((ch, i) => ctx.fillText(ch, t.x, t.y + i * lh));
    ctx.restore();
    ctx.textAlign = 'left';
    return { x: t.x - t.size * 0.6, y: t.y, w: t.size * 1.2, h: totalH };
  }
  ctx.save();
  ctx.font = `${styleP}${weight} ${t.size}px ${fam}`;
  ctx.letterSpacing = `${t.spacing || 0}px`;
  ctx.textBaseline = 'top';
  ctx.textAlign = t.align || 'left';
  const m = ctx.measureText(t.text);
  let bx = t.x;
  if (t.align === 'right') bx = t.x - m.width;
  else if (t.align === 'center') bx = t.x - m.width / 2;
  // 바깥쪽 그림자 — 외곽선이 있으면 외곽선에, 없으면 글자 본체에 한 번만
  if (t.shadow) {
    ctx.shadowColor = hexToRgba(t.shadowColor || '#000000', 0.55);
    ctx.shadowBlur = Math.max(2, t.size * 0.18);
    ctx.shadowOffsetY = 2;
  }
  if (t.outline) {
    ctx.lineWidth = t.outlineWidth || 4;
    ctx.strokeStyle = t.outlineColor || '#ffffff';
    ctx.lineJoin = 'round';
    ctx.strokeText(t.text, t.x, t.y);
    if (t.shadow) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
  }
  ctx.fillStyle = t.fillType === 'gradient'
    ? makeGradient(bx, t.y, m.width || 1, t.size, t.color, t.color2 || t.color, t.gradAngle || 0)
    : t.color;
  ctx.fillText(t.text, t.x, t.y);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  // 밑줄 · 취소선
  if (t.underline || t.strike) {
    ctx.strokeStyle = t.color;
    ctx.lineWidth = Math.max(1, t.size / 15);
    if (t.underline) {
      ctx.beginPath();
      ctx.moveTo(bx, t.y + t.size * 1.08);
      ctx.lineTo(bx + m.width, t.y + t.size * 1.08);
      ctx.stroke();
    }
    if (t.strike) {
      ctx.beginPath();
      ctx.moveTo(bx, t.y + t.size * 0.55);
      ctx.lineTo(bx + m.width, t.y + t.size * 0.55);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.letterSpacing = '0px';
  return { x: bx, y: t.y, w: m.width, h: t.size * 1.15 };
}

// 여러 줄 자동 줄바꿈 (현재 ctx.font 기준)
function wrapText(str, maxW) {
  str = String(str || '');
  if (!str) return [''];
  if (ctx.measureText(str).width <= maxW) return [str];
  const lines = [];
  let cur = '';
  for (const ch of str) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = ch; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
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

// 테두리 효과별 글로우가 카드 밖으로 번지는 최대 거리 (캔버스 여백 계산용)
const FX_GLOW_PAD = {
  neon: 44, pulse: 40, spin: 28, rainbowspin: 24, chase: 18, twochase: 16, electric: 12,
};

function render(tMs) {
  // 사용자 조작으로 인한 렌더(시각 미지정)만 히스토리 기록 대상
  if (tMs == null && typeof scheduleHist === 'function') scheduleHist();
  if (tMs == null) tMs = performance.now();
  const { card, text, image, shadow, deco } = state;
  const fxs = state.fxs || [];
  const W = card.width, H = card.height;
  const rr = card.corner === 'sharp' ? 0 : card.radius;

  // 그림자·글로우가 잘리지 않도록 캔버스에 여백(M)을 두고 카드 원점을 이동
  // (블러 끝자락 ~2%는 안 보이므로 0.75배까지만 확보 — 여백 최소화)
  const glowPad = card.borderStyle === 'glow' && card.borderWidth > 0 ? 24 : 0;
  // 테두리 효과의 글로우도 캔버스 밖으로 잘리지 않게 여백 확보
  const fxPad = fxs.reduce((m, f) => Math.max(m, FX_GLOW_PAD[f.type] || 0), 0);
  const M = Math.max(glowPad, fxPad, shadow.on
    ? Math.ceil(shadow.blur * 0.75 + Math.max(Math.abs(shadow.x), Math.abs(shadow.y)) + 4)
    : 0);
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

  // 카드 그림자 (실루엣을 먼저 그려 번지게)
  // 카드 안쪽은 evenodd 클립으로 잘라내 바깥 그림자만 남김 — 그래야 실루엣의
  // 반투명 가장자리가 둥근 모서리에 테두리처럼 남아 삐져나와 보이지 않음
  if (shadow.on) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-M, -M, W + M * 2, H + M * 2);
    addRoundRect(ctx, 0, 0, W, H, rr);
    ctx.clip('evenodd');
    ctx.shadowColor = hexToRgba(shadow.color, shadow.alpha);
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.x;
    ctx.shadowOffsetY = shadow.y;
    ctx.fillStyle = '#000';
    roundRectPath(ctx, 0, 0, W, H, rr);
    ctx.fill();
    ctx.restore();
  }

  // 카드 클립
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, rr);
  ctx.clip();

  // 배경 (색 흐름 효과 시 색상 순환)
  let bg1 = card.bg1, bg2 = card.bg2;
  for (const f of fxs) {
    if (f.type !== 'hueflow') continue;
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
  drawPattern(W, H, card.pattern, card.patternColor, card.patternAlpha);

  // ---- 레이아웃 계산 ----
  const imgFrame = image.dataUrl ? imageFrameAt(tMs) : null;
  const hasImg = !!imgFrame;
  const panelW = hasImg ? Math.round(W * image.width) : 0;
  const panelX = image.side === 'right' ? W - panelW : 0;
  const areaX = image.side === 'right' ? 0 : panelW;
  const areaW = W - panelW;

  // 밴드(최대 3개) — 가로 띠(strip)일 때만 콘텐츠 영역 축소, 그 외 형태는 자유 배치
  const bands = state.bands && state.bands.length ? state.bands : [newBand()];
  let cTop = 0, cBot = H;
  for (const b of bands) {
    if (b.on && (b.style || 'strip') === 'strip') {
      if (b.pos === 'top') cTop = Math.max(cTop, b.height);
      else cBot = Math.min(cBot, H - b.height);
    }
  }
  const cH = cBot - cTop;

  // 밴드 레이어 (가로 띠 / 떠 있는 팝업 / 포스트잇 / 말풍선)
  const bandBoxes = [], bandRots = [];
  hit.bands = [];
  bands.forEach((band, bi) => {
    bandBoxes[bi] = null; bandRots[bi] = null; hit.bands[bi] = null;
    if (!band.on) return;
    const bandStyle = band.style || 'strip';
    if (bandStyle === 'strip') {
      const bandY = band.pos === 'top' ? 0 : H - band.height;
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
      hit.bands[bi] = bandBoxes[bi];
      const deg = bandStyle === 'postit' ? (band.rotate != null ? band.rotate : -3) : 0;
      if (deg) bandRots[bi] = { cx: bxx + bw2 / 2, cy: byy + bh2 / 2, rad: (deg * Math.PI) / 180 };
      const bandRot = bandRots[bi];
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
      // 살짝 떠 보이는 그림자 (바깥쪽만 — 반투명 밴드에 비치지 않게)
      ctx.save();
      ctx.beginPath();
      ctx.rect(-120, -120, W + 240, H + 240);
      addBandShape();
      ctx.clip('evenodd');
      ctx.shadowColor = 'rgba(0,0,0,0.28)';
      ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#000';
      bandPath(); ctx.fill();
      ctx.restore();
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
  // 텍스트 'band' 프리셋 기준: 첫 번째 켜진 밴드
  const primaryBi = bands.findIndex((b) => b.on);
  const bandBox = primaryBi >= 0 ? bandBoxes[primaryBi] : null;
  const bandRot = primaryBi >= 0 ? bandRots[primaryBi] : null;
  const band = primaryBi >= 0 ? bands[primaryBi] : bands[0];

  // ---- 사양 텍스트 레이아웃 선계산 (자동 맞춤 + 세로 중앙 + 위치 오프셋) ----
  const font = text.fontFamily;
  const cols = text.columns === 2 ? 2 : 1;
  const colW = areaW / cols;
  const perCol = Math.ceil(state.rows.length / cols) || 1;
  const AUTOFIT_MARGIN = 14;

  function measureSpec(fsTry) {
    ctx.letterSpacing = `${text.spacing || 0}px`; // 자간 반영해 측정
    // 자동 맞춤 시 줄간격은 글자 크기에 비례, 수동 시 rowGap 사용
    const lh = fsTry + (text.autofit ? Math.max(2, Math.round(fsTry * 0.32)) : text.rowGap + 6);
    const colData = [];
    let maxH = 0;
    for (let c = 0; c < cols; c++) {
      const rowsInCol = state.rows.slice(c * perCol, (c + 1) * perCol);
      const valMaxW = Math.max(20, colW - text.offX - text.labelWidth - 10);
      // 줄바꿈 계산도 실제로 그릴 굵기로 재야 폭이 어긋나지 않음
      ctx.font = `${text.valueBold === false ? 400 : 700} ${fsTry}px ${font}`;
      const wrapped = rowsInCol.map((row) => wrapText(row.value, valMaxW));
      const totalLines = wrapped.reduce((a, l) => a + Math.max(1, l.length), 0);
      const totalH = Math.max(0, (totalLines - 1) * lh + fsTry);
      let maxLineW = 0;
      wrapped.forEach((lines) => lines.forEach((ln) => {
        maxLineW = Math.max(maxLineW, ctx.measureText(ln).width);
      }));
      colData.push({ rowsInCol, wrapped, totalH, maxLineW });
      maxH = Math.max(maxH, totalH);
    }
    return { colData, maxH, lh, fs: fsTry };
  }

  let specM;
  if (text.autofit) {
    // 세로 높이에 모두 들어갈 때까지 글자 크기 축소
    let fsTry = 44;
    specM = measureSpec(fsTry);
    while (fsTry > 8 && specM.maxH > cH - AUTOFIT_MARGIN * 2) {
      fsTry -= 1;
      specM = measureSpec(fsTry);
    }
  } else {
    specM = measureSpec(text.fontSize);
  }
  // 열 X 위치: 중앙 고정 분할이 아니라 내용 폭 기준으로 이어 배치
  // (좌우 위치를 옮겨도 구분 위치가 따라오고, 넘칠 땐 열 간격을 좁혀서 유지)
  const colXs = [areaX + text.offX];
  if (cols === 2 && specM.colData.length > 1) {
    const w0 = text.labelWidth + specM.colData[0].maxLineW;
    const w1 = text.labelWidth + specM.colData[1].maxLineW;
    const avail = areaW - text.offX - 16 - w0 - w1;
    const gap = Math.max(14, Math.min(56, avail));
    colXs.push(colXs[0] + w0 + gap);
  }
  // 열별 시작 y (세로 중앙 + 오프셋)
  const specCols = specM.colData.map((cd, c) => ({
    ...cd,
    colX: colXs[c] != null ? colXs[c] : colXs[0],
    y0: cTop + Math.max(AUTOFIT_MARGIN, (cH - cd.totalH) / 2) + text.offY,
  }));
  // 내용 전체 바운딩 박스 (사양 패널용) — 여백은 패널 설정으로 조절
  let specBox = null;
  if (state.rows.length) {
    const spp = state.specPanel;
    const PADX = spp.padX != null ? spp.padX : 16;
    const PADY = spp.padY != null ? spp.padY : 16;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const sc of specCols) {
      if (!sc.rowsInCol.length) continue;
      minX = Math.min(minX, sc.colX);
      maxX = Math.max(maxX, sc.colX + text.labelWidth + sc.maxLineW);
      minY = Math.min(minY, sc.y0);
      maxY = Math.max(maxY, sc.y0 + sc.totalH);
    }
    if (minX < maxX) specBox = { x: minX - PADX, y: minY - PADY, w: maxX - minX + PADX * 2, h: maxY - minY + PADY * 2 };
  }

  // ---- 사양 레이어 (패널 + 텍스트) ----
  const drawSpecLayer = () => {
    // 사양 패널(내용 층) — 사양 내용만 감싸는 크기, 모양 선택 가능
    const sp = state.specPanel;
    if (sp.on && specBox) {
      const { x: px, y: py, w: pw, h: ph } = specBox;
      const prad = Math.min(sp.radius, pw / 2, ph / 2);
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
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
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
    const fs = specM.fs, lineH = specM.lh;
    ctx.letterSpacing = `${text.spacing || 0}px`;
    ctx.textBaseline = 'top';
    specCols.forEach((sc) => {
      const lblX = sc.colX;
      const valX = lblX + text.labelWidth;
      let y = sc.y0;
      sc.rowsInCol.forEach((row, ri) => {
        // 라벨 — 굵기/그라디언트/그림자 선택 가능
        ctx.font = `${text.labelBold === false ? 400 : 700} ${fs}px ${font}`;
        ctx.save();
        if (text.labelShadow) {
          ctx.shadowColor = hexToRgba(text.labelShadowColor || '#000000', 0.55);
          ctx.shadowBlur = Math.max(2, fs * 0.18);
          ctx.shadowOffsetY = 2;
        }
        ctx.fillStyle = text.labelGrad
          ? makeGradient(lblX, y, ctx.measureText(row.label).width || 1, fs,
              text.labelColor, text.labelColor2 || text.labelColor, 90)
          : text.labelColor;
        ctx.fillText(row.label, lblX, y);
        ctx.restore();
        // 값 — 일괄 지정 켜짐 → 값 글자색으로 통일. 그라디언트/그림자 선택 가능
        ctx.font = `${text.valueBold === false ? 400 : 700} ${fs}px ${font}`;
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
            ? makeGradient(valX, y + li * lineH, ctx.measureText(ln).width || 1, fs,
                baseCol, text.valueColor2 || baseCol, 90)
            : baseCol;
          ctx.fillText(ln, valX, y + li * lineH);
        });
        ctx.restore();
        y += Math.max(1, lines.length) * lineH;
      });
    });
    ctx.restore();
  };

  // ---- 이미지 레이어 (크기·위치·모양) ----
  const drawImageLayer = () => {
    if (!hasImg) { hit.panel = null; return; }
    const bw = Math.max(10, panelW);
    const bh = Math.max(10, Math.round(cH * (image.hFrac || 1)));
    const bx = (image.side === 'right' ? W - bw : 0) + image.pX;
    const by = cTop + (cH - bh) / 2 + image.pY;
    const irad = Math.min(image.radius, bw / 2, bh / 2);
    const s = Math.min(image.slant, bw - 10);
    // 뒤집기: 폴리곤을 세로로 반전
    const flipPts = (pts) => image.flip
      ? pts.map(([x, y]) => [x, by + bh - (y - by)])
      : pts;
    // 대각: 안쪽(사양 쪽) 변 기울임
    const diagPts = image.side === 'right'
      ? [[bx + s, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]]
      : [[bx, by], [bx + bw - s, by], [bx + bw, by + bh], [bx, by + bh]];
    // 사다리꼴: 윗변 양쪽 좁힘 (뒤집으면 아랫변 좁힘)
    const trapPts = [[bx + s / 2, by], [bx + bw - s / 2, by], [bx + bw, by + bh], [bx, by + bh]];
    // 삼각형: 위 꼭짓점 (뒤집으면 아래 꼭짓점)
    const triPts = [[bx + bw / 2, by], [bx + bw, by + bh], [bx, by + bh]];
    // 평행사변형: 윗변을 기울기만큼 이동
    const paraPts = [[bx + s, by], [bx + bw, by], [bx + bw - s, by + bh], [bx, by + bh]];
    hit.panel = { x: bx, y: by, w: bw, h: bh };

    // beginPath 없이 서브패스로 모양 추가 (evenodd 클립 조합용)
    const addPoly = (pts) => {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    };
    const addShape = () => {
      if (image.shape === 'diag') addPoly(flipPts(diagPts));
      else if (image.shape === 'trape') addPoly(flipPts(trapPts));
      else if (image.shape === 'tri') addPoly(flipPts(triPts));
      else if (image.shape === 'para') addPoly(flipPts(paraPts));
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
      else base = Math.max(bw / iw, bh / ih); // 자유 배치: 칸을 채우는 크기가 기준
      // 크기(scale)는 '자유 배치'에서만 적용 — 나머지는 정확히 기준에 맞춤
      const sc = image.fit === 'free' ? base * image.scale : base;
      dw = iw * sc; dh = ih * sc;
    }
    const ix = bx + (bw - dw) / 2 + image.x;
    const iy = by + (bh - dh) / 2 + image.y;
    // 큰 사진은 단계적으로 줄인 뒤 그려야 디테일이 살고 모아레가 안 생김
    ctx.drawImage(downscaleSource(imgFrame, iw, ih, dw * RES), ix, iy, dw, dh);
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
      // 이중선(투톤): 같은 경로에 가는 선을 색2로 겹침
      if (image.frame === 'double') {
        ctx.lineWidth = Math.max(1, image.frameWidth * 0.35);
        ctx.strokeStyle = image.frameColor2;
        clipPath();
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  // 사양/이미지는 개별 레이어 — 겹칠 때 위로 올릴 쪽을 나중에 그림
  if ((state.layerTop || 'spec') === 'image') { drawSpecLayer(); drawImageLayer(); }
  else { drawImageLayer(); drawSpecLayer(); }

  // 텍스트 요소들 (0~5개, 전부 자유 배치 — 드래그로 이동)
  hit.texts = [];
  state.texts.forEach((t) => {
    if (!t.text) { hit.texts.push(null); return; }
    if (t.x == null || t.y == null) {
      t.x = W / 2; t.y = H / 2;
      t.align = t.align || 'center';
    }
    hit.texts.push(drawTextEl({
      text: t.text, x: t.x, y: t.y, size: t.size, color: t.color, align: t.align || 'left',
      fontFamily: t.fontFamily, fillType: t.fillType, color2: t.color2, gradAngle: t.gradAngle,
      outline: t.outline, outlineColor: t.outlineColor, outlineWidth: t.outlineWidth,
      shadow: t.shadow, shadowColor: t.shadowColor,
      bold: t.bold, italic: t.italic, underline: t.underline, strike: t.strike, spacing: t.spacing,
      vertical: t.vertical,
    }));
  });

  // 스티커 (이모지·이미지) — 텍스트 위에 그려짐, 드래그 이동
  hit.stickers = [];
  (state.stickers || []).forEach((st) => {
    const size = st.size || 48;
    const sx = st.x != null ? st.x : W / 2;
    const sy = st.y != null ? st.y : H / 2;
    ctx.save();
    ctx.translate(sx, sy);
    if (st.rotate) ctx.rotate((st.rotate * Math.PI) / 180);
    if (st.type === 'image' && st.dataUrl) {
      const im = stickerImg(st.dataUrl);
      if (im && im.complete && im.naturalWidth) {
        const h2 = size * (im.naturalHeight / im.naturalWidth);
        const sd = downscaleSource(im, im.naturalWidth, im.naturalHeight, size * RES);
        ctx.drawImage(sd, -size / 2, -h2 / 2, size, h2);
        hit.stickers.push({ x: sx - size / 2, y: sy - h2 / 2, w: size, h: h2 });
      } else {
        hit.stickers.push({ x: sx - size / 2, y: sy - size / 2, w: size, h: size });
      }
    } else {
      ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.emoji || '⭐', 0, 0);
      hit.stickers.push({ x: sx - size / 2, y: sy - size / 2, w: size, h: size });
    }
    ctx.restore();
  });

  // 카드 내부(배경 계열) 효과 — 반짝임·떠오르는 입자·눈·빛줄기
  fxs.forEach((f, fi) => {
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
        ctx.globalAlpha = a * 0.95;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        // 큰 별에는 십자 광선
        if (size > 2.4) {
          ctx.globalAlpha = a * 0.55;
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
    } else if (f.type === 'float' || f.type === 'snow') {
      // float: 아래→위로 떠오름, snow: 위→아래로 내림 (좌우로 살랑임)
      const down = f.type === 'snow';
      const rnd = seededRand((down ? 55501 : 11224) + fi * 131);
      const n = Math.round(10 + (f.density || 0.5) * 55);
      ctx.save();
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const x0 = rnd() * W;
        const off = rnd();
        const k = 1 + Math.floor(rnd() * 2); // 정수 배수 → 루프 이음새 없음
        const size = down ? 1 + rnd() * 2.6 : 1.5 + rnd() * 3.2;
        const p = ((ph * k) + off) % 1;
        const y = down ? p * (H + 40) - 20 : H + 20 - p * (H + 40);
        const sway = Math.sin(2 * Math.PI * (ph * k * 2 + off)) * 7;
        ctx.globalAlpha = down ? 0.85 : 0.7;
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
    } else if (f.type === 'confetti') {
      // 알록달록 색종이가 빙글빙글 돌며 떨어짐 (색은 고정 팔레트)
      const rnd = seededRand(77007 + fi * 131);
      const palette = ['#ff5252', '#ffb300', '#40c4ff', '#69f0ae', '#ff4081', '#b388ff'];
      const n = Math.round(10 + (f.density || 0.5) * 50);
      ctx.save();
      for (let i = 0; i < n; i++) {
        const x0 = rnd() * W;
        const off = rnd();
        const k = 1 + Math.floor(rnd() * 2); // 정수 배수 → 루프 이음새 없음
        const cw = 4 + rnd() * 5, chh = 3 + rnd() * 4;
        const colr = palette[Math.floor(rnd() * palette.length)];
        const p = ((ph * k) + off) % 1;
        const y = p * (H + 40) - 20;
        const sway = Math.sin(2 * Math.PI * (ph * k * 2 + off)) * 10;
        const rot = 2 * Math.PI * (((ph * k * 3) + off) % 1);
        ctx.save();
        ctx.translate(x0 + sway, y);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = colr;
        ctx.fillRect(-cw / 2, -chh / 2, cw, chh);
        ctx.restore();
      }
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
        ctx.globalAlpha = a;
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
        ctx.globalAlpha = 0.85;
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
        ctx.globalAlpha = 0.85;
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
        ctx.globalAlpha = 0.25 + layer * 0.25;
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
    } else if (f.type === 'fog') {
      // 안개 덩어리가 옆으로 흘러감
      const rnd = seededRand(60606 + fi * 131);
      const n = Math.round(3 + (f.density || 0.5) * 5);
      ctx.save();
      for (let i = 0; i < n; i++) {
        const y = rnd() * H;
        const off = rnd();
        const k = 1 + Math.floor(rnd() * 2);
        const rx = 130 + rnd() * 160, ry = 30 + rnd() * 40;
        const p = ((ph * k) + off) % 1;
        const x = p * (W + rx * 4) - rx * 2;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
        g.addColorStop(0, hexToRgba(col, 0.13));
        g.addColorStop(1, hexToRgba(col, 0));
        ctx.save();
        ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
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
          ctx.globalAlpha = a;
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
    } else if (f.type === 'wave') {
      // 물결 라인이 흘러감
      const amp = 6 + (f.density || 0.5) * 16;
      ctx.save();
      ctx.lineWidth = 2;
      for (let j = 0; j < 3; j++) {
        ctx.strokeStyle = hexToRgba(col, 0.22 + j * 0.08);
        ctx.beginPath();
        const yb = H * (0.5 + j * 0.16);
        for (let x = 0; x <= W; x += 6) {
          const y = yb + Math.sin(2 * Math.PI * (x / W * 2 + ph * (1 + j))) * amp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
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
        ctx.globalAlpha = 0.15 + rnd() * 0.2;
        ctx.fillStyle = i % 2 ? col : hueShiftHex(col, 180);
        ctx.fillRect(dx, y, W, hh);
      }
      ctx.restore();
    }
  });

  ctx.restore(); // 카드 클립 해제

  // 외곽 테두리 (단색/그라디언트/글로우/이중/파선/점선)
  if (card.borderWidth > 0) {
    const bs = card.borderStyle || 'solid';
    const bwd = card.borderWidth;
    ctx.save();
    ctx.lineWidth = bwd;
    ctx.strokeStyle = bs === 'gradient'
      ? makeGradient(0, 0, W, H, card.borderColor, card.borderColor2 || card.borderColor, 45)
      : card.borderColor;
    if (bs === 'glow') {
      ctx.shadowColor = hexToRgba(card.borderColor, 0.9);
      ctx.shadowBlur = 18;
    } else if (bs === 'dashed') {
      ctx.setLineDash([bwd * 2.5, bwd * 1.6]);
    } else if (bs === 'dotted') {
      ctx.setLineDash([0.1, bwd * 2]);
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
      // 점선이 테두리를 따라 행진 (개미 행렬)
      const col = f.color || '#ffffff';
      const lw = Math.max(3, card.borderWidth || 4);
      const seg = 6 + (f.density || 0.5) * 18;
      const patt = seg + seg * 0.8;
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = col;
      ctx.setLineDash([seg, seg * 0.8]);
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
    } else if (f.type === 'breath') {
      // 테두리 두께가 숨쉬듯 커졌다 작아짐
      const col = f.color || '#ffffff';
      const base = Math.max(3, card.borderWidth || 5);
      const lw = base * (0.5 + (0.5 + 0.5 * Math.sin(2 * Math.PI * ph)) * (0.6 + (f.density || 0.5) * 1.2));
      ctx.save();
      ctx.lineWidth = lw;
      ctx.strokeStyle = col;
      roundRectPath(ctx, lw / 2, lw / 2, W - lw, H - lw, Math.max(0, rr - lw / 2));
      ctx.stroke();
      ctx.restore();
    }
  });

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
// 포인터 이벤트 — 마우스·터치·펜을 한 코드로 처리 (모바일에서도 드래그 동작)
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' && e.isPrimary === false) return; // 멀티터치 2번째 손가락 무시
  const p = toCard(e);
  // 스티커가 맨 위 → 스티커부터 검사
  for (let i = (state.stickers || []).length - 1; i >= 0; i--) {
    if (hit.stickers && inRect(p, hit.stickers[i])) {
      const st = state.stickers[i];
      drag = { kind: 'sticker', idx: i, sx: p.x, sy: p.y, ox: st.x, oy: st.y };
      break;
    }
  }
  // 텍스트를 위에서부터(뒤에 그린 것 우선) 검사
  if (!drag) {
    for (let i = state.texts.length - 1; i >= 0; i--) {
      if (inRect(p, hit.texts[i])) {
        const t = state.texts[i];
        drag = { kind: 'text', idx: i, sx: p.x, sy: p.y, ox: t.x, oy: t.y };
        break;
      }
    }
  }
  // 밴드(팝업·포스트잇·말풍선) 드래그 — 위에 그린 밴드 우선
  if (!drag && hit.bands) {
    for (let i = hit.bands.length - 1; i >= 0; i--) {
      if (inRect(p, hit.bands[i])) {
        drag = { kind: 'band', idx: i, sx: p.x, sy: p.y, ox: hit.bands[i].x, oy: hit.bands[i].y };
        break;
      }
    }
  }
  if (!drag && inRect(p, hit.panel)) {
    drag = { kind: 'image', sx: p.x, sy: p.y, ox: state.image.x, oy: state.image.y };
  }
  if (drag) canvas.classList.add('dragging');
});
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  e.preventDefault(); // 드래그 중 페이지가 같이 스크롤되지 않게
  const p = toCard(e);
  const nx = drag.ox + (p.x - drag.sx);
  const ny = drag.oy + (p.y - drag.sy);
  if (drag.kind === 'image') {
    // 맞춤 모드별 축 고정: 가로맞춤=세로만, 세로맞춤=가로만, 늘려채우기=고정, 자유배치=자유
    const img = state.image;
    const lockX = img.fit === 'width' || img.fit === 'stretch';
    const lockY = img.fit === 'height' || img.fit === 'stretch';
    if (!lockX) img.x = nx;
    if (!lockY) img.y = ny;
  } else if (drag.kind === 'text') {
    const t = state.texts[drag.idx];
    if (t) { t.x = nx; t.y = ny; }
  } else if (drag.kind === 'sticker') {
    const st = state.stickers[drag.idx];
    if (st) { st.x = nx; st.y = ny; }
  } else if (drag.kind === 'band') {
    const b = state.bands && state.bands[drag.idx];
    if (b) { b.x = nx; b.y = ny; }
  }
  render();
});
const endDrag = () => { drag = null; canvas.classList.remove('dragging'); };
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

// ---------------- 사양 행 편집기 ----------------
let rowDragIdx = null; // 드래그 정렬 중인 행 인덱스
function renderRows() {
  const wrap = document.getElementById('rows');
  wrap.innerHTML = '';
  state.rows.forEach((row, i) => {
    const div = document.createElement('div');
    div.className = 'spec-row';
    // 드래그 손잡이 — 잡아서 원하는 위치로 한 번에 이동
    const grip = document.createElement('span');
    grip.className = 'grip'; grip.textContent = '⠿'; grip.title = '드래그해서 순서 이동';
    grip.onmousedown = () => { div.draggable = true; };
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
    lbl.className = 'lbl'; lbl.value = row.label; lbl.maxLength = 5;
    lbl.oninput = () => { row.label = lbl.value; render(); };
    const val = document.createElement('input');
    val.value = row.value; val.placeholder = '값 입력';
    val.oninput = () => { row.value = val.value; render(); };
    const col = document.createElement('input');
    col.type = 'color'; col.className = 'rowcolor';
    col.value = row.color || state.text.valueColor;
    col.disabled = !!state.text.uniform;
    col.title = state.text.uniform
      ? '값 글자색 일괄 적용이 켜져 있어요 (색상·배경에서 끄면 줄별 지정 가능)'
      : '이 줄 값 색 (더블클릭 = 기본색)';
    col.oninput = () => { row.color = col.value; render(); };
    col.ondblclick = () => { delete row.color; col.value = state.text.valueColor; render(); };
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
    div.append(grip, lbl, val, col, btns);
    wrap.appendChild(div);
  });
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
    const txt = document.createElement('input');
    txt.className = 'tc-text'; txt.value = t.text; txt.placeholder = '문구';
    txt.oninput = () => { t.text = txt.value; render(); };
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×'; del.title = '삭제';
    del.onclick = () => { state.texts.splice(i, 1); renderTexts(); render(); };
    r1.append(txt, del);

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

    card.append(r1, r2, r3, r4, r4b, r5, r5b, r6, r7);
    wrap.appendChild(card);
  });
  const btn = document.getElementById('btn-add-text');
  if (btn) {
    btn.disabled = state.texts.length >= MAX_TEXTS;
    btn.textContent = state.texts.length >= MAX_TEXTS ? `+ 텍스트 (최대 ${MAX_TEXTS}개)` : '+ 텍스트 추가';
  }
}

// ---------------- 움직임 효과 편집기 (여러 개 동시, 배경/테두리 구분) ----------------
const MAX_FX = 6;
const FX_BG = [
  ['sparkle', '반짝임'], ['hueflow', '배경 색 흐름'], ['float', '떠오르는 입자'],
  ['snow', '눈 내림'], ['shine', '빛줄기 흐름'], ['confetti', '색종이'], ['meteor', '유성'],
  ['rain', '비 내림'], ['bubbles', '비눗방울'], ['fireflies', '반딧불'],
  ['petals', '꽃잎 낙하'], ['hearts', '하트 둥둥'], ['starfield', '별 흐름'],
  ['scanline', '스캔 라인'], ['fog', '안개 흐름'], ['matrix', '매트릭스 문자'],
  ['rays', '회전 광선'], ['wave', '물결'], ['glitch', '글리치'],
];
const FX_BORDER = [
  ['neon', '네온 순환'], ['pulse', '글로우 펄스'], ['spin', '회전 그라디언트'],
  ['chase', '달리는 빛'], ['marquee', '점선 행진'], ['rainbowspin', '무지개 회전'],
  ['twochase', '교차 달리는 빛'], ['corners', '모서리 펄스'],
  ['electric', '전기 스파크'], ['breath', '두께 숨쉬기'],
];
function renderFxs() {
  const wrap = document.getElementById('fx-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  (state.fxs || []).forEach((f, i) => {
    const card = document.createElement('div');
    card.className = 'text-card';

    const r1 = tcRow();
    const sel = document.createElement('select');
    sel.style.flex = '1';
    for (const [gLabel, list] of [['배경 효과', FX_BG], ['테두리 효과', FX_BORDER]]) {
      const og = document.createElement('optgroup');
      og.label = gLabel;
      for (const [v, lab] of list) {
        const o = document.createElement('option'); o.value = v; o.textContent = lab; og.appendChild(o);
      }
      sel.appendChild(og);
    }
    sel.value = f.type || 'sparkle';
    sel.onchange = () => { f.type = sel.value; render(); ensureAnim(); };
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×'; del.title = '삭제';
    del.onclick = () => { state.fxs.splice(i, 1); renderFxs(); render(); };
    r1.append(sel, del);

    const r2 = tcRow();
    const l2 = document.createElement('span'); l2.className = 'tc-lab'; l2.textContent = '속도';
    r2.append(l2, mkRange(0.25, 3, 0.05, f.speed || 1, (v) => { f.speed = v; render(); }));

    const r3 = tcRow();
    const l3 = document.createElement('span'); l3.className = 'tc-lab'; l3.textContent = '세기';
    r3.append(l3,
      mkRange(0.1, 1, 0.05, f.density != null ? f.density : 0.5, (v) => { f.density = v; render(); }),
      mkColor(f.color || '#ffffff', '효과 색', (v) => { f.color = v; render(); }));

    card.append(r1, r2, r3);
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
const MAX_STICKERS = 10;
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
    r1.append(prev, szLab, mkRange(16, 240, 1, st.size || 48, (v) => { st.size = v; render(); }), del);
    const r2 = tcRow();
    const rotLab = document.createElement('span');
    rotLab.className = 'tc-lab'; rotLab.textContent = '회전';
    r2.append(rotLab, mkRange(-45, 45, 1, st.rotate || 0, (v) => { st.rotate = v; render(); }));
    card.append(r1, r2);
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
  return el && el.tagName === 'INPUT' && el.type === 'color' && el.id !== 'cp-native';
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
function loadMySpecs() {
  try {
    const rows = JSON.parse(localStorage.getItem(MY_SPECS_KEY));
    if (!Array.isArray(rows) || !rows.length) return null;
    return rows.map((r) => {
      const row = { label: String(r.label || ''), value: String(r.value || '') };
      if (r.color) row.color = r.color;
      return row;
    });
  } catch (_) { return null; }
}
function updateMySpecsUI() {
  const btn = document.getElementById('btn-spec-load');
  if (btn) btn.disabled = !loadMySpecs();
}

// ---------------- 토스트 ----------------
let toastT = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 1800);
}

// ---------------- 컨트롤 바인딩 ----------------
function bindControls() {
  const $ = (id) => document.getElementById(id);

  $('btn-auto').onclick = async () => {
    try {
      $('btn-auto').disabled = true;
      $('btn-auto').textContent = '읽는 중…';
      const auto = await window.api.readSpecs();
      // 자동값을 기존 행에 병합: 같은 라벨은 값 채우고, 없으면 추가.
      const byLabel = {};
      for (const r of auto) (byLabel[r.label] ||= []).push(r.value);
      const used = {};
      const merged = [];
      for (const r of state.rows) {
        const list = byLabel[r.label];
        if (list && used[r.label] == null) used[r.label] = 0;
        if (list && used[r.label] < list.length) {
          merged.push({ label: r.label, value: list[used[r.label]++] });
        } else {
          merged.push(r);
        }
      }
      // 자동에서 남는 추가값(여러 SSD 등) 뒤에 붙이기
      for (const label of Object.keys(byLabel)) {
        const list = byLabel[label];
        let start = used[label] || 0;
        for (let k = start; k < list.length; k++) merged.push({ label, value: list[k] });
      }
      state.rows = merged;
      renderRows(); render();
      toast('사양을 읽었어요');
    } catch (e) {
      toast('읽기 실패: ' + e.message);
    } finally {
      $('btn-auto').disabled = false;
      $('btn-auto').textContent = '⚙ 사양 자동 채우기';
    }
  };

  $('btn-add-row').onclick = () => { state.rows.push({ label: 'NEW', value: '' }); renderRows(); render(); };

  // 내 사양 저장/불러오기 — 디자인과 별개로 사양 내용(rows)만 앱 내부(localStorage)에 보관
  $('btn-spec-save').onclick = () => {
    localStorage.setItem(MY_SPECS_KEY, JSON.stringify(state.rows));
    updateMySpecsUI();
    toast('내 사양을 저장했어요 (사양 내용만)');
  };
  $('btn-spec-load').onclick = () => {
    const rows = loadMySpecs();
    if (!rows) { toast('저장된 내 사양이 없어요'); return; }
    state.rows = rows;
    renderRows(); render();
    toast('내 사양을 불러왔어요');
  };

  $('btn-image').onclick = async () => {
    const url = await window.api.pickImage();
    if (!url) return;
    state.image.dataUrl = url; state.image.x = 0; state.image.y = 0;
    await loadImage(url); render();
  };
  $('btn-image-clear').onclick = async () => {
    state.image.dataUrl = null; await loadImage(null); render();
  };
  $('img-side').onchange = (e) => { state.image.side = e.target.value; render(); };
  $('img-scale').oninput = (e) => { state.image.scale = +e.target.value; render(); };
  $('img-width').oninput = (e) => { state.image.width = +e.target.value; render(); };
  $('img-radius').oninput = (e) => { state.image.radius = +e.target.value; render(); };
  $('img-fit').onchange = (e) => {
    state.image.fit = e.target.value;
    state.image.x = 0; state.image.y = 0; // 기준 변경 시 위치 리셋
    updateFitUI(); render();
  };
  $('img-shape').onchange = (e) => { state.image.shape = e.target.value; render(); };
  $('layer-top').onchange = (e) => { state.layerTop = e.target.value; render(); };
  $('img-slant').oninput = (e) => { state.image.slant = +e.target.value; render(); };
  $('img-h').oninput = (e) => { state.image.hFrac = +e.target.value; render(); };
  $('img-flip').onchange = (e) => { state.image.flip = e.target.checked; render(); };

  // 슬라이더 ↔ 숫자 입력 페어
  function pair(sliderId, numId, setter) {
    const sl = $(sliderId), num = $(numId);
    const apply = (v) => {
      v = Math.round(+v) || 0;
      sl.value = v; num.value = v;
      setter(v); render();
    };
    sl.oninput = (e) => apply(e.target.value);
    num.onchange = (e) => apply(e.target.value);
  }
  pair('img-px', 'img-px-num', (v) => { state.image.pX = v; });
  pair('img-py', 'img-py-num', (v) => { state.image.pY = v; });
  $('img-reset').onclick = () => {
    Object.assign(state.image, { x: 0, y: 0, scale: 1, hFrac: 1, pX: 0, pY: 0 });
    syncControls(); render();
    toast('이미지 위치·크기 초기화');
  };
  $('img-sh-c').oninput = (e) => { state.image.shadowColor = e.target.value; render(); };
  $('img-sh-a').oninput = (e) => { state.image.shadowAlpha = +e.target.value; render(); };
  $('img-sh-blur').oninput = (e) => { state.image.shadowBlur = +e.target.value; render(); };
  $('img-sh-y').oninput = (e) => { state.image.shadowY = +e.target.value; render(); };
  $('img-frame').onchange = (e) => { state.image.frame = e.target.value; render(); };
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
  $('sp-shape').onchange = (e) => { state.specPanel.shape = e.target.value; render(); };
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

  $('sh-on').onchange = (e) => { state.shadow.on = e.target.checked; render(); };
  $('sh-color').oninput = (e) => { state.shadow.color = e.target.value; render(); };
  $('sh-alpha').oninput = (e) => { state.shadow.alpha = +e.target.value; render(); };
  $('sh-blur').oninput = (e) => { state.shadow.blur = +e.target.value; render(); };
  $('sh-y').oninput = (e) => { state.shadow.y = +e.target.value; render(); };
  $('bg-style').onchange = (e) => { state.card.bgStyle = e.target.value; render(); };
  $('deco-on').onchange = (e) => { state.deco.on = e.target.checked; render(); };
  $('deco-color').oninput = (e) => { state.deco.color = e.target.value; render(); };
  $('deco-inset').oninput = (e) => { state.deco.inset = +e.target.value; render(); };
  $('deco-width').oninput = (e) => { state.deco.width = +e.target.value; render(); };

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

  $('corner').onchange = (e) => { state.card.corner = e.target.value; render(); };
  $('row-gap').oninput = (e) => { state.text.rowGap = +e.target.value; render(); };
  $('label-w').oninput = (e) => { state.text.labelWidth = +e.target.value; render(); };
  pair('spec-x', 'spec-x-num', (v) => { state.text.offX = v; });
  pair('spec-y', 'spec-y-num', (v) => { state.text.offY = v; });
  $('spec-spacing').oninput = (e) => { state.text.spacing = +e.target.value; render(); };
  $('spec-reset').onclick = () => {
    state.text.offX = 34; state.text.offY = 0;
    syncControls(); render();
    toast('사양 위치 초기화');
  };
  $('columns').onchange = (e) => { state.text.columns = +e.target.value; render(); };
  $('autofit').onchange = (e) => { state.text.autofit = e.target.checked; updateAutofitUI(); render(); };
  $('c-uniform').onchange = (e) => { state.text.uniform = e.target.checked; renderRows(); render(); };

  $('design-name').oninput = (e) => { state.name = e.target.value; };

  $('btn-save').onclick = async () => {
    state.name = $('design-name').value.trim() || '무제';
    const res = await window.api.saveDesign(JSON.parse(JSON.stringify(state)));
    state.file = res.file;
    toast('저장했어요: ' + res.name);
    refreshList();
  };
  $('btn-save-as').onclick = async () => {
    // 현재 상태를 항상 새 파일로 저장 (기존 디자인 유지)
    state.name = $('design-name').value.trim() || '무제';
    state.file = null;
    const res = await window.api.saveDesign(JSON.parse(JSON.stringify(state)));
    state.file = res.file;
    toast('새 디자인으로 저장: ' + res.name);
    refreshList();
  };
  $('btn-new').onclick = async () => {
    state = defaultState(); colorsDirty = false;
    await loadImage(null); // 정지 이미지·움짤 모두 정리
    syncControls(); renderRows(); renderTexts(); render();
    toast('새 디자인');
  };
  $('btn-export').onclick = async () => {
    // 고배율 렌더를 고품질 축소 → 저장 파일은 원래 픽셀 크기 유지 (슈퍼샘플링)
    const tmp = document.createElement('canvas');
    const tc = tmp.getContext('2d');
    stopAnim();
    const dataUrl = await withExportRes(async () => {
      render();
      tmp.width = Math.round(canvas.width / RES);
      tmp.height = Math.round(canvas.height / RES);
      drawDownscaled(tc, tmp.width, tmp.height);
      return tmp.toDataURL('image/png');
    });
    render(); // 화면 배율로 되돌려 다시 그리기
    ensureAnim();
    const path = await window.api.exportPng({ dataUrl, suggestedName: state.name || 'speccard' });
    if (path) toast('PNG로 내보냈어요');
  };
  $('btn-export-webp').onclick = exportWebp;

  // 움직임 효과 추가
  $('btn-add-fx').onclick = () => {
    state.fxs = state.fxs || [];
    if (state.fxs.length >= MAX_FX) return;
    state.fxs.push({ type: 'sparkle', speed: 1, density: 0.5, color: '#ffffff' });
    renderFxs(); render(); ensureAnim();
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
}

// 자동 맞춤 켜짐 → 글자 크기/줄 간격 수동 조절 비활성
function updateAutofitUI() {
  const on = !!state.text.autofit;
  document.getElementById('font-size').disabled = on;
  document.getElementById('row-gap').disabled = on;
}

// 크기(scale)는 '자유 배치'에서만 의미 있음
function updateFitUI() {
  document.getElementById('img-scale').disabled = state.image.fit !== 'free';
}

// ---------------- 밴드 선택 (최대 3개, 탭으로 전환) ----------------
const MAX_BANDS = 5;
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

// 컨트롤 값 → state 반영(불러오기/새로만들기 후 UI 동기화)
function syncControls() {
  const s = state, $ = (id) => document.getElementById(id);
  $('img-side').value = s.image.side;
  $('img-scale').value = s.image.scale;
  $('img-width').value = s.image.width;
  $('img-radius').value = s.image.radius;
  $('img-fit').value = s.image.fit || 'free';
  $('layer-top').value = s.layerTop || 'spec';
  $('img-shape').value = s.image.shape || 'rect';
  $('img-slant').value = s.image.slant;
  $('img-h').value = s.image.hFrac || 1;
  $('img-flip').checked = !!s.image.flip;
  $('img-px').value = s.image.pX || 0; $('img-px-num').value = s.image.pX || 0;
  $('img-py').value = s.image.pY || 0; $('img-py-num').value = s.image.pY || 0;
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
  $('sh-on').checked = !!s.shadow.on;
  $('sh-color').value = s.shadow.color;
  $('sh-alpha').value = s.shadow.alpha;
  $('sh-blur').value = s.shadow.blur;
  $('sh-y').value = s.shadow.y;
  $('bg-style').value = s.card.bgStyle || 'gradient';
  $('deco-on').checked = !!s.deco.on;
  $('deco-color').value = s.deco.color;
  $('deco-inset').value = s.deco.inset;
  $('deco-width').value = s.deco.width;
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
  $('row-gap').value = s.text.rowGap;
  $('label-w').value = s.text.labelWidth;
  $('spec-x').value = s.text.offX; $('spec-x-num').value = s.text.offX;
  $('spec-y').value = s.text.offY; $('spec-y-num').value = s.text.offY;
  $('spec-spacing').value = s.text.spacing || 0;
  $('columns').value = s.text.columns || 1;
  $('autofit').checked = !!s.text.autofit;
  $('c-uniform').checked = !!s.text.uniform;
  updateAutofitUI();
  $('font-family').value = s.text.fontFamily;
  $('bg-pattern').value = s.card.pattern || 'none';
  $('pattern-color').value = s.card.patternColor;
  $('pattern-alpha').value = s.card.patternAlpha;
  renderFxs();
  renderStickers();
  $('design-name').value = s.name;
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
    const name = document.createElement('span');
    name.className = 'name'; name.textContent = d.name; name.title = '불러오기';
    name.onclick = () => {
      openDesign(d.file);
      const pop = document.getElementById('design-pop');
      if (pop) pop.classList.add('hidden');
    };
    const x = document.createElement('button');
    x.className = 'x'; x.textContent = '🗑';
    x.onclick = async (ev) => {
      ev.stopPropagation();
      await window.api.deleteDesign(d.file);
      refreshList();
    };
    li.append(name, x);
    ul.appendChild(li);
  }
}

// 저장본(JSON)을 현재 상태로 적용 — 옛 필드 호환 포함
async function applyLoadedState(loaded, file) {
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
  // 옛 저장본 호환: 칸 채우기/전체 보이기 → 자유 배치
  if (base.image.fit === 'cover' || base.image.fit === 'contain') base.image.fit = 'free';
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
  state = base;
  state.file = file || null;
  colorsDirty = false;
  await loadImage(state.image.dataUrl);
  syncControls(); renderRows(); renderTexts(); render();
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
function buildAnimWebp(frames, W, H, opaque) {
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
  if (opaque) { anim[0] = 0xff; anim[1] = 0xff; anim[2] = 0xff; anim[3] = 0xff; } // 배경 BGRA(흰색)
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

async function exportWebp() {
  const btn = document.getElementById('btn-export-webp');
  btn.disabled = true;
  const origLabel = btn.textContent;
  stopAnim();
  try {
    // 움직임이 없으면 애니메이션 컨테이너로 묶지 않고 정지 WebP 한 장으로 저장
    if (!needsAnim()) {
      btn.textContent = 'WebP 생성 중…';
      const tmp = document.createElement('canvas');
      const tctx = tmp.getContext('2d');
      const bytes = await withExportRes(async () => {
        render();
        tmp.width = Math.round(canvas.width / RES);
        tmp.height = Math.round(canvas.height / RES);
        drawDownscaled(tctx, tmp.width, tmp.height);
        const blob = await new Promise((r) => tmp.toBlob(r, 'image/webp', WEBP_QUALITY_STILL));
        if (!blob) throw new Error('WebP 인코딩을 지원하지 않는 환경이에요');
        return new Uint8Array(await blob.arrayBuffer());
      });
      const p = await window.api.exportWebp({
        dataBase64: u8ToB64(bytes), suggestedName: state.name || 'speccard',
      });
      if (p) toast(`WebP로 내보냈어요 (정지 이미지 · ${(bytes.length / 1024).toFixed(0)}KB)`);
      return;
    }
    const dur = Math.min(6000, gifAnim ? gifAnim.total : fxLoopMs());
    const frameCount = Math.max(2, Math.round(dur / (1000 / WEBP_FPS)));
    // 프레임 시각·지속시간을 정수 ms로 정확히 분배 → 지속시간 합 = dur (루프 드리프트 없음)
    const tAt = (i) => Math.round((i * dur) / frameCount);
    // WebP는 8비트 알파를 그대로 담을 수 있어 배경을 투명으로 고정
    // (GIF와 달리 프레임 지우기 깜빡임·모서리 자글거림이 없음)
    const tmp = document.createElement('canvas');
    const tctx = tmp.getContext('2d');
    const frames = await withExportRes(async () => {
      render(0); // 올린 배율로 한 번 그려 캔버스 크기를 확정
      tmp.width = Math.round(canvas.width / RES);
      tmp.height = Math.round(canvas.height / RES);
      const out = [];
      for (let i = 0; i < frameCount; i++) {
        btn.textContent = `WebP 생성 중… ${Math.round((i / frameCount) * 100)}%`;
        render(tAt(i));
        drawDownscaled(tctx, tmp.width, tmp.height); // 고배율 렌더를 원래 픽셀 크기로 축소
        const blob = await new Promise((r) => tmp.toBlob(r, 'image/webp', WEBP_QUALITY));
        if (!blob) throw new Error('WebP 인코딩을 지원하지 않는 환경이에요');
        const chunks = wpSubChunks(new Uint8Array(await blob.arrayBuffer()));
        if (!chunks.length) throw new Error('프레임 인코딩 실패');
        out.push({ chunks, delay: tAt(i + 1) - tAt(i) });
      }
      return out;
    });
    btn.textContent = 'WebP 묶는 중…';
    const bytes = buildAnimWebp(frames, tmp.width, tmp.height, false);
    const path = await window.api.exportWebp({
      dataBase64: u8ToB64(bytes), suggestedName: state.name || 'speccard',
    });
    if (path) toast(`WebP로 내보냈어요 (${frameCount}프레임 · ${(bytes.length / 1024).toFixed(0)}KB)`);
  } catch (e) {
    toast('WebP 생성 실패: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = origLabel;
    render();
    ensureAnim();
  }
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
    if (r._numEl) r._numEl.value = r.value;
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
  syncControls(); renderRows(); renderTexts(); render(); ensureAnim();
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

// ---------------- 시작 ----------------
initUiTheme();
populatePatternSelects();
bindControls();
initPalette();
initFonts();
syncControls();
renderRows();
renderTexts();
initStickers();
updateMySpecsUI();
initCollapse();
initRangeNums();
// 시작할 때마다 색상 테마를 랜덤으로 (핑크 고정 X)
{
  const themeKeys = Object.keys(THEMES);
  applyTheme(themeKeys[Math.floor(Math.random() * themeKeys.length)]);
}
render();
pushHist(); // 초기 상태를 히스토리 기준점으로
refreshList();
initPreviewInfo();
initZoom();

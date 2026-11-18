import type { EffectLayer } from '../model/types';
import { heartPath, roundRectPath } from './geometry';

// 모든 효과는 phase(0..1)의 주기 함수다. phase 0과 1에서 같은 그림이 나와야
// 움직이는 WebP의 끝과 처음이 이어진다. speed는 그래서 정수(바퀴 수)다.

function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const frac = (v: number) => v - Math.floor(v);

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha))})`;
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const inner = r * 0.2;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const rad = (i * TAU) / 8 - Math.PI / 2;
    const d = i % 2 === 0 ? r : inner;
    if (i === 0) ctx.moveTo(x + Math.cos(rad) * d, y + Math.sin(rad) * d);
    else ctx.lineTo(x + Math.cos(rad) * d, y + Math.sin(rad) * d);
  }
  ctx.closePath();
  ctx.fill();
}

function sparkle(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const count = Math.round(6 + l.density * 40);
  for (let i = 0; i < count; i += 1) {
    const x = r() * l.w;
    const y = r() * l.h;
    const ph = r();
    const s = (3 + r() * 6) * l.size;
    const a = Math.sin(TAU * (p * l.speed + ph));
    if (a <= 0) continue;
    ctx.globalAlpha = Math.pow(a, 1.5);
    ctx.fillStyle = i % 2 === 0 ? l.color : l.color2;
    star(ctx, x, y, s * (0.6 + 0.4 * a));
  }
}

function starfield(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const count = Math.round(20 + l.density * 120);
  for (let i = 0; i < count; i += 1) {
    const x0 = r() * l.w;
    const y = r() * l.h;
    const rad = (0.6 + r() * 1.4) * l.size;
    const k = (1 + Math.floor(r() * 2)) * l.speed;
    const alpha = 0.35 + r() * 0.65;
    const x = frac((x0 - p * k * l.w) / l.w) * l.w;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 3 === 0 ? l.color2 : l.color;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fill();
  }
}

function shine(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const bw = (40 + 120 * l.density) * l.size;
  const skew = l.h * 0.6;
  const travel = l.w + bw * 2 + skew;
  const x = -bw - skew + frac(p * l.speed) * travel;
  const g = ctx.createLinearGradient(x, 0, x + bw, 0);
  g.addColorStop(0, rgba(l.color, 0));
  g.addColorStop(0.5, rgba(l.color, 0.6));
  g.addColorStop(1, rgba(l.color, 0));
  ctx.fillStyle = g;
  ctx.transform(1, 0, -skew / l.h, 1, skew, 0);
  ctx.fillRect(x, 0, bw, l.h);
}

function aurora(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const alpha = 0.2 + 0.6 * l.density;
  for (let i = 0; i < 3; i += 1) {
    const cx = l.w * (0.2 + 0.3 * i) + Math.sin(TAU * (p * l.speed + i / 3)) * l.w * 0.14;
    const cy = l.h * (0.5 + 0.28 * Math.sin(TAU * (p * l.speed + i * 0.37)));
    const rx = l.w * 0.34 * l.size;
    const ry = l.h * 0.62 * l.size;
    const color = i % 2 === 0 ? l.color : l.color2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function scanline(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const gap = Math.max(3, Math.round(3 + 5 * l.size));
  const offset = frac(p * l.speed * 4) * gap;
  ctx.fillStyle = rgba(l.color, 0.06 + 0.26 * l.density);
  for (let y = offset - gap; y < l.h; y += gap) ctx.fillRect(0, y, l.w, Math.max(1, gap * 0.4));
  const barH = l.h * 0.35;
  const y = frac(p * l.speed) * (l.h + barH) - barH;
  const g = ctx.createLinearGradient(0, y, 0, y + barH);
  g.addColorStop(0, rgba(l.color2, 0));
  g.addColorStop(1, rgba(l.color2, 0.12 + 0.3 * l.density));
  ctx.fillStyle = g;
  ctx.fillRect(0, y, l.w, barH);
}

function fall(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const count = Math.round(8 + l.density * 40);
  for (let i = 0; i < count; i += 1) {
    const x0 = r() * l.w;
    const y0 = r() * l.h;
    const s = (3 + r() * 5) * l.size;
    const k = (1 + Math.floor(r() * 2)) * l.speed;
    const ph = r();
    const alpha = 0.55 + r() * 0.45;
    const span = l.h + s * 4;
    const y = frac((y0 + p * k * span) / span) * span - s * 2;
    const x = x0 + Math.sin(TAU * (p * k + ph)) * 12 * l.size;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(TAU * (p * k + ph));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 2 === 0 ? l.color : l.color2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function borderRun(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number, px: number): void {
  const lw = 1 + 2.5 * l.size;
  const inset = lw / 2 + 1;
  const w = l.w - inset * 2;
  const h = l.h - inset * 2;
  if (w <= 0 || h <= 0) return;
  const r = Math.max(0, Math.min(l.radius - inset, w / 2, h / 2));
  const perimeter = 2 * (w - 2 * r) + 2 * (h - 2 * r) + TAU * r;
  const n = 1 + Math.round(l.density * 3);
  const period = perimeter / n;
  const seg = period * 0.38;
  roundRectPath(ctx, inset, inset, w, h, r);
  ctx.lineCap = 'round';
  ctx.setLineDash([seg, period - seg]);
  ctx.lineDashOffset = -p * l.speed * perimeter;
  ctx.shadowColor = l.color;
  ctx.shadowBlur = 10 * l.size * px;
  ctx.strokeStyle = l.color;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = l.color2;
  ctx.lineWidth = Math.max(1, lw * 0.4);
  ctx.stroke();
  ctx.setLineDash([]);
}

function borderPulse(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number, px: number): void {
  const lw = 1 + 2 * l.size;
  const inset = lw / 2 + 1;
  const pulse = 0.5 + 0.5 * Math.sin(TAU * p * l.speed);
  roundRectPath(ctx, inset, inset, l.w - inset * 2, l.h - inset * 2, l.radius - inset);
  ctx.globalAlpha = 0.3 + 0.7 * pulse;
  ctx.shadowColor = l.color;
  ctx.shadowBlur = (4 + 22 * pulse * (0.3 + l.density)) * l.size * px;
  ctx.strokeStyle = l.color;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = l.color2;
  ctx.lineWidth = Math.max(1, lw * 0.4);
  ctx.stroke();
}

function snow(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const count = Math.round(12 + l.density * 70);
  for (let i = 0; i < count; i += 1) {
    const x0 = r() * l.w;
    const y0 = r() * l.h;
    const s = (1.2 + r() * 2.6) * l.size;
    const k = (1 + Math.floor(r() * 2)) * l.speed;
    const ph = r();
    const span = l.h + s * 4;
    const y = frac((y0 + p * k * span) / span) * span - s * 2;
    const x = x0 + Math.sin(TAU * (p * k + ph)) * 9 * l.size;
    ctx.globalAlpha = 0.45 + r() * 0.5;
    ctx.fillStyle = i % 3 === 0 ? l.color2 : l.color;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, TAU);
    ctx.fill();
  }
}

function rain(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const count = Math.round(16 + l.density * 110);
  const lean = 0.22;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i += 1) {
    const x0 = r() * (l.w + l.h * lean);
    const y0 = r() * l.h;
    const len = (9 + r() * 14) * l.size;
    const k = (2 + Math.floor(r() * 2)) * l.speed;
    const span = l.h + len * 2;
    const y = frac((y0 + p * k * span) / span) * span - len;
    // 가로 위치는 세로 위치로만 정해서(같은 사선을 따라 떨어져서) 반복이 이어진다.
    const x = x0 - y * lean;
    ctx.globalAlpha = 0.25 + r() * 0.5;
    ctx.strokeStyle = i % 4 === 0 ? l.color2 : l.color;
    ctx.lineWidth = Math.max(0.8, 1.1 * l.size);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * lean, y + len);
    ctx.stroke();
  }
}

function hearts(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const count = Math.round(6 + l.density * 30);
  for (let i = 0; i < count; i += 1) {
    const x0 = r() * l.w;
    const y0 = r() * l.h;
    const s = (7 + r() * 9) * l.size;
    const k = (1 + Math.floor(r() * 2)) * l.speed;
    const ph = r();
    const span = l.h + s * 3;
    const y = l.h + s - frac((y0 + p * k * span) / span) * span;
    const x = x0 + Math.sin(TAU * (p * k + ph)) * 10 * l.size;
    ctx.globalAlpha = 0.5 + r() * 0.5;
    ctx.fillStyle = i % 2 === 0 ? l.color : l.color2;
    heartPath(ctx, x - s / 2, y - s / 2, s, s);
    ctx.fill();
  }
}

function bubbles(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const count = Math.round(5 + l.density * 26);
  for (let i = 0; i < count; i += 1) {
    const x0 = r() * l.w;
    const y0 = r() * l.h;
    const s = (4 + r() * 10) * l.size;
    const k = (1 + Math.floor(r() * 2)) * l.speed;
    const ph = r();
    const span = l.h + s * 4;
    const y = l.h + s * 2 - frac((y0 + p * k * span) / span) * span;
    const x = x0 + Math.sin(TAU * (p * k + ph)) * 8 * l.size;
    ctx.globalAlpha = 0.35 + r() * 0.4;
    ctx.strokeStyle = l.color;
    ctx.lineWidth = Math.max(1, s * 0.14);
    ctx.beginPath();
    ctx.arc(x, y, s, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = l.color2;
    ctx.beginPath();
    ctx.arc(x - s * 0.35, y - s * 0.35, s * 0.22, 0, TAU);
    ctx.fill();
  }
}

function fireflies(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const count = Math.round(5 + l.density * 28);
  for (let i = 0; i < count; i += 1) {
    const x0 = r() * l.w;
    const y0 = r() * l.h;
    const a = r();
    const b = r();
    const c = r();
    const k1 = (1 + Math.floor(r() * 2)) * l.speed;
    const k2 = (1 + Math.floor(r() * 2)) * l.speed;
    const rad = (5 + r() * 6) * l.size;
    const x = x0 + Math.sin(TAU * (p * k1 + a)) * 26;
    const y = y0 + Math.cos(TAU * (p * k2 + b)) * 16;
    const alpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(TAU * (p * 2 * l.speed + c)));
    const color = i % 2 === 0 ? l.color : l.color2;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(0.25, rgba(color, alpha * 0.7));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fill();
  }
}

function meteor(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const count = 2 + Math.round(l.density * 7);
  const show = 0.55;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i += 1) {
    const x0 = l.w * (0.25 + r() * 0.95);
    const ph = r();
    const tail = (50 + r() * 60) * l.size;
    const q = frac(p * l.speed + ph);
    if (q > show) continue;
    const u = q / show;
    const travel = l.h * 1.5 + tail;
    const hx = x0 - u * travel;
    const hy = -10 + u * travel * 0.62;
    const tx = hx + tail * 0.85;
    const ty = hy - tail * 0.53;
    const fade = Math.sin(Math.PI * u);
    const g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, rgba(l.color, fade));
    g.addColorStop(1, rgba(l.color2, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 2 * l.size;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }
}

function rays(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const n = 6 + Math.round(l.density * 14);
  const reach = Math.hypot(l.w, l.h);
  const step = TAU / n;
  const width = step * Math.min(0.9, 0.42 * l.size);
  ctx.translate(l.w / 2, l.h / 2);
  // 한 반복에 광선 간격의 정수배만큼만 돌려서 끝과 처음이 같은 그림이 된다.
  ctx.rotate(step * p * l.speed);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, reach / 2);
  g.addColorStop(0, rgba(l.color, 0.5));
  g.addColorStop(1, rgba(l.color, 0.06));
  ctx.fillStyle = g;
  for (let i = 0; i < n; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach, i * step, i * step + width);
    ctx.closePath();
    ctx.fill();
  }
}

function wave(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number, px: number): void {
  const lines = 1 + Math.round(l.density * 3);
  const amp = l.h * 0.11 * l.size;
  ctx.lineWidth = 1 + l.size;
  ctx.lineJoin = 'round';
  for (let i = 0; i < lines; i += 1) {
    const cy = (l.h * (i + 1)) / (lines + 1);
    const color = i % 2 === 0 ? l.color : l.color2;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6 * l.size * px;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let x = 0; x <= l.w; x += 4) {
      const u = x / l.w;
      const y = cy
        + amp * Math.sin(TAU * (u * 3 - p * l.speed + i * 0.27))
        + amp * 0.45 * Math.sin(TAU * (u * 7 + p * l.speed * 2 + i * 0.61));
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function bars(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const n = Math.round(10 + l.density * 44);
  const slot = l.w / n;
  const max = l.h * 0.38 * l.size;
  const g = ctx.createLinearGradient(0, l.h, 0, l.h - max);
  g.addColorStop(0, rgba(l.color, 0.85));
  g.addColorStop(1, rgba(l.color2, 0.85));
  ctx.fillStyle = g;
  for (let i = 0; i < n; i += 1) {
    const k = (1 + Math.floor(r() * 3)) * l.speed;
    const ph = r();
    const base = 0.25 + r() * 0.75;
    const hgt = max * base * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(TAU * (p * k + ph))));
    ctx.fillRect(i * slot + slot * 0.2, l.h - hgt, slot * 0.6, hgt);
  }
}

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789';

function matrix(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const r = rng(l.seed);
  const cell = Math.max(7, 13 * l.size);
  const cols = Math.ceil(l.w / cell);
  const rows = Math.ceil(l.h / cell);
  const tail = 9;
  ctx.font = `700 ${cell}px Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols; c += 1) {
    const active = r() < 0.25 + l.density * 0.75;
    const ph = r();
    const k = (1 + Math.floor(r() * 2)) * l.speed;
    const pick = Math.floor(r() * 997);
    if (!active) continue;
    const head = frac(p * k + ph) * (rows + tail);
    for (let row = 0; row < rows; row += 1) {
      const d = head - row;
      if (d < 0 || d > tail) continue;
      ctx.globalAlpha = d < 1 ? 1 : 0.75 * (1 - d / tail);
      ctx.fillStyle = d < 1 ? l.color2 : l.color;
      ctx.fillText(GLYPHS[(pick + row * 7 + c * 3) % GLYPHS.length], (c + 0.5) * cell, (row + 0.5) * cell);
    }
  }
}

/** 테두리 효과가 따라가는 안쪽 둥근 사각형. */
function borderTrack(l: EffectLayer, lw: number): { inset: number; w: number; h: number; r: number; perimeter: number } | null {
  const inset = lw / 2 + 1;
  const w = l.w - inset * 2;
  const h = l.h - inset * 2;
  if (w <= 0 || h <= 0) return null;
  const r = Math.max(0, Math.min(l.radius - inset, w / 2, h / 2));
  return { inset, w, h, r, perimeter: 2 * (w - 2 * r) + 2 * (h - 2 * r) + TAU * r };
}

function borderMarquee(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const lw = 1 + 2.2 * l.size;
  const t = borderTrack(l, lw);
  if (!t) return;
  const n = Math.max(4, Math.round(t.perimeter / ((10 + (1 - l.density) * 50) * l.size)));
  const period = t.perimeter / n;
  roundRectPath(ctx, t.inset, t.inset, t.w, t.h, t.r);
  ctx.lineWidth = lw;
  ctx.setLineDash([period / 2, period / 2]);
  ctx.lineDashOffset = -p * l.speed * period * 2;
  ctx.strokeStyle = l.color;
  ctx.stroke();
  ctx.lineDashOffset = -p * l.speed * period * 2 + period / 2;
  ctx.strokeStyle = l.color2;
  ctx.stroke();
  ctx.setLineDash([]);
}

function borderRainbow(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number): void {
  const lw = 1.5 + 3 * l.size;
  const t = borderTrack(l, lw);
  if (!t) return;
  const g = ctx.createConicGradient(TAU * p * l.speed, l.w / 2, l.h / 2);
  for (let i = 0; i <= 12; i += 1) g.addColorStop(i / 12, `hsl(${(i * 30) % 360} 100% 60%)`);
  roundRectPath(ctx, t.inset, t.inset, t.w, t.h, t.r);
  ctx.globalAlpha = 0.35 + 0.65 * l.density;
  ctx.strokeStyle = g;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function borderCorners(ctx: CanvasRenderingContext2D, l: EffectLayer, p: number, px: number): void {
  const lw = 1.5 + 2 * l.size;
  const t = borderTrack(l, lw);
  if (!t) return;
  const arm = Math.min(t.w, t.h) * (0.12 + 0.3 * l.density);
  const x1 = t.inset;
  const y1 = t.inset;
  const x2 = t.inset + t.w;
  const y2 = t.inset + t.h;
  const corners: [number, number, number, number][] = [[x1, y1, 1, 1], [x2, y1, -1, 1], [x2, y2, -1, -1], [x1, y2, 1, -1]];
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  corners.forEach(([cx, cy, sx, sy], i) => {
    const lit = Math.pow(Math.max(0, Math.cos(TAU * (p * l.speed - i / 4))), 2);
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * arm);
    ctx.arcTo(cx, cy, cx + sx * arm, cy, t.r);
    ctx.lineTo(cx + sx * arm, cy);
    ctx.globalAlpha = 0.3 + 0.7 * lit;
    ctx.strokeStyle = l.color;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 12 * lit * l.size * px;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = lit;
    ctx.strokeStyle = l.color2;
    ctx.lineWidth = Math.max(1, lw * 0.4);
    ctx.stroke();
    ctx.lineWidth = lw;
  });
}

const AREA: Partial<Record<EffectLayer['effect'], (ctx: CanvasRenderingContext2D, l: EffectLayer, p: number, px: number) => void>> = {
  sparkle, starfield, shine, aurora, scanline, fall, snow, rain, hearts, bubbles, fireflies, meteor, rays, wave, bars, matrix,
};
const BORDER: Partial<Record<EffectLayer['effect'], (ctx: CanvasRenderingContext2D, l: EffectLayer, p: number, px: number) => void>> = {
  borderRun, borderPulse, borderMarquee, borderRainbow, borderCorners,
};

/** 상자 왼쪽 위를 원점으로 효과를 그린다. px는 문서 1단위가 차지하는 실제 픽셀 수다. */
export function drawEffect(ctx: CanvasRenderingContext2D, layer: EffectLayer, phase: number, px: number): void {
  const p = frac(phase);
  ctx.save();
  const border = BORDER[layer.effect];
  if (border) border(ctx, layer, p, px);
  else {
    roundRectPath(ctx, 0, 0, layer.w, layer.h, layer.radius);
    ctx.clip();
    AREA[layer.effect]?.(ctx, layer, p, px);
  }
  ctx.restore();
}

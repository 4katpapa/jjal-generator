import type { EffectLayer } from '../model/types';
import { roundRectPath } from './geometry';

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

/** 상자 왼쪽 위를 원점으로 효과를 그린다. px는 문서 1단위가 차지하는 실제 픽셀 수다. */
export function drawEffect(ctx: CanvasRenderingContext2D, layer: EffectLayer, phase: number, px: number): void {
  const p = frac(phase);
  ctx.save();
  if (layer.effect === 'borderRun') borderRun(ctx, layer, p, px);
  else if (layer.effect === 'borderPulse') borderPulse(ctx, layer, p, px);
  else {
    roundRectPath(ctx, 0, 0, layer.w, layer.h, layer.radius);
    ctx.clip();
    if (layer.effect === 'sparkle') sparkle(ctx, layer, p);
    else if (layer.effect === 'starfield') starfield(ctx, layer, p);
    else if (layer.effect === 'shine') shine(ctx, layer, p);
    else if (layer.effect === 'aurora') aurora(ctx, layer, p);
    else if (layer.effect === 'scanline') scanline(ctx, layer, p);
    else fall(ctx, layer, p);
  }
  ctx.restore();
}

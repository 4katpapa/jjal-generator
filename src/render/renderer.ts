import type { Content, Doc, FillProps, ImageLayer, Layer, ShapeLayer } from '../model/types';
import { assetSrc, getImage } from './assets';
import { drawEffect } from './effects';
import { layerBox, roundRectPath, shapePath } from './geometry';
import { drawSpecLayer } from './spec';
import { drawTextLayer, linearGradient } from './text';

export interface RenderOpts {
  /** 초 단위 시간. 움직임 효과의 위치를 정한다. */
  t: number;
  /** 문서 1단위가 차지하는 픽셀 수(출력 배율 × 확대 × 화면 배율). */
  scale: number;
  /** 편집 화면 전용 표시(빈 사진 자리 등)를 그릴지. 출력에서는 끈다. */
  editor?: boolean;
  /** 프리셋 미리보기처럼 문서와 다른 내용을 끼워 그릴 때. */
  content?: Content;
}

interface Env {
  doc: Doc;
  content: Content;
  scale: number;
  phase: number;
  editor: boolean;
  pw: number;
  ph: number;
}

// 합성용 임시 캔버스. 같은 크기를 돌려 쓴다.
const pool: HTMLCanvasElement[] = [];

function acquire(w: number, h: number): CanvasRenderingContext2D {
  const canvas = pool.pop() ?? document.createElement('canvas');
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

function release(ctx: CanvasRenderingContext2D): void {
  if (pool.length < 8) pool.push(ctx.canvas);
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function paintFill(ctx: CanvasRenderingContext2D, fill: FillProps, w: number, h: number): void {
  ctx.globalAlpha *= fill.opacity;
  if (fill.type === 'solid') {
    ctx.fillStyle = fill.color;
    ctx.fill();
    return;
  }
  if (fill.type === 'linear') {
    ctx.fillStyle = linearGradient(ctx, w, h, fill.angle, fill.color, fill.color2);
    ctx.fill();
    return;
  }
  // 무늬: color2를 바탕으로 깔고 color로 무늬를 그린다.
  ctx.fillStyle = fill.color2;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = fill.color;
  const s = Math.max(2, fill.size);
  const reach = Math.hypot(w, h) / 2 + s * 2;
  ctx.translate(w / 2, h / 2);
  ctx.rotate((fill.angle * Math.PI) / 180);
  if (fill.type === 'dots') {
    for (let y = -reach; y <= reach; y += s) {
      for (let x = -reach; x <= reach; x += s) {
        ctx.beginPath();
        ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (fill.type === 'stripes') {
    for (let x = -reach; x <= reach; x += s) ctx.fillRect(x, -reach, s / 2, reach * 2);
  } else if (fill.type === 'grid') {
    const t = Math.max(1, s * 0.08);
    for (let x = -reach; x <= reach; x += s) ctx.fillRect(x, -reach, t, reach * 2);
    for (let y = -reach; y <= reach; y += s) ctx.fillRect(-reach, y, reach * 2, t);
  } else {
    for (let yi = Math.floor(-reach / s); yi * s <= reach; yi += 1) {
      for (let xi = Math.floor(-reach / s); xi * s <= reach; xi += 1) {
        if ((xi + yi) % 2 === 0) ctx.fillRect(xi * s, yi * s, s, s);
      }
    }
  }
}

function drawShape(ctx: CanvasRenderingContext2D, layer: ShapeLayer): void {
  shapePath(ctx, layer.shape, layer.w, layer.h, layer.radius, layer.slant);
  paintFill(ctx, layer.fill, layer.w, layer.h);
}

/** 이미지가 상자 안에서 그려지는 크기. 자르기 조작과 렌더러가 함께 쓴다. */
export function imageDrawSize(layer: ImageLayer, iw: number, ih: number): { dw: number; dh: number } {
  if (layer.fit === 'stretch') return { dw: layer.w * layer.zoom, dh: layer.h * layer.zoom };
  const s = layer.fit === 'cover' ? Math.max(layer.w / iw, layer.h / ih) : Math.min(layer.w / iw, layer.h / ih);
  return { dw: iw * s * layer.zoom, dh: ih * s * layer.zoom };
}

function drawImageLayer(ctx: CanvasRenderingContext2D, layer: ImageLayer, env: Env): void {
  const id = layer.slot === 'photo' ? env.content.photo : layer.asset;
  const img = getImage(assetSrc(env.doc, id));
  if (!img) {
    if (!env.editor) return;
    shapePath(ctx, layer.mask, layer.w, layer.h, layer.radius, layer.slant);
    ctx.fillStyle = 'rgba(127,127,127,0.28)';
    ctx.fill();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `700 ${Math.max(10, Math.min(18, layer.h / 6))}px "Nanum Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layer.slot === 'photo' ? '내 사진 자리' : '이미지 없음', layer.w / 2, layer.h / 2);
    return;
  }
  shapePath(ctx, layer.mask, layer.w, layer.h, layer.radius, layer.slant);
  ctx.clip();
  const { dw, dh } = imageDrawSize(layer, img.naturalWidth, img.naturalHeight);
  const filters: string[] = [];
  if (layer.brightness !== 100) filters.push(`brightness(${layer.brightness}%)`);
  if (layer.contrast !== 100) filters.push(`contrast(${layer.contrast}%)`);
  if (layer.saturation !== 100) filters.push(`saturate(${layer.saturation}%)`);
  if (layer.blur > 0) filters.push(`blur(${layer.blur * env.scale}px)`);
  if (filters.length) ctx.filter = filters.join(' ');
  ctx.translate(layer.w / 2 + layer.panX, layer.h / 2 + layer.panY);
  if (layer.flipH) ctx.scale(-1, 1);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
}

function drawContent(ctx: CanvasRenderingContext2D, layer: Exclude<Layer, { kind: 'group' }>, env: Env): void {
  const box = layerBox(layer, env.content);
  ctx.save();
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
  ctx.rotate((box.rot * Math.PI) / 180);
  ctx.translate(-box.w / 2, -box.h / 2);
  if (layer.kind === 'shape') drawShape(ctx, layer);
  else if (layer.kind === 'image') drawImageLayer(ctx, layer, env);
  else if (layer.kind === 'text') drawTextLayer(ctx, layer, env.content);
  else if (layer.kind === 'spec') drawSpecLayer(ctx, layer, env.content.specs);
  else drawEffect(ctx, layer, env.phase, env.scale);
  ctx.restore();
}

function needsComposite(layer: Layer): boolean {
  const s = layer.styles;
  const genericOutline = s.outline.on && s.outline.width > 0 && layer.kind !== 'text' && layer.kind !== 'spec';
  return s.shadow.on || s.glow.on || genericOutline || layer.opacity < 1 || layer.blend !== 'source-over';
}

/** src의 불투명한 부분을 한 색으로 칠한 사본을 만든다. */
function tinted(src: HTMLCanvasElement, color: string): CanvasRenderingContext2D {
  const t = acquire(src.width, src.height);
  t.drawImage(src, 0, 0);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = color;
  t.fillRect(0, 0, src.width, src.height);
  t.globalCompositeOperation = 'source-over';
  return t;
}

function drawLayer(ctx: CanvasRenderingContext2D, layer: Layer, env: Env): void {
  if (!layer.visible) return;
  if (!needsComposite(layer)) {
    if (layer.kind === 'group') layer.children.forEach((c) => drawLayer(ctx, c, env));
    else drawContent(ctx, layer, env);
    return;
  }

  // 1) 레이어 내용만 따로 그린다.
  let body = acquire(env.pw, env.ph);
  body.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  if (layer.kind === 'group') layer.children.forEach((c) => drawLayer(body, c, env));
  else drawContent(body, layer, env);
  body.setTransform(1, 0, 0, 1, 0, 0);

  const s = layer.styles;

  // 2) 글자가 아닌 레이어의 외곽선: 내용을 둘레 방향으로 찍어 넓힌 뒤 색을 입힌다.
  if (s.outline.on && s.outline.width > 0 && layer.kind !== 'text' && layer.kind !== 'spec') {
    const r = s.outline.width * env.scale;
    const steps = Math.max(8, Math.min(36, Math.ceil((Math.PI * 2 * r) / 1.5)));
    const ring = acquire(env.pw, env.ph);
    for (let i = 0; i < steps; i += 1) {
      const rad = (i * Math.PI * 2) / steps;
      ring.drawImage(body.canvas, Math.cos(rad) * r, Math.sin(rad) * r);
    }
    ring.globalCompositeOperation = 'source-in';
    ring.fillStyle = s.outline.color;
    ring.fillRect(0, 0, env.pw, env.ph);
    ring.globalCompositeOperation = 'source-over';
    ring.drawImage(body.canvas, 0, 0);
    release(body);
    body = ring;
  }

  // 3) 그림자·발광을 깔고 그 위에 내용을 얹는다. 흐림과 이동은 배율만큼 함께 커진다.
  const out = acquire(env.pw, env.ph);
  if (s.shadow.on) {
    const t = tinted(body.canvas, rgba(s.shadow.color, s.shadow.opacity));
    out.filter = s.shadow.blur > 0 ? `blur(${(s.shadow.blur * env.scale) / 2}px)` : 'none';
    out.drawImage(t.canvas, s.shadow.x * env.scale, s.shadow.y * env.scale);
    out.filter = 'none';
    release(t);
  }
  if (s.glow.on) {
    const t = tinted(body.canvas, s.glow.color);
    out.filter = `blur(${Math.max(0.5, (s.glow.blur * env.scale) / 2)}px)`;
    const full = Math.floor(s.glow.strength);
    for (let i = 0; i < full; i += 1) out.drawImage(t.canvas, 0, 0);
    const rest = s.glow.strength - full;
    if (rest > 0.01) {
      out.globalAlpha = rest;
      out.drawImage(t.canvas, 0, 0);
      out.globalAlpha = 1;
    }
    out.filter = 'none';
    release(t);
  }
  out.drawImage(body.canvas, 0, 0);
  release(body);

  // 4) 레이어 전체를 불투명도·혼합 방식으로 한 번에 합친다.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = layer.opacity;
  ctx.globalCompositeOperation = layer.blend;
  ctx.drawImage(out.canvas, 0, 0);
  ctx.restore();
  release(out);
}

export function canvasSize(doc: Doc, scale: number): { w: number; h: number } {
  return { w: Math.max(1, Math.round(doc.card.w * scale)), h: Math.max(1, Math.round(doc.card.h * scale)) };
}

/**
 * 문서를 그린다. 편집 화면·PNG·WebP 프레임이 모두 이 함수를 거친다.
 * 캔버스 크기는 canvasSize(doc, scale)과 같아야 한다.
 */
export function renderDoc(ctx: CanvasRenderingContext2D, doc: Doc, opts: RenderOpts): void {
  const { w: pw, h: ph } = canvasSize(doc, opts.scale);
  const env: Env = {
    doc,
    content: opts.content ?? doc.content,
    scale: opts.scale,
    phase: doc.anim.duration > 0 ? opts.t / doc.anim.duration : 0,
    editor: !!opts.editor,
    pw,
    ph,
  };
  const card = doc.card;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.clearRect(0, 0, pw, ph);
  if (card.matte.type === 'color') {
    ctx.fillStyle = card.matte.color;
    ctx.fillRect(0, 0, pw, ph);
  }
  ctx.save();
  ctx.setTransform(opts.scale, 0, 0, opts.scale, 0, 0);
  roundRectPath(ctx, 0, 0, card.w, card.h, card.radius);
  ctx.clip();
  for (const layer of doc.layers) drawLayer(ctx, layer, env);
  if (card.border.on && card.border.width > 0) {
    const bw = card.border.width;
    roundRectPath(ctx, bw / 2, bw / 2, card.w - bw, card.h - bw, card.radius - bw / 2);
    ctx.strokeStyle = card.border.color;
    ctx.lineWidth = bw;
    ctx.stroke();
  }
  ctx.restore();
}

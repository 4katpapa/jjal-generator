import type { Box, Content, Doc, Layer, OutlineShape } from '../model/types';
import { measureTextLayer } from './text';

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

/** 상자 왼쪽 위를 원점으로 한 외곽 경로. 도형과 이미지 마스크가 함께 쓴다. */
export function shapePath(ctx: CanvasRenderingContext2D, shape: OutlineShape, w: number, h: number, radius: number, slant: number): void {
  if (shape === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    return;
  }
  if (shape === 'slant') {
    const s = Math.max(-w, Math.min(w, slant));
    ctx.beginPath();
    if (s >= 0) {
      ctx.moveTo(s, 0); ctx.lineTo(w, 0); ctx.lineTo(w - s, h); ctx.lineTo(0, h);
    } else {
      ctx.moveTo(0, 0); ctx.lineTo(w + s, 0); ctx.lineTo(w, h); ctx.lineTo(-s, h);
    }
    ctx.closePath();
    return;
  }
  if (shape === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const rad = (i * Math.PI) / 5 - Math.PI / 2;
      const k = i % 2 === 0 ? 1 : 0.45;
      const x = w / 2 + Math.cos(rad) * (w / 2) * k;
      const y = h / 2 + Math.sin(rad) * (h / 2) * k;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    return;
  }
  if (shape === 'heart') {
    heartPath(ctx, 0, 0, w, h);
    return;
  }
  if (shape === 'bubble') {
    // 말풍선: 아래 20%를 꼬리 자리로 남긴 둥근 사각형 + 왼쪽 아래 꼬리.
    const bh = h * 0.8;
    const r = Math.max(0, Math.min(radius, w / 2, bh / 2));
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, bh, r);
    ctx.arcTo(w, bh, 0, bh, r);
    ctx.lineTo(w * 0.36, bh);
    ctx.lineTo(w * 0.16, h);
    ctx.lineTo(w * 0.2, bh);
    ctx.arcTo(0, bh, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    return;
  }
  roundRectPath(ctx, 0, 0, w, h, radius);
}

/** (x, y)를 왼쪽 위로 하는 w×h 상자에 꽉 차는 하트. 새 경로를 시작한다. */
export function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + h);
  ctx.bezierCurveTo(x - w * 0.12, y + h * 0.62, x + w * 0.02, y - h * 0.08, x + w / 2, y + h * 0.26);
  ctx.bezierCurveTo(x + w * 0.98, y - h * 0.08, x + w * 1.12, y + h * 0.62, x + w / 2, y + h);
  ctx.closePath();
}

export interface Rect { x: number; y: number; w: number; h: number }

export function boxCorners(b: Box): [number, number][] {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rad = (b.rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const lx = (sx * b.w) / 2;
    const ly = (sy * b.h) / 2;
    return [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos];
  });
}

export function boxBounds(b: Box): Rect {
  const pts = boxCorners(b);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function unionRects(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.w));
  const y2 = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

/** 레이어가 화면에서 차지하는 상자. 텍스트는 내용에서 계산하고 그룹은 자식을 감싼다. */
export function layerBox(layer: Layer, content: Content): Box {
  if (layer.kind === 'text') {
    const m = measureTextLayer(layer, content);
    const x = layer.align === 'left' || layer.vertical ? layer.x : layer.align === 'center' ? layer.x - m.w / 2 : layer.x - m.w;
    return { x, y: layer.y, w: m.w, h: m.h, rot: layer.rot };
  }
  if (layer.kind === 'group') {
    const r = unionRects(layer.children.map((c) => boxBounds(layerBox(c, content))));
    return { ...r, rot: 0 };
  }
  return { x: layer.x, y: layer.y, w: layer.w, h: layer.h, rot: layer.rot };
}

export function pointInBox(px: number, py: number, b: Box, pad = 0): boolean {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rad = (-b.rot * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(lx) <= b.w / 2 + pad && Math.abs(ly) <= b.h / 2 + pad;
}

/**
 * 캔버스 클릭 위치에서 맨 위 레이어를 찾는다.
 * 숨김·잠금 레이어와 효과 레이어는 건너뛴다(효과는 레이어 패널에서 고른다).
 */
export function hitTest(doc: Doc, px: number, py: number): string | null {
  const visit = (layers: Layer[]): string | null => {
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      const layer = layers[i];
      if (!layer.visible || layer.locked) continue;
      if (layer.kind === 'group') {
        const hit = visit(layer.children);
        if (hit) return hit;
        continue;
      }
      if (layer.kind === 'effect') continue;
      if (pointInBox(px, py, layerBox(layer, doc.content), 3)) return layer.id;
    }
    return null;
  };
  return visit(doc.layers);
}

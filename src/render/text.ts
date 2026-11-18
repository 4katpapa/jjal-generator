import type { Content, TextLayer } from '../model/types';

let mctx: CanvasRenderingContext2D | null = null;

function measureCtx(): CanvasRenderingContext2D | null {
  if (mctx) return mctx;
  if (typeof document === 'undefined') return null;
  mctx = document.createElement('canvas').getContext('2d');
  return mctx;
}

export function fontCss(font: string, size: number, bold: boolean, italic = false): string {
  return `${italic ? 'italic ' : ''}${bold ? 700 : 400} ${size}px "${font}", "Nanum Gothic", "Malgun Gothic", "Segoe UI Emoji", sans-serif`;
}

export function setSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

export function textWidth(text: string, css: string, letterSpacing = 0): number {
  const ctx = measureCtx();
  if (!ctx) return text.length * 10;
  ctx.font = css;
  setSpacing(ctx, letterSpacing);
  return ctx.measureText(text).width;
}

export function textOf(layer: TextLayer, content: Content): string {
  return layer.slot === 'nickname' ? content.nickname : layer.text;
}

export interface TextMetrics {
  w: number;
  h: number;
  lines: string[];
  lineH: number;
  step: number;
}

export function measureTextLayer(layer: TextLayer, content: Content): TextMetrics {
  const lines = textOf(layer, content).split('\n');
  const lineH = layer.size * layer.lineHeight;
  const step = layer.size * 1.05 + layer.letterSpacing;
  if (layer.vertical) {
    const longest = Math.max(1, ...lines.map((l) => Array.from(l).length));
    return { w: Math.max(4, lines.length * lineH), h: Math.max(4, longest * step), lines, lineH, step };
  }
  const css = fontCss(layer.font, layer.size, layer.bold, layer.italic);
  const w = Math.max(4, ...lines.map((l) => textWidth(l, css, layer.letterSpacing)));
  return { w, h: Math.max(4, lines.length * lineH), lines, lineH, step };
}

export function linearGradient(
  ctx: CanvasRenderingContext2D, w: number, h: number, angle: number, c1: string, c2: string,
): CanvasGradient {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const g = ctx.createLinearGradient(w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

/** 상자 왼쪽 위를 원점으로 텍스트를 그린다. 외곽선은 글자 모양을 따라 직접 긋는다. */
export function drawTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer, content: Content): void {
  const m = measureTextLayer(layer, content);
  ctx.font = fontCss(layer.font, layer.size, layer.bold, layer.italic);
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const fill = layer.gradient.on
    ? linearGradient(ctx, m.w, m.h, layer.gradient.angle, layer.color, layer.gradient.color2)
    : layer.color;
  const outline = layer.styles.outline;

  const each = (fn: (text: string, x: number, y: number) => void) => {
    if (layer.vertical) {
      ctx.textAlign = 'center';
      setSpacing(ctx, 0);
      m.lines.forEach((line, col) => {
        const x = m.w - (col + 0.5) * m.lineH;
        Array.from(line).forEach((ch, i) => fn(ch, x, (i + 0.5) * m.step));
      });
      return;
    }
    ctx.textAlign = layer.align;
    setSpacing(ctx, layer.letterSpacing);
    const x = layer.align === 'left' ? 0 : layer.align === 'center' ? m.w / 2 : m.w;
    m.lines.forEach((line, i) => fn(line, x, (i + 0.5) * m.lineH));
  };

  if (outline.on && outline.width > 0) {
    ctx.strokeStyle = outline.color;
    ctx.lineWidth = outline.width * 2;
    each((text, x, y) => ctx.strokeText(text, x, y));
  }
  ctx.fillStyle = fill;
  each((text, x, y) => ctx.fillText(text, x, y));
  setSpacing(ctx, 0);
}

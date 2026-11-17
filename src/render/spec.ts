import type { IconKind, SpecLayer, SpecRow } from '../model/types';
import { resolveIcon } from '../model/specs';
import { getImage, iconUrl } from './assets';
import { fontCss, textWidth } from './text';

export interface SpecItem {
  row: SpecRow;
  col: number;
  y: number;
  h: number;
  icon: IconKind | null;
  lines: string[];
}

export interface SpecLayout {
  /** 실제로 그려지는 글자 크기. 자동 맞춤이 줄였으면 layer.size보다 작다. */
  fontSize: number;
  shrunk: boolean;
  overflow: boolean;
  lineH: number;
  iconSize: number;
  colW: number;
  /** 열마다 값이 시작하는 x(열 왼쪽 기준). */
  valueX: number[];
  labelX: number;
  offsetY: number;
  items: SpecItem[];
}

const MIN_SIZE = 6;

function visibleRows(rows: SpecRow[]): SpecRow[] {
  return rows.filter((r) => r.label.trim() || r.value.trim());
}

function compute(layer: SpecLayer, rows: SpecRow[], size: number): SpecLayout & { fits: boolean } {
  const lineH = size * layer.lineHeight;
  const iconSize = layer.icons.on ? size * layer.icons.scale : 0;
  const iconGap = layer.icons.on ? size * 0.35 : 0;
  const innerW = Math.max(1, layer.w - layer.padding * 2);
  const innerH = Math.max(1, layer.h - layer.padding * 2);
  const cols = layer.columns === 2 && rows.length > 1 ? 2 : 1;
  const colW = cols === 2 ? (innerW - layer.colGap) / 2 : innerW;
  const firstCount = cols === 2 ? Math.ceil(rows.length / 2) : rows.length;
  const labelCss = fontCss(layer.font, size, layer.labelBold);
  const valueCss = fontCss(layer.font, size, layer.valueBold);

  const items: SpecItem[] = [];
  const valueX: number[] = [];
  let fits = true;
  let maxColH = 0;
  for (let c = 0; c < cols; c += 1) {
    const part = c === 0 ? rows.slice(0, firstCount) : rows.slice(firstCount);
    const labelW = layer.labelWidth > 0
      ? layer.labelWidth
      : Math.max(0, ...part.map((r) => textWidth(r.label, labelCss)));
    const vx = iconSize + iconGap + labelW + (labelW > 0 ? layer.gap : 0);
    valueX.push(vx);
    let y = 0;
    for (const row of part) {
      const lines = row.value.split('\n');
      const h = Math.max(lineH, iconSize) + (lines.length - 1) * lineH;
      const valueW = Math.max(0, ...lines.map((l) => textWidth(l, valueCss)));
      if (vx + valueW > colW + 0.5) fits = false;
      items.push({ row, col: c, y, h, icon: layer.icons.on ? resolveIcon(row) : null, lines });
      y += h;
    }
    maxColH = Math.max(maxColH, y);
  }
  if (maxColH > innerH + 0.5) fits = false;
  const slack = innerH - maxColH;
  const offsetY = layer.padding + (layer.valign === 'top' ? 0 : layer.valign === 'middle' ? slack / 2 : slack);
  return {
    fontSize: size, shrunk: false, overflow: !fits, lineH, iconSize, colW, valueX,
    labelX: iconSize + iconGap, offsetY, items, fits,
  };
}

/** 사양 목록의 배치를 계산한다. 속성 패널이 실제 적용 크기를 보여줄 때도 같은 함수를 쓴다. */
export function layoutSpec(layer: SpecLayer, allRows: SpecRow[]): SpecLayout {
  const rows = visibleRows(allRows);
  const full = compute(layer, rows, layer.size);
  if (!layer.autoFit || full.fits || layer.size <= MIN_SIZE) return full;
  let lo = MIN_SIZE;
  let hi = layer.size;
  let best = compute(layer, rows, MIN_SIZE);
  if (!best.fits) return { ...best, shrunk: true, overflow: true };
  for (let i = 0; i < 12; i += 1) {
    const mid = (lo + hi) / 2;
    const trial = compute(layer, rows, mid);
    if (trial.fits) { best = trial; lo = mid; } else { hi = mid; }
  }
  return { ...best, shrunk: true, overflow: false };
}

export function drawSpecLayer(ctx: CanvasRenderingContext2D, layer: SpecLayer, rows: SpecRow[]): void {
  const lay = layoutSpec(layer, rows);
  const labelCss = fontCss(layer.font, lay.fontSize, layer.labelBold);
  const valueCss = fontCss(layer.font, lay.fontSize, layer.valueBold);
  const outline = layer.styles.outline;
  const stroke = outline.on && outline.width > 0;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const pass = (mode: 'stroke' | 'fill') => {
    for (const item of lay.items) {
      const x0 = layer.padding + item.col * (lay.colW + layer.colGap);
      const firstMid = lay.offsetY + item.y + Math.max(lay.lineH, lay.iconSize) / 2;
      if (mode === 'fill' && item.icon) {
        const img = getImage(iconUrl(layer.icons.set, item.icon));
        if (img) ctx.drawImage(img, x0, firstMid - lay.iconSize / 2, lay.iconSize, lay.iconSize);
      }
      if (item.row.label) {
        ctx.font = labelCss;
        if (mode === 'stroke') ctx.strokeText(item.row.label, x0 + lay.labelX, firstMid);
        else { ctx.fillStyle = layer.labelColor; ctx.fillText(item.row.label, x0 + lay.labelX, firstMid); }
      }
      ctx.font = valueCss;
      if (mode === 'fill') ctx.fillStyle = item.row.color ?? layer.valueColor;
      item.lines.forEach((line, i) => {
        const y = firstMid + i * lay.lineH;
        if (mode === 'stroke') ctx.strokeText(line, x0 + lay.valueX[item.col], y);
        else ctx.fillText(line, x0 + lay.valueX[item.col], y);
      });
    }
  };

  if (stroke) {
    ctx.strokeStyle = outline.color;
    ctx.lineWidth = outline.width * 2;
    pass('stroke');
  }
  pass('fill');
}

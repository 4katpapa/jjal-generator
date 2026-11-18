import { produce } from 'immer';
import type { Doc } from '../model/types';
import { findLayer } from '../model/ops';
import { canvasSize, renderDoc } from '../render/renderer';

let canvasA: HTMLCanvasElement | null = null;
let canvasB: HTMLCanvasElement | null = null;

function draw(canvas: HTMLCanvasElement, doc: Doc, t: number, scale: number): Uint8ClampedArray {
  const size = canvasSize(doc, scale);
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  renderDoc(ctx, doc, { t, scale, editor: false });
  return ctx.getImageData(0, 0, size.w, size.h).data;
}

/**
 * 이 레이어의 혼합 방식이 지금 그림에서 '보통'과 같은 결과인지 작게 그려서 비교한다.
 * (예: 흰 글자에 '스크린', 아래에 아무것도 없는 곳의 '곱하기')
 */
export function blendHasNoEffect(doc: Doc, layerId: string, t: number): boolean {
  const hit = findLayer(doc.layers, layerId);
  if (!hit || hit.layer.blend === 'source-over' || !hit.layer.visible) return false;
  canvasA ??= document.createElement('canvas');
  canvasB ??= document.createElement('canvas');
  const scale = Math.min(1, 320 / doc.card.w);
  const plain = produce(doc, (d) => { findLayer(d.layers, layerId)!.layer.blend = 'source-over'; });
  const a = draw(canvasA, doc, t, scale);
  const b = draw(canvasB, plain, t, scale);
  for (let i = 0; i < a.length; i += 1) if (Math.abs(a[i] - b[i]) > 1) return false;
  return true;
}

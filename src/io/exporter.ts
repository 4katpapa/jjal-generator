import type { Doc } from '../model/types';
import { ensureDocAssets } from '../render/assets';
import { canvasSize, renderDoc } from '../render/renderer';
import { encodeGif, type GifFrame } from './gif';
import { muxAnimatedWebp, type WebpFrame } from './webpAnim';

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했습니다.'))), type, quality);
  });
}

/** 출력용 캔버스에 한 장을 그린다. 편집 화면과 같은 렌더러를 쓴다. */
export async function renderFrame(doc: Doc, scale: number, t: number, canvas?: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  await ensureDocAssets(doc);
  const target = canvas ?? document.createElement('canvas');
  const size = canvasSize(doc, scale);
  if (target.width !== size.w || target.height !== size.h) {
    target.width = size.w;
    target.height = size.h;
  }
  renderDoc(target.getContext('2d')!, doc, { t, scale, editor: false });
  return target;
}

export async function exportPng(doc: Doc, scale: number, t: number): Promise<Blob> {
  return toBlob(await renderFrame(doc, scale, t), 'image/png');
}

/** quality 1은 무손실이다. */
export async function exportWebp(doc: Doc, scale: number, t: number, quality: number): Promise<Blob> {
  return toBlob(await renderFrame(doc, scale, t), 'image/webp', quality);
}

export interface AnimOptions {
  scale: number;
  fps: number;
  quality: number;
  onProgress?: (done: number, total: number) => void;
}

export function frameCount(doc: Doc, fps: number): number {
  return Math.max(2, Math.round(doc.anim.duration * fps));
}

/** 반복 구간 한 바퀴를 프레임으로 나눠 움직이는 WebP로 만든다. 마지막 프레임 다음이 첫 프레임으로 이어진다. */
export async function exportAnimatedWebp(doc: Doc, opts: AnimOptions): Promise<Blob> {
  const total = frameCount(doc, opts.fps);
  const canvas = document.createElement('canvas');
  const frames: WebpFrame[] = [];
  const totalMs = doc.anim.duration * 1000;
  for (let i = 0; i < total; i += 1) {
    await renderFrame(doc, opts.scale, (i / total) * doc.anim.duration, canvas);
    const blob = await toBlob(canvas, 'image/webp', opts.quality);
    // 프레임 시간을 정수 ms로 나누되 합계가 반복 길이와 정확히 같도록 누적 반올림한다.
    const duration = Math.round(((i + 1) * totalMs) / total) - Math.round((i * totalMs) / total);
    frames.push({ data: new Uint8Array(await blob.arrayBuffer()), duration });
    opts.onProgress?.(i + 1, total);
    if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
  }
  const bytes = muxAnimatedWebp(frames, canvas.width, canvas.height, 0);
  return new Blob([bytes as BlobPart], { type: 'image/webp' });
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function safeName(name: string, fallback = '자짤'): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60);
  return cleaned || fallback;
}

/** 움직이는 GIF. WebP를 받지 않는 곳에 올릴 때 쓴다(256색이라 그라디언트가 거칠어질 수 있다). */
export async function exportGif(doc: Doc, opts: Omit<AnimOptions, 'quality'>): Promise<Blob> {
  const total = frameCount(doc, opts.fps);
  const canvas = document.createElement('canvas');
  const frames: GifFrame[] = [];
  const totalMs = doc.anim.duration * 1000;
  for (let i = 0; i < total; i += 1) {
    await renderFrame(doc, opts.scale, (i / total) * doc.anim.duration, canvas);
    const ctx = canvas.getContext('2d')!;
    frames.push({ data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, duration: totalMs / total });
    opts.onProgress?.(i + 1, total);
    if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
  }
  return new Blob([encodeGif(frames, canvas.width, canvas.height) as BlobPart], { type: 'image/gif' });
}

export function sizeText(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

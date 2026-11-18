import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Doc, Layer } from '../model/types';
import { defaultCard, emptyDoc, makeEffect, makeGroup, makeImage, makeShape, makeSpec, makeText } from '../model/factory';
import { walk } from '../model/ops';

/** 옛 버전에서 저장한 레이어에 없는 항목을 지금 기본값으로 채운다(두 단계 깊이까지). */
export function fillDefaults(layer: Layer): void {
  const model: Layer = layer.kind === 'shape' ? makeShape()
    : layer.kind === 'image' ? makeImage()
      : layer.kind === 'text' ? makeText()
        : layer.kind === 'spec' ? makeSpec()
          : layer.kind === 'effect' ? makeEffect('sparkle', defaultCard())
            : makeGroup([]);
  const fill = (target: Record<string, unknown>, source: Record<string, unknown>, depth: number) => {
    for (const [key, value] of Object.entries(source)) {
      if (key === 'id' || key === 'children') continue;
      if (target[key] === undefined) target[key] = structuredClone(value);
      else if (depth < 2 && value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object') {
        fill(target[key] as Record<string, unknown>, value as Record<string, unknown>, depth + 1);
      }
    }
  };
  fill(layer as unknown as Record<string, unknown>, model as unknown as Record<string, unknown>, 0);
}

// 저장 파일(.jjal)은 zip 한 개다: doc.json + 사용자가 넣은 이미지 파일들.
// 이미지를 JSON 안에 문자열로 넣지 않아서 파일이 가볍고, 일부가 깨져도 나머지를 살릴 수 있다.

const EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
};
const MIME: Record<string, string> = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

function dataUrlToBytes(url: string): { bytes: Uint8Array; mime: string } {
  const m = url.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!m) throw new Error('이미지 데이터를 읽지 못했습니다.');
  if (!m[2]) return { bytes: strToU8(decodeURIComponent(m[3])), mime: m[1] };
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime: m[1] };
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, i + step));
  return `data:${mime};base64,${btoa(bin)}`;
}

export function packDoc(doc: Doc): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const copy = structuredClone(doc);
  for (const asset of Object.values(copy.assets)) {
    if (asset.builtin || !asset.src.startsWith('data:')) continue;
    const { bytes, mime } = dataUrlToBytes(asset.src);
    const path = `assets/${asset.id}.${EXT[mime] ?? 'bin'}`;
    files[path] = bytes;
    asset.src = path;
  }
  files['doc.json'] = strToU8(JSON.stringify({ app: 'jjal-studio', format: 1, doc: copy }, null, 1));
  return zipSync(files, { level: 6 });
}

/** 불러온 문서에서 빠진 항목을 기본값으로 채운다(나중 버전에서 항목이 늘어도 옛 파일이 열리도록). */
export function normalizeDoc(raw: unknown): Doc {
  const base = emptyDoc();
  const doc = raw as Partial<Doc> | null;
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.layers) || !doc.card || !doc.content) {
    throw new Error('자짤 스튜디오 문서가 아닙니다.');
  }
  const layers = structuredClone(doc.layers) as Layer[];
  walk(layers, fillDefaults);
  const frame = (key: 'border' | 'deco') => ({ ...base.card[key], ...(doc.card as Partial<Doc['card']>)[key] });
  return {
    ...base,
    ...doc,
    layers,
    version: 1,
    name: typeof doc.name === 'string' ? doc.name : '',
    card: { ...base.card, ...doc.card, border: frame('border'), deco: frame('deco'), matte: { ...base.card.matte, ...doc.card.matte } },
    content: { ...base.content, ...doc.content, specs: Array.isArray(doc.content.specs) ? doc.content.specs : base.content.specs },
    assets: doc.assets ?? {},
    anim: { ...base.anim, ...doc.anim },
  } as Doc;
}

export function unpackDoc(bytes: Uint8Array): Doc {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error('파일을 열지 못했습니다(.jjal 파일이 아니거나 손상됨).');
  }
  if (!files['doc.json']) throw new Error('파일 안에 문서가 없습니다.');
  const parsed = JSON.parse(strFromU8(files['doc.json'])) as { doc?: unknown };
  const doc = normalizeDoc(parsed.doc);
  for (const asset of Object.values(doc.assets)) {
    if (asset.builtin || asset.src.startsWith('data:')) continue;
    const file = files[asset.src];
    if (!file) continue;
    const ext = asset.src.split('.').pop() ?? '';
    asset.src = bytesToDataUrl(file, MIME[ext] ?? 'application/octet-stream');
  }
  return doc;
}

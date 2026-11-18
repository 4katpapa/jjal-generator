import type { Card, Doc, EffectType, ImageLayer, Layer } from '../model/types';
import { fillDefaults } from '../io/file';
import { defaultCard, defaultContent, emptyDoc, makeEffect, makeImage, makeShape, makeSpec, makeText, uid } from '../model/factory';
import {
  cloneLayer, duplicateLayer, findLayer, flatten, groupLayers, insertLayer, pruneAssets, removeLayer,
  shiftLayer, toEdge, translateLayer, ungroupLayer, walk,
} from '../model/ops';
import type { PresetData } from '../presets/builtin';
import { PRESETS } from '../presets/builtin';
import { backgroundUrl, loadImage } from '../render/assets';
import { boxBounds, layerBox, unionRects } from '../render/geometry';
import { toast, useEditor } from './store';

const S = () => useEditor.getState();

export interface BgMeta {
  id: string;
  name: string;
  category: string;
  tone: 'light' | 'mid' | 'dark';
  lum: number;
  color: string;
}

function topSelected(): string | null {
  const { selection } = S();
  return selection.length ? selection[selection.length - 1] : null;
}

export function addLayer(layer: Layer): void {
  const above = topSelected();
  S().apply((d) => insertLayer(d, layer, above));
  S().select([layer.id]);
}

export function addText(): void {
  const { doc } = S();
  addLayer(makeText({ x: Math.round(doc.card.w / 2 - 60), y: Math.round(doc.card.h / 2 - 18) }));
}

export type ShapeKit = 'panel' | 'band' | 'slantBand' | 'pattern' | 'divider' | 'circle' | 'bubble' | 'heart' | 'star';

export const SHAPE_KITS: { id: ShapeKit; icon: string; name: string; hint: string }[] = [
  { id: 'panel', icon: '▢', name: '반투명 패널', hint: '글자 뒤에 깔아 읽기 쉽게' },
  { id: 'band', icon: '▬', name: '가로 띠', hint: '카드 폭 전체를 가로지르는 띠' },
  { id: 'slantBand', icon: '▰', name: '기울인 띠', hint: '사진과 사양 사이 경계' },
  { id: 'pattern', icon: '▦', name: '무늬 덮개', hint: '카드 전체에 무늬만 얹기' },
  { id: 'divider', icon: '─', name: '구분선', hint: '얇은 선' },
  { id: 'circle', icon: '●', name: '원', hint: '' },
  { id: 'bubble', icon: '🗨', name: '말풍선', hint: '' },
  { id: 'heart', icon: '♥', name: '하트', hint: '' },
  { id: 'star', icon: '★', name: '별', hint: '' },
];

/** 자주 쓰는 용도별로 미리 맞춰 둔 도형을 추가한다. 추가한 뒤에는 평범한 도형 레이어다. */
export function addShapeKit(kit: ShapeKit): void {
  const { w, h } = S().doc.card;
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);
  const make = {
    panel: () => makeShape({ name: '패널', x: cx - 170, y: cy - 100, w: 340, h: 200, radius: 14, fill: { color: '#0b1020', opacity: 0.55 } }),
    band: () => makeShape({ name: '가로 띠', x: 0, y: cy - 28, w, h: 56, radius: 0, fill: { type: 'linear', color: '#4f8cff', color2: '#b06cff', angle: 0, opacity: 0.9 } }),
    slantBand: () => makeShape({ name: '기울인 띠', shape: 'slant', x: cx - 100, y: -10, w: 220, h: h + 20, slant: 110, fill: { type: 'linear', color: '#ff3d81', color2: '#7a5cff', angle: 90, opacity: 0.9 } }),
    pattern: () => makeShape({ name: '무늬 덮개', x: 0, y: 0, w, h, radius: 0, fill: { type: 'dots', color: '#ffffff', size: 22, angle: 20, opacity: 0.35, base: false } }),
    divider: () => makeShape({ name: '구분선', x: cx - 150, y: cy - 1, w: 300, h: 3, radius: 2, fill: { color: '#ffffff', opacity: 0.8 } }),
    circle: () => makeShape({ name: '원', shape: 'ellipse', x: cx - 60, y: cy - 60, w: 120, h: 120 }),
    bubble: () => makeShape({ name: '말풍선', shape: 'bubble', x: cx - 90, y: cy - 60, w: 180, h: 120, radius: 18, fill: { color: '#ffffff' } }),
    heart: () => makeShape({ name: '하트', shape: 'heart', x: cx - 45, y: cy - 42, w: 90, h: 84, fill: { color: '#ff6fa5' } }),
    star: () => makeShape({ name: '별', shape: 'star', x: cx - 45, y: cy - 45, w: 90, h: 90, fill: { color: '#ffd166' } }),
  };
  addLayer(make[kit]());
}

/** 이모티콘·기호를 텍스트 레이어로 추가한다. 크기·회전·외곽선은 다른 텍스트와 똑같이 다룬다. */
export function addEmoji(char: string): void {
  const { doc } = S();
  addLayer(makeText({
    name: `이모티콘 ${char}`, text: char, size: 44, bold: false,
    x: Math.round(doc.card.w / 2 - 22), y: Math.round(doc.card.h / 2 - 28),
  }));
}

export function addSpec(): void {
  addLayer(makeSpec());
}

export function addEffect(effect: EffectType): void {
  const layer = makeEffect(effect, S().doc.card);
  S().apply((d) => { d.layers.push(layer); });
  S().select([layer.id]);
  S().set({ playing: true });
}

const MAX_IMAGE_SIDE = 2600;

/** 파일을 data URL로 읽는다. 너무 큰 사진은 저장·복구가 느려지지 않도록 줄여서 담는다. */
export async function fileToDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await loadImage(raw);
  if (!img) throw new Error('이미지를 읽지 못했습니다.');
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (longest <= MAX_IMAGE_SIDE) return raw;
  const k = MAX_IMAGE_SIDE / longest;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * k);
  canvas.height = Math.round(img.naturalHeight * k);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.92);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

async function importAsset(file: File): Promise<{ id: string; name: string; src: string; w: number; h: number } | null> {
  try {
    const src = await fileToDataUrl(file);
    const img = await loadImage(src);
    if (!img) throw new Error('이미지를 읽지 못했습니다.');
    return { id: uid('a'), name: file.name, src, w: img.naturalWidth, h: img.naturalHeight };
  } catch (err) {
    toast(`이미지를 넣지 못했습니다: ${(err as Error).message}`);
    return null;
  }
}

export async function addImageFromFile(file: File): Promise<void> {
  const asset = await importAsset(file);
  if (!asset) return;
  const { doc } = S();
  const fit = Math.min((doc.card.w * 0.5) / asset.w, (doc.card.h * 0.8) / asset.h, 1);
  const w = Math.round(asset.w * fit);
  const h = Math.round(asset.h * fit);
  const layer = makeImage({
    name: asset.name.replace(/\.[^.]+$/, '').slice(0, 24) || '이미지',
    asset: asset.id, x: Math.round((doc.card.w - w) / 2), y: Math.round((doc.card.h - h) / 2), w, h,
  });
  const above = topSelected();
  S().apply((d) => {
    d.assets[asset.id] = { id: asset.id, name: asset.name, src: asset.src, builtin: false };
    insertLayer(d, layer, above);
  });
  S().select([layer.id]);
}

export async function replaceImage(layerId: string, file: File): Promise<void> {
  const asset = await importAsset(file);
  if (!asset) return;
  S().apply((d) => {
    const hit = findLayer(d.layers, layerId);
    if (!hit || hit.layer.kind !== 'image') return;
    d.assets[asset.id] = { id: asset.id, name: asset.name, src: asset.src, builtin: false };
    if (hit.layer.slot === 'photo') d.content.photo = asset.id;
    else hit.layer.asset = asset.id;
    hit.layer.panX = 0;
    hit.layer.panY = 0;
    hit.layer.zoom = 1;
    pruneAssets(d);
  });
}

export async function setPhoto(file: File): Promise<void> {
  const asset = await importAsset(file);
  if (!asset) return;
  S().apply((d) => {
    d.assets[asset.id] = { id: asset.id, name: asset.name, src: asset.src, builtin: false };
    d.content.photo = asset.id;
    pruneAssets(d);
  });
}

export function clearPhoto(): void {
  S().apply((d) => { d.content.photo = null; pruneAssets(d); });
}

export function deleteSelection(): void {
  const { selection } = S();
  if (!selection.length) return;
  S().apply((d) => {
    selection.forEach((id) => removeLayer(d, id));
    pruneAssets(d);
  });
}

export function duplicateSelection(): void {
  const { selection } = S();
  if (!selection.length) return;
  const made: string[] = [];
  S().apply((d) => {
    selection.forEach((id) => {
      const copy = duplicateLayer(d, id);
      if (copy) made.push(copy);
    });
  });
  S().select(made);
}

export function groupSelection(): void {
  const { selection } = S();
  if (!selection.length) return;
  let groupId: string | null = null;
  S().apply((d) => { groupId = groupLayers(d, selection); });
  if (groupId) S().select([groupId]);
}

export function ungroupSelection(): void {
  const { selection } = S();
  let ids: string[] = [];
  S().apply((d) => { selection.forEach((id) => { ids = ids.concat(ungroupLayer(d, id)); }); });
  if (ids.length) S().select(ids);
}

export function reorderSelection(dir: 1 | -1 | 'top' | 'bottom'): void {
  const { selection, doc } = S();
  if (!selection.length) return;
  const order = flatten(doc.layers).map((l) => l.id);
  const ids = [...selection].sort((a, b) => (order.indexOf(a) - order.indexOf(b)) * (dir === 1 || dir === 'bottom' ? -1 : 1));
  S().apply((d) => {
    for (const id of ids) {
      if (dir === 'top' || dir === 'bottom') toEdge(d, id, dir);
      else shiftLayer(d, id, dir);
    }
  });
}

export function nudgeSelection(dx: number, dy: number): void {
  const { selection } = S();
  if (!selection.length) return;
  S().apply((d) => {
    selection.forEach((id) => {
      const hit = findLayer(d.layers, id);
      if (hit && !hit.layer.locked) translateLayer(hit.layer, dx, dy);
    });
  }, `nudge:${selection.join(',')}`);
}

export function patchLayer(id: string, recipe: (layer: Layer, doc: Doc) => void, key?: string): void {
  S().apply((d) => {
    const hit = findLayer(d.layers, id);
    if (hit) recipe(hit.layer, d);
  }, key);
}

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

/** 하나를 골랐으면 카드 기준, 여러 개면 선택 전체의 범위 기준으로 맞춘다. */
export function alignSelection(mode: AlignMode): void {
  const { selection, doc } = S();
  if (!selection.length) return;
  const rects = selection
    .map((id) => findLayer(doc.layers, id))
    .filter((h): h is NonNullable<typeof h> => !!h)
    .map((h) => ({ id: h.layer.id, r: boxBounds(layerBox(h.layer, doc.content)) }));
  const frame = rects.length > 1
    ? unionRects(rects.map((x) => x.r))
    : { x: 0, y: 0, w: doc.card.w, h: doc.card.h };
  S().apply((d) => {
    for (const { id, r } of rects) {
      const hit = findLayer(d.layers, id);
      if (!hit) continue;
      let dx = 0;
      let dy = 0;
      if (mode === 'left') dx = frame.x - r.x;
      else if (mode === 'hcenter') dx = frame.x + frame.w / 2 - (r.x + r.w / 2);
      else if (mode === 'right') dx = frame.x + frame.w - (r.x + r.w);
      else if (mode === 'top') dy = frame.y - r.y;
      else if (mode === 'vcenter') dy = frame.y + frame.h / 2 - (r.y + r.h / 2);
      else dy = frame.y + frame.h - (r.y + r.h);
      translateLayer(hit.layer, Math.round(dx), Math.round(dy));
    }
  });
}

/** 레이어를 카드 크기에 딱 맞춘다(위치 0,0 · 카드 크기 · 회전 0). 배경·패널·효과를 원래 자리로 되돌릴 때 쓴다. */
export function fitToCard(layerId: string): void {
  S().apply((d) => {
    const hit = findLayer(d.layers, layerId);
    if (!hit || hit.layer.kind === 'group' || hit.layer.kind === 'text') return;
    Object.assign(hit.layer, { x: 0, y: 0, w: d.card.w, h: d.card.h, rot: 0 });
    if (hit.layer.kind === 'image') Object.assign(hit.layer, { panX: 0, panY: 0, zoom: 1 });
  });
}

/** 이미지 레이어를 카드 전체를 덮는 바탕으로 만든다. */
export function useAsBackground(layerId: string): void {
  S().apply((d) => {
    const hit = findLayer(d.layers, layerId);
    if (!hit || hit.layer.kind !== 'image') return;
    walk(d.layers, (l) => { if (l.role === 'bg') l.role = null; });
    const layer = hit.layer;
    Object.assign(layer, {
      x: 0, y: 0, w: d.card.w, h: d.card.h, rot: 0, role: 'bg', name: '배경',
      mask: 'rect', radius: 0, fit: 'cover', panX: 0, panY: 0, zoom: 1,
    });
    toEdge(d, layerId, 'bottom');
  });
  toast('맨 아래에 카드 크기로 깔았습니다.');
}

function adjustTextColors(d: Doc, dark: boolean): void {
  const main = dark ? '#ffffff' : '#1b2233';
  const accent = dark ? '#9fd0ff' : '#2f5fd0';
  const edge = dark ? '#0b1022' : '#ffffff';
  walk(d.layers, (l) => {
    if (l.kind === 'spec') {
      l.valueColor = main;
      l.labelColor = accent;
      if (l.styles.outline.on) l.styles.outline.color = edge;
    } else if (l.kind === 'text' && l.slot === 'nickname') {
      l.color = main;
      l.gradient.on = false;
      if (l.styles.outline.on) l.styles.outline.color = edge;
    }
  });
}

/** 내장 배경을 바탕 레이어에 적용한다. 바탕 레이어가 없으면 맨 아래에 새로 만든다. */
export function applyBackground(bg: BgMeta, adjustColors: boolean): void {
  S().apply((d) => {
    const assetId = `bg_${bg.id}`;
    d.assets[assetId] = { id: assetId, name: bg.name, src: backgroundUrl(bg.id), builtin: true };
    const fresh: ImageLayer = makeImage({
      name: '배경', role: 'bg', locked: true, x: 0, y: 0, w: d.card.w, h: d.card.h, asset: assetId,
    });
    const old = flatten(d.layers).find((l) => l.role === 'bg');
    if (old && old.kind === 'image') {
      old.asset = assetId;
      old.slot = null;
      old.visible = true;
    } else if (old) {
      const hit = findLayer(d.layers, old.id)!;
      hit.list.splice(hit.index, 1, fresh);
    } else {
      d.layers.unshift(fresh);
    }
    if (adjustColors) adjustTextColors(d, bg.lum < 0.5);
    pruneAssets(d);
  });
}

/** 프리셋을 적용한다. 사양·닉네임·사진은 그대로 두고 디자인만 바꾼다. 실행 취소 한 번으로 돌아간다. */
export function applyPreset(data: PresetData): void {
  S().apply((d) => {
    // 옛 버전에서 저장한 내 프리셋에도 지금 기본값을 채워 넣는다.
    const base = defaultCard();
    const card = structuredClone(data.card) as Card;
    d.card = { ...base, ...card, border: { ...base.border, ...card.border }, deco: { ...base.deco, ...card.deco }, matte: { ...base.matte, ...card.matte } };
    d.layers = data.layers.map((l) => cloneLayer(l));
    walk(d.layers, fillDefaults);
    if (data.anim) d.anim = { ...data.anim };
    Object.assign(d.assets, structuredClone(data.assets));
    pruneAssets(d);
  });
  S().select([]);
}

export function presetFromDoc(doc: Doc): PresetData {
  const used = new Set<string>();
  walk(doc.layers, (l) => { if (l.kind === 'image' && l.asset) used.add(l.asset); });
  const assets: PresetData['assets'] = {};
  used.forEach((id) => { if (doc.assets[id]) assets[id] = doc.assets[id]; });
  return structuredClone({ card: doc.card, layers: doc.layers, assets, anim: doc.anim });
}

export function newDocFromPreset(presetId = 'clean-light'): Doc {
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const data = preset.build();
  return { ...emptyDoc(), card: data.card, layers: data.layers, assets: data.assets, content: defaultContent() };
}

// ── 레이어 복사·붙여넣기 ─────────────────────────────────────────────

let clipboard: { layers: Layer[]; assets: Doc['assets'] } | null = null;

export function hasClipboard(): boolean {
  return !!clipboard;
}

export function copySelection(): boolean {
  const { selection, doc } = S();
  const order = flatten(doc.layers).map((l) => l.id);
  const layers = selection
    .map((id) => findLayer(doc.layers, id)?.layer)
    .filter((l): l is Layer => !!l)
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  if (!layers.length) return false;
  const assets: Doc['assets'] = {};
  layers.forEach((layer) => walk([layer], (l) => {
    if (l.kind === 'image' && l.asset && doc.assets[l.asset]) assets[l.asset] = doc.assets[l.asset];
  }));
  clipboard = { layers: layers.map((l) => cloneLayer(l)), assets };
  toast(`${layers.length}개 레이어 복사 — Ctrl+V로 붙여넣기`);
  return true;
}

export function cutSelection(): void {
  if (copySelection()) deleteSelection();
}

/** 복사해 둔 레이어를 붙여넣는다. 다른 디자인을 연 뒤에도 붙여넣을 수 있다. */
export function pasteClipboard(): boolean {
  if (!clipboard) return false;
  const copies = clipboard.layers.map((l) => {
    const c = cloneLayer(l);
    translateLayer(c, 14, 14);
    return c;
  });
  const assets = clipboard.assets;
  const above = topSelected();
  S().apply((d) => {
    Object.assign(d.assets, assets);
    let anchor = above;
    for (const c of copies) { insertLayer(d, c, anchor); anchor = c.id; }
  });
  S().select(copies.map((c) => c.id));
  // 한 번 더 붙여넣으면 또 옆으로 비켜 놓이도록 기준을 옮긴다.
  clipboard = { layers: copies.map((c) => cloneLayer(c)), assets };
  return true;
}

// ── 스타일 복사 ──────────────────────────────────────────────────────

const LOOK_KEYS: Partial<Record<Layer['kind'], string[]>> = {
  text: ['font', 'size', 'bold', 'italic', 'color', 'gradient', 'letterSpacing', 'lineHeight'],
  spec: ['font', 'size', 'lineHeight', 'labelColor', 'valueColor', 'labelBold', 'valueBold', 'icons'],
  shape: ['fill', 'radius'],
  image: ['mask', 'radius', 'slant', 'brightness', 'contrast', 'saturation', 'blur'],
  effect: ['color', 'color2', 'density', 'speed', 'size'],
};

let styleClip: { kind: Layer['kind']; common: Pick<Layer, 'styles' | 'opacity' | 'blend'>; look: Record<string, unknown> } | null = null;

export function hasStyleClip(): boolean {
  return !!styleClip;
}

/** 고른 레이어의 꾸밈(그림자·외곽선·발광·불투명도·혼합 + 같은 종류끼리는 글꼴·색 등)을 기억한다. */
export function copyStyle(): void {
  const id = topSelected();
  const layer = id ? findLayer(S().doc.layers, id)?.layer : null;
  if (!layer) return;
  const look: Record<string, unknown> = {};
  for (const key of LOOK_KEYS[layer.kind] ?? []) look[key] = (layer as unknown as Record<string, unknown>)[key];
  styleClip = JSON.parse(JSON.stringify({ kind: layer.kind, common: { styles: layer.styles, opacity: layer.opacity, blend: layer.blend }, look }));
  toast('스타일 복사 — 다른 레이어를 고르고 “스타일 붙여넣기”');
}

export function pasteStyle(): void {
  const clip = styleClip;
  const { selection } = S();
  if (!clip || !selection.length) return;
  S().apply((d) => {
    for (const id of selection) {
      const hit = findLayer(d.layers, id);
      if (!hit) continue;
      const layer = hit.layer as unknown as Record<string, unknown>;
      Object.assign(layer, JSON.parse(JSON.stringify(clip.common)));
      // 글꼴·채움 같은 종류별 꾸밈은 같은 종류 레이어에만 옮긴다.
      if (hit.layer.kind === clip.kind) Object.assign(layer, JSON.parse(JSON.stringify(clip.look)));
    }
  });
  toast('스타일을 붙여넣었습니다.');
}

// ── 색 테마 ─────────────────────────────────────────────────────────

const HEX = /^#[0-9a-f]{6}$/i;

function eachColor(node: unknown, fn: (holder: Record<string, unknown>, key: string) => void): void {
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (typeof value === 'string') {
      if (/color/i.test(key) && HEX.test(value)) fn(node as Record<string, unknown>, key);
    } else if (value && typeof value === 'object') {
      // 꺼져 있는 꾸밈(그림자 등)의 색은 그림에 안 보이므로 테마 색에서 뺀다.
      if ((value as { on?: boolean }).on === false) continue;
      eachColor(value, fn);
    }
  }
}

/** 이 디자인에 실제로 쓰인 색과 쓰인 횟수(많이 쓰인 순). */
export function themeColors(doc: Doc): { color: string; count: number }[] {
  const counts = new Map<string, number>();
  const add = (holder: Record<string, unknown>, key: string) => {
    const c = String(holder[key]).toLowerCase();
    counts.set(c, (counts.get(c) ?? 0) + 1);
  };
  eachColor(doc.layers, add);
  eachColor({ border: doc.card.border, deco: doc.card.deco }, add);
  eachColor(doc.content.specs, add);
  return [...counts.entries()].map(([color, count]) => ({ color, count })).sort((a, b) => b.count - a.count);
}

/** 디자인 전체에서 한 색을 다른 색으로 바꾼다. */
export function replaceColor(from: string, to: string): void {
  const a = from.toLowerCase();
  const b = to.toLowerCase();
  if (a === b || !HEX.test(b)) return;
  S().apply((d) => {
    const swap = (holder: Record<string, unknown>, key: string) => {
      if (String(holder[key]).toLowerCase() === a) holder[key] = b;
    };
    eachColor(d.layers, swap);
    eachColor({ border: d.card.border, deco: d.card.deco }, swap);
    eachColor(d.content.specs, swap);
  }, `theme:${a.length}`);
}

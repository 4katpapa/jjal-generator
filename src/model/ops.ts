import type { Doc, GroupLayer, Layer } from './types';
import { makeGroup, uid } from './factory';

export interface Found {
  layer: Layer;
  list: Layer[];
  index: number;
  ancestors: GroupLayer[];
}

export function findLayer(layers: Layer[], id: string, ancestors: GroupLayer[] = []): Found | null {
  for (let i = 0; i < layers.length; i += 1) {
    const layer = layers[i];
    if (layer.id === id) return { layer, list: layers, index: i, ancestors };
    if (layer.kind === 'group') {
      const hit = findLayer(layer.children, id, [...ancestors, layer]);
      if (hit) return hit;
    }
  }
  return null;
}

/** 아래 → 위 순서로 모든 레이어(그룹 포함)를 돈다. */
export function walk(layers: Layer[], fn: (layer: Layer, ancestors: GroupLayer[]) => void, ancestors: GroupLayer[] = []): void {
  for (const layer of layers) {
    fn(layer, ancestors);
    if (layer.kind === 'group') walk(layer.children, fn, [...ancestors, layer]);
  }
}

export function flatten(layers: Layer[]): Layer[] {
  const out: Layer[] = [];
  walk(layers, (l) => out.push(l));
  return out;
}

export function leaves(layer: Layer): Layer[] {
  if (layer.kind !== 'group') return [layer];
  return layer.children.flatMap(leaves);
}

export function insertLayer(doc: Doc, layer: Layer, aboveId?: string | null): void {
  const at = aboveId ? findLayer(doc.layers, aboveId) : null;
  if (at) at.list.splice(at.index + 1, 0, layer);
  else doc.layers.push(layer);
}

export function removeLayer(doc: Doc, id: string): Layer | null {
  const hit = findLayer(doc.layers, id);
  if (!hit) return null;
  hit.list.splice(hit.index, 1);
  return hit.layer;
}

export function cloneLayer(layer: Layer): Layer {
  // 편집 중인 초안(프록시)도 복제할 수 있도록 JSON으로 깊은 복사를 한다. 레이어는 순수 데이터다.
  const copy = JSON.parse(JSON.stringify(layer)) as Layer;
  const renew = (l: Layer) => {
    l.id = uid();
    if (l.kind === 'group') l.children.forEach(renew);
  };
  renew(copy);
  return copy;
}

export function duplicateLayer(doc: Doc, id: string): string | null {
  const hit = findLayer(doc.layers, id);
  if (!hit) return null;
  const copy = cloneLayer(hit.layer);
  copy.name = `${hit.layer.name} 복사`;
  translateLayer(copy, 12, 12);
  hit.list.splice(hit.index + 1, 0, copy);
  return copy.id;
}

/** 같은 부모 안에서 한 칸 위(+1)·아래(-1)로 옮긴다. 옮겼으면 true. */
export function shiftLayer(doc: Doc, id: string, dir: 1 | -1): boolean {
  const hit = findLayer(doc.layers, id);
  if (!hit) return false;
  const to = hit.index + dir;
  if (to < 0 || to >= hit.list.length) return false;
  hit.list.splice(hit.index, 1);
  hit.list.splice(to, 0, hit.layer);
  return true;
}

export function toEdge(doc: Doc, id: string, edge: 'top' | 'bottom'): void {
  const hit = findLayer(doc.layers, id);
  if (!hit) return;
  hit.list.splice(hit.index, 1);
  if (edge === 'top') hit.list.push(hit.layer);
  else hit.list.unshift(hit.layer);
}

/**
 * 레이어를 target 기준 위·아래, 또는 그룹 안 맨 위로 옮긴다.
 * 자기 자신이나 자기 자손 위치로는 옮기지 않는다.
 */
export function moveLayer(doc: Doc, id: string, targetId: string, pos: 'above' | 'below' | 'into'): boolean {
  if (id === targetId) return false;
  const src = findLayer(doc.layers, id);
  if (!src) return false;
  if (src.layer.kind === 'group' && findLayer(src.layer.children, targetId)) return false;
  src.list.splice(src.index, 1);
  const dst = findLayer(doc.layers, targetId);
  if (!dst) {
    src.list.splice(src.index, 0, src.layer);
    return false;
  }
  if (pos === 'into' && dst.layer.kind === 'group') dst.layer.children.push(src.layer);
  else dst.list.splice(pos === 'above' ? dst.index + 1 : dst.index, 0, src.layer);
  return true;
}

export function translateLayer(layer: Layer, dx: number, dy: number): void {
  if (layer.kind === 'group') {
    layer.children.forEach((c) => translateLayer(c, dx, dy));
    return;
  }
  layer.x += dx;
  layer.y += dy;
}

/** 선택한 레이어들을 맨 위 레이어 자리에 그룹으로 묶는다. 원래 쌓임 순서를 유지한다. */
export function groupLayers(doc: Doc, ids: string[]): string | null {
  const order = flatten(doc.layers).map((l) => l.id);
  const picked = ids
    .filter((id) => findLayer(doc.layers, id))
    .filter((id) => !ids.some((other) => {
      if (other === id) return false;
      const o = findLayer(doc.layers, other);
      return !!o && o.layer.kind === 'group' && !!findLayer(o.layer.children, id);
    }))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (picked.length === 0) return null;
  const topId = picked[picked.length - 1];
  const group = makeGroup([]);
  const anchor = findLayer(doc.layers, topId)!;
  anchor.list.splice(anchor.index + 1, 0, group);
  for (const id of picked) {
    const layer = removeLayer(doc, id);
    if (layer) group.children.push(layer);
  }
  return group.id;
}

export function ungroupLayer(doc: Doc, id: string): string[] {
  const hit = findLayer(doc.layers, id);
  if (!hit || hit.layer.kind !== 'group') return [];
  const children = hit.layer.children;
  hit.list.splice(hit.index, 1, ...children);
  return children.map((c) => c.id);
}

export function getPath(obj: unknown, path: string): unknown {
  let cur = obj as Record<string, unknown> | undefined;
  for (const key of path.split('.')) {
    if (cur == null) return undefined;
    cur = cur[key] as Record<string, unknown> | undefined;
  }
  return cur;
}

export function setPath(obj: unknown, path: string, value: unknown): void {
  const keys = path.split('.');
  let cur = obj as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i += 1) cur = cur[keys[i]] as Record<string, unknown>;
  cur[keys[keys.length - 1]] = value;
}

/** 조상 그룹까지 고려한 표시·잠금 상태. */
export function effectiveFlags(layers: Layer[], id: string): { visible: boolean; locked: boolean } {
  const hit = findLayer(layers, id);
  if (!hit) return { visible: false, locked: true };
  const chain = [...hit.ancestors, hit.layer];
  return {
    visible: chain.every((l) => l.visible),
    locked: chain.some((l) => l.locked),
  };
}

/** 문서가 실제로 쓰는 자산만 남긴다. */
export function pruneAssets(doc: Doc): void {
  const used = new Set<string>();
  if (doc.content.photo) used.add(doc.content.photo);
  walk(doc.layers, (l) => { if (l.kind === 'image' && l.asset) used.add(l.asset); });
  for (const id of Object.keys(doc.assets)) if (!used.has(id)) delete doc.assets[id];
}

export function hasMotion(doc: Doc): boolean {
  let found = false;
  const visit = (layers: Layer[]) => {
    for (const l of layers) {
      if (!l.visible) continue;
      if (l.kind === 'effect') found = true;
      else if (l.kind === 'group') visit(l.children);
    }
  };
  visit(doc.layers);
  return found;
}

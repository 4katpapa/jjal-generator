import type { Doc, IconKind, IconSet } from '../model/types';
import { walk } from '../model/ops';
import { resolveIcon } from '../model/specs';

interface Entry {
  img: HTMLImageElement;
  ready: boolean;
  promise: Promise<HTMLImageElement | null>;
}

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();

/** 이미지가 새로 준비될 때마다 불린다. 화면을 다시 그리는 데 쓴다. */
export function onImageReady(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function entryFor(src: string): Entry {
  let entry = cache.get(src);
  if (entry) return entry;
  const img = new Image();
  const created: Entry = {
    img,
    ready: false,
    promise: new Promise((resolve) => {
      img.onload = () => {
        created.ready = true;
        resolve(img);
        listeners.forEach((fn) => fn());
      };
      img.onerror = () => resolve(null);
    }),
  };
  img.src = src;
  cache.set(src, created);
  entry = created;
  return entry;
}

/** 준비된 이미지만 돌려준다. 아직이면 로딩을 시작하고 null. */
export function getImage(src: string | null | undefined): HTMLImageElement | null {
  if (!src) return null;
  const entry = entryFor(src);
  return entry.ready ? entry.img : null;
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return entryFor(src).promise;
}

export function assetSrc(doc: Doc, id: string | null | undefined): string | null {
  if (!id) return null;
  return doc.assets[id]?.src ?? null;
}

export function iconUrl(set: IconSet, kind: IconKind): string {
  return `icons/${set}/${kind}.png`;
}

export function backgroundUrl(id: string, thumb = false): string {
  return `backgrounds/${thumb ? 'thumb' : 'full'}/${id}.webp`;
}

export async function ensureFont(font: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`400 20px "${font}"`, '가A'),
      document.fonts.load(`700 20px "${font}"`, '가A'),
    ]);
  } catch {
    // 설치되지 않은 글꼴은 대체 글꼴로 그려진다.
  }
}

/** 출력·검사 전에 문서가 쓰는 이미지·아이콘·글꼴을 모두 준비한다. */
export async function ensureDocAssets(doc: Doc): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  const fonts = new Set<string>();
  const photo = assetSrc(doc, doc.content.photo);
  if (photo) jobs.push(loadImage(photo));
  walk(doc.layers, (layer) => {
    if (layer.kind === 'image') {
      const src = assetSrc(doc, layer.asset);
      if (src) jobs.push(loadImage(src));
    } else if (layer.kind === 'text') {
      fonts.add(layer.font);
    } else if (layer.kind === 'spec') {
      fonts.add(layer.font);
      if (layer.icons.on) {
        for (const row of doc.content.specs) {
          const kind = resolveIcon(row);
          if (kind) jobs.push(loadImage(iconUrl(layer.icons.set, kind)));
        }
      }
    }
  });
  fonts.forEach((f) => jobs.push(ensureFont(f)));
  await Promise.all(jobs);
}

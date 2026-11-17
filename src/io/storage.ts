import { createStore, del, entries, get, set } from 'idb-keyval';
import type { Doc } from '../model/types';
import type { PresetData } from '../presets/builtin';
import { normalizeDoc } from './file';

// 저장된 디자인·내 프리셋·자동 복구본은 이 PC의 앱 저장소(IndexedDB)에 둔다.
// IndexedDB 쓰기는 통째로 성공하거나 통째로 실패하므로 반쯤 쓰인 저장본이 남지 않는다.

const designs = createStore('jjal-designs', 'designs');
const presets = createStore('jjal-presets', 'presets');
const meta = createStore('jjal-meta', 'kv');

export interface SavedDesign {
  id: string;
  name: string;
  updated: number;
  thumb: string;
  doc: Doc;
}

export interface SavedPreset {
  id: string;
  name: string;
  updated: number;
  thumb: string;
  data: PresetData;
}

export async function listDesigns(): Promise<SavedDesign[]> {
  const all = await entries<string, SavedDesign>(designs);
  return all.map(([, v]) => v).sort((a, b) => b.updated - a.updated);
}

export async function saveDesign(design: SavedDesign): Promise<void> {
  await set(design.id, design, designs);
}

export async function loadDesign(id: string): Promise<SavedDesign | undefined> {
  const d = await get<SavedDesign>(id, designs);
  return d ? { ...d, doc: normalizeDoc(d.doc) } : undefined;
}

export async function deleteDesign(id: string): Promise<void> {
  await del(id, designs);
}

export async function listPresets(): Promise<SavedPreset[]> {
  const all = await entries<string, SavedPreset>(presets);
  return all.map(([, v]) => v).sort((a, b) => b.updated - a.updated);
}

export async function savePreset(preset: SavedPreset): Promise<void> {
  await set(preset.id, preset, presets);
}

export async function deletePreset(id: string): Promise<void> {
  await del(id, presets);
}

export interface Recovery {
  doc: Doc;
  designId: string | null;
  dirty: boolean;
  savedAt: number;
}

export async function writeRecovery(recovery: Recovery): Promise<void> {
  await set('recovery', recovery, meta);
}

export async function readRecovery(): Promise<Recovery | null> {
  try {
    const r = await get<Recovery>('recovery', meta);
    return r ? { ...r, doc: normalizeDoc(r.doc) } : null;
  } catch {
    return null;
  }
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    return (await get<T>(`setting:${key}`, meta)) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await set(`setting:${key}`, value, meta);
}

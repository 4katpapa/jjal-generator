import type { Doc } from '../model/types';
import { uid } from '../model/factory';
import { download, renderFrame, safeName } from '../io/exporter';
import { packDoc, unpackDoc } from '../io/file';
import { loadDesign, readRecovery, saveDesign, writeRecovery } from '../io/storage';
import { newDocFromPreset, pickFile } from './actions';
import { isDirty, toast, useEditor } from './store';

const S = () => useEditor.getState();

export async function makeThumb(doc: Doc): Promise<string> {
  const canvas = await renderFrame(doc, 340 / doc.card.w, doc.anim.duration * 0.4);
  return canvas.toDataURL('image/webp', 0.82);
}

function confirmDiscard(): boolean {
  if (!isDirty(S())) return true;
  return window.confirm('저장하지 않은 변경이 있습니다. 계속하면 지금 작업 대신 다른 디자인을 엽니다.\n(지금 작업은 Ctrl+S로 먼저 저장할 수 있습니다.)');
}

/** 지금 디자인을 "내 디자인"에 저장한다. asNew면 새 항목으로 저장한다. */
export async function saveCurrent(asNew = false): Promise<void> {
  const state = S();
  const doc = state.doc;
  const id = !asNew && state.designId ? state.designId : uid('d');
  const name = doc.name.trim() || '이름 없는 디자인';
  try {
    await saveDesign({ id, name, updated: Date.now(), thumb: await makeThumb(doc), doc });
    // 저장하는 사이에 더 고쳤다면 저장됨으로 표시하지 않는다.
    if (S().doc === doc) S().markSaved(id);
    else useEditor.setState({ designId: id });
    toast(`“${name}” 저장했습니다.`);
  } catch (err) {
    toast(`저장하지 못했습니다: ${(err as Error).message}`);
  }
}

export async function openDesign(id: string): Promise<boolean> {
  if (!confirmDiscard()) return false;
  const design = await loadDesign(id);
  if (!design) {
    toast('디자인을 찾지 못했습니다.');
    return false;
  }
  S().setDoc(design.doc, { saved: true, designId: design.id });
  return true;
}

export function newDesign(): void {
  if (!confirmDiscard()) return;
  S().setDoc(newDocFromPreset(), { saved: false });
  S().set({ dialog: 'presets' });
}

export function exportFile(): void {
  const doc = S().doc;
  try {
    download(new Blob([packDoc(doc) as BlobPart], { type: 'application/zip' }), `${safeName(doc.name)}.jjal`);
  } catch (err) {
    toast(`파일로 내보내지 못했습니다: ${(err as Error).message}`);
  }
}

export async function importFile(): Promise<void> {
  const file = await pickFile('.jjal');
  if (!file) return;
  if (!confirmDiscard()) return;
  try {
    const doc = unpackDoc(new Uint8Array(await file.arrayBuffer()));
    S().setDoc(doc, { saved: false });
    toast(`“${file.name}”을 열었습니다.`);
  } catch (err) {
    toast((err as Error).message);
  }
}

let recoveryTimer: ReturnType<typeof setTimeout> | null = null;

function flushRecovery(): void {
  const state = S();
  void writeRecovery({ doc: state.doc, designId: state.designId, dirty: isDirty(state), savedAt: Date.now() })
    .catch(() => { /* 저장소를 못 쓰는 환경에서도 편집은 계속된다. */ });
}

/** 시작: 지난 작업이 있으면 이어서 열고, 없으면 프리셋 고르기부터 시작한다. */
export async function boot(): Promise<void> {
  const recovery = await readRecovery();
  if (recovery && recovery.doc.layers.length > 0) {
    S().setDoc(recovery.doc, { saved: !recovery.dirty, designId: recovery.designId });
  } else {
    S().setDoc(newDocFromPreset(), { saved: false });
    S().set({ dialog: 'presets' });
  }
  useEditor.subscribe((state, prev) => {
    if (state.doc === prev.doc && state.savedDoc === prev.savedDoc) return;
    if (state.tx) return;
    if (recoveryTimer) clearTimeout(recoveryTimer);
    recoveryTimer = setTimeout(flushRecovery, 900);
  });
  window.addEventListener('pagehide', flushRecovery);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushRecovery(); });
}

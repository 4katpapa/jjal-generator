import { produce } from 'immer';
import { create } from 'zustand';
import type { Doc } from '../model/types';
import { findLayer } from '../model/ops';
import { emptyDoc } from '../model/factory';

export type DialogName = null | 'presets' | 'backgrounds' | 'content' | 'designs' | 'export' | 'savePreset';

const HISTORY_LIMIT = 120;
const COALESCE_MS = 700;

export interface EditorState {
  doc: Doc;
  past: Doc[];
  future: Doc[];
  /** 마지막으로 저장한 문서. doc과 같은 객체면 저장된 상태다. */
  savedDoc: Doc | null;
  designId: string | null;
  selection: string[];
  t: number;
  playing: boolean;
  zoom: number | 'fit';
  /** 자르기(이미지 안쪽 이동·확대) 중인 이미지 레이어. */
  cropId: string | null;
  dialog: DialogName;
  toast: string | null;
  /** 캔버스 뒤 바탕. 'checker'는 투명 표시, 그 밖에는 게시판 배경색(#rrggbb). */
  backdrop: string;
  /** 끌기처럼 여러 번의 변경을 실행 취소 한 번으로 묶는 동안의 시작 문서. */
  tx: Doc | null;
  lastKey: string | null;
  lastTime: number;

  apply: (recipe: (draft: Doc) => void, key?: string) => void;
  begin: () => void;
  commit: () => void;
  cancel: () => void;
  undo: () => void;
  redo: () => void;
  select: (ids: string[]) => void;
  setDoc: (doc: Doc, opts?: { saved?: boolean; designId?: string | null }) => void;
  markSaved: (designId?: string | null) => void;
  set: (patch: Partial<Pick<EditorState, 't' | 'playing' | 'zoom' | 'cropId' | 'dialog' | 'toast' | 'backdrop'>>) => void;
}

function keepExisting(doc: Doc, ids: string[]): string[] {
  return ids.filter((id) => findLayer(doc.layers, id));
}

export const useEditor = create<EditorState>((set, get) => ({
  doc: emptyDoc(),
  past: [],
  future: [],
  savedDoc: null,
  designId: null,
  selection: [],
  t: 0,
  playing: false,
  zoom: 'fit',
  cropId: null,
  dialog: null,
  toast: null,
  backdrop: 'checker',
  tx: null,
  lastKey: null,
  lastTime: 0,

  apply: (recipe, key) => {
    const state = get();
    const next = produce(state.doc, recipe);
    if (next === state.doc) return;
    if (state.tx) {
      set({ doc: next });
      return;
    }
    const now = Date.now();
    const merge = !!key && key === state.lastKey && now - state.lastTime < COALESCE_MS && state.past.length > 0;
    set({
      doc: next,
      past: merge ? state.past : [...state.past, state.doc].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: key ?? null,
      lastTime: now,
      selection: keepExisting(next, state.selection),
    });
  },

  begin: () => {
    if (!get().tx) set({ tx: get().doc });
  },

  commit: () => {
    const state = get();
    if (!state.tx) return;
    if (state.tx === state.doc) {
      set({ tx: null });
      return;
    }
    set({
      tx: null,
      past: [...state.past, state.tx].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: null,
    });
  },

  cancel: () => {
    const state = get();
    if (state.tx) set({ doc: state.tx, tx: null });
  },

  undo: () => {
    const state = get();
    if (state.tx || state.past.length === 0) return;
    const prev = state.past[state.past.length - 1];
    set({
      doc: prev,
      past: state.past.slice(0, -1),
      future: [state.doc, ...state.future],
      selection: keepExisting(prev, state.selection),
      cropId: null,
      lastKey: null,
    });
  },

  redo: () => {
    const state = get();
    if (state.tx || state.future.length === 0) return;
    const next = state.future[0];
    set({
      doc: next,
      past: [...state.past, state.doc],
      future: state.future.slice(1),
      selection: keepExisting(next, state.selection),
      cropId: null,
      lastKey: null,
    });
  },

  select: (ids) => {
    const state = get();
    const next = keepExisting(state.doc, ids);
    const crop = state.cropId && next.length === 1 && next[0] === state.cropId ? state.cropId : null;
    set({ selection: next, cropId: crop });
  },

  setDoc: (doc, opts) => set({
    doc,
    past: [],
    future: [],
    selection: [],
    cropId: null,
    tx: null,
    lastKey: null,
    savedDoc: opts?.saved ? doc : null,
    designId: opts?.designId ?? null,
  }),

  markSaved: (designId) => set((s) => ({ savedDoc: s.doc, designId: designId === undefined ? s.designId : designId })),

  set: (patch) => set(patch),
}));

export function isDirty(state: EditorState): boolean {
  return state.doc !== state.savedDoc;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(message: string): void {
  useEditor.getState().set({ toast: message });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => useEditor.getState().set({ toast: null }), 2600);
}

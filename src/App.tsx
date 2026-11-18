import { useEffect } from 'react';
import {
  addImageFromFile, deleteSelection, duplicateSelection, groupSelection, nudgeSelection, pickFile,
  reorderSelection, replaceImage, ungroupSelection,
} from './editor/actions';
import { saveCurrent } from './editor/session';
import { useEditor } from './editor/store';
import { AddBar, TopBar } from './ui/Bars';
import { ContentDialog } from './ui/Content';
import { Dialogs } from './ui/Dialogs';
import { Inspector } from './ui/Inspector';
import { LayerPanel } from './ui/LayerPanel';
import { QuickBar } from './ui/QuickBar';
import { Stage } from './ui/Stage';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable) return true;
  if (el.tagName !== 'INPUT') return false;
  const type = (el as HTMLInputElement).type;
  return type !== 'range' && type !== 'checkbox' && type !== 'color';
}

export function App() {
  const dialog = useEditor((s) => s.dialog);
  const toast = useEditor((s) => s.toast);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 's') { e.preventDefault(); void saveCurrent(e.shiftKey); return; }
      if (mod && key === 'e') { e.preventDefault(); state.set({ dialog: 'export' }); return; }
      if (mod && key === 'z') { e.preventDefault(); if (e.shiftKey) state.redo(); else state.undo(); return; }
      if (mod && key === 'y') { e.preventDefault(); state.redo(); return; }
      if (state.dialog || isTyping(e.target)) return;
      if (e.key === 'Escape') {
        if (state.cropId) state.set({ cropId: null });
        else state.select([]);
        return;
      }
      if (e.key === 'Enter' && state.cropId) { state.set({ cropId: null }); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); return; }
      if (mod && key === 'd') { e.preventDefault(); duplicateSelection(); return; }
      if (mod && key === 'g') { e.preventDefault(); if (e.shiftKey) ungroupSelection(); else groupSelection(); return; }
      if (mod && e.key === ']') { e.preventDefault(); reorderSelection(e.shiftKey ? 'top' : 1); return; }
      if (mod && e.key === '[') { e.preventDefault(); reorderSelection(e.shiftKey ? 'bottom' : -1); return; }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeSelection(-step, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nudgeSelection(step, 0); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); nudgeSelection(0, -step); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); nudgeSelection(0, step); }
    };
    const onPick = async (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const file = await pickFile('image/*');
      if (file) await replaceImage(id, file);
    };
    const onDrop = (e: DragEvent) => {
      const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      void addImageFromFile(file);
    };
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) { e.preventDefault(); void addImageFromFile(file); }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('jjal:pick-image', onPick);
    window.addEventListener('drop', onDrop);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('jjal:pick-image', onPick);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  return (
    <div className="app">
      <TopBar />
      <div className="work">
        <AddBar />
        <div className="center">
          <QuickBar />
          <Stage />
        </div>
        <div className="side">
          <LayerPanel />
          <Inspector />
        </div>
      </div>
      {dialog === 'content' ? <ContentDialog /> : <Dialogs />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

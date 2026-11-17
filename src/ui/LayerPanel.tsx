import { useState } from 'react';
import {
  deleteSelection, duplicateSelection, groupSelection, patchLayer, reorderSelection, ungroupSelection,
} from '../editor/actions';
import { useEditor } from '../editor/store';
import { moveLayer } from '../model/ops';
import type { Layer } from '../model/types';

const KIND_ICON: Record<Layer['kind'], string> = {
  shape: '▭', image: '🖼', text: 'T', spec: '☰', effect: '✦', group: '🗀',
};

const KIND_NAME: Record<Layer['kind'], string> = {
  shape: '도형', image: '이미지', text: '텍스트', spec: '사양 목록', effect: '효과', group: '그룹',
};

type DropPos = 'above' | 'below' | 'into';

export function LayerPanel() {
  const layers = useEditor((s) => s.doc.layers);
  const selection = useEditor((s) => s.selection);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; pos: DropPos } | null>(null);

  const select = (e: React.MouseEvent, id: string) => {
    const state = useEditor.getState();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      state.select(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]);
    } else {
      state.select([id]);
    }
  };

  const onDrop = () => {
    if (dragId && drop && dragId !== drop.id) {
      useEditor.getState().apply((d) => { moveLayer(d, dragId, drop.id, drop.pos); });
    }
    setDragId(null);
    setDrop(null);
  };

  const row = (layer: Layer, depth: number, dimmed: boolean): React.ReactNode => {
    const isSel = selection.includes(layer.id);
    const open = !collapsed.has(layer.id);
    const mark = drop?.id === layer.id ? ` drop-${drop.pos}` : '';
    return (
      <div key={layer.id}>
        <div
          className={`layer-row${isSel ? ' selected' : ''}${dimmed || !layer.visible ? ' dim' : ''}${mark}`}
          style={{ paddingLeft: 6 + depth * 16 }}
          draggable={renaming !== layer.id}
          onDragStart={(e) => { setDragId(layer.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', layer.id); }}
          onDragEnd={() => { setDragId(null); setDrop(null); }}
          onDragOver={(e) => {
            if (!dragId || dragId === layer.id) return;
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            const f = (e.clientY - r.top) / r.height;
            // 목록은 위가 앞쪽이라, 줄의 위 절반에 놓으면 그 레이어 "위(앞)"가 된다.
            const pos: DropPos = layer.kind === 'group' && f > 0.3 && f < 0.7 ? 'into' : f < 0.5 ? 'above' : 'below';
            if (drop?.id !== layer.id || drop.pos !== pos) setDrop({ id: layer.id, pos });
          }}
          onDrop={(e) => { e.preventDefault(); onDrop(); }}
          onClick={(e) => select(e, layer.id)}
        >
          <button
            type="button" className={`flag${layer.visible ? ' on' : ''}`} title={layer.visible ? '숨기기' : '보이기'}
            onClick={(e) => { e.stopPropagation(); patchLayer(layer.id, (l) => { l.visible = !l.visible; }); }}
          >{layer.visible ? '👁' : '·'}</button>
          <button
            type="button" className={`flag${layer.locked ? ' on' : ''}`} title={layer.locked ? '잠금 풀기' : '잠그기 (캔버스에서 선택·이동 안 됨)'}
            onClick={(e) => { e.stopPropagation(); patchLayer(layer.id, (l) => { l.locked = !l.locked; }); }}
          >{layer.locked ? '🔒' : '·'}</button>
          {layer.kind === 'group' ? (
            <button
              type="button" className="twist" title={open ? '접기' : '펼치기'}
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(layer.id)) next.delete(layer.id); else next.add(layer.id);
                  return next;
                });
              }}
            >{open ? '▾' : '▸'}</button>
          ) : null}
          <span className="kind" title={KIND_NAME[layer.kind]}>{KIND_ICON[layer.kind]}</span>
          {renaming === layer.id ? (
            <input
              className="rename" autoFocus defaultValue={layer.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== layer.name) patchLayer(layer.id, (l) => { l.name = name; });
                setRenaming(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setRenaming(null);
                e.stopPropagation();
              }}
            />
          ) : (
            <span className="name" onDoubleClick={(e) => { e.stopPropagation(); setRenaming(layer.id); }} title="두 번 눌러 이름 바꾸기">
              {layer.name}
            </span>
          )}
        </div>
        {layer.kind === 'group' && open && [...layer.children].reverse().map((c) => row(c, depth + 1, dimmed || !layer.visible))}
      </div>
    );
  };

  const has = selection.length > 0;
  return (
    <section className="panel layers">
      <header className="panel-head">
        <h3>레이어</h3>
        <span className="sub">위쪽이 앞</span>
      </header>
      <div className="layer-list" onDragOver={(e) => { if (dragId) e.preventDefault(); }}>
        {layers.length === 0 && <p className="empty">레이어가 없습니다. 왼쪽 막대에서 추가하세요.</p>}
        {[...layers].reverse().map((l) => row(l, 0, false))}
      </div>
      <footer className="layer-tools">
        <button type="button" disabled={!has} title="한 칸 앞으로 (Ctrl+])" onClick={() => reorderSelection(1)}>▲</button>
        <button type="button" disabled={!has} title="한 칸 뒤로 (Ctrl+[)" onClick={() => reorderSelection(-1)}>▼</button>
        <button type="button" disabled={!has} title="복제 (Ctrl+D)" onClick={duplicateSelection}>복제</button>
        <button type="button" disabled={!has} title="그룹으로 묶기 (Ctrl+G)" onClick={groupSelection}>묶기</button>
        <button type="button" disabled={!has} title="그룹 풀기 (Ctrl+Shift+G)" onClick={ungroupSelection}>풀기</button>
        <button type="button" disabled={!has} className="danger" title="삭제 (Delete)" onClick={deleteSelection}>삭제</button>
      </footer>
    </section>
  );
}

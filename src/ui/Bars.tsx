import { useEffect, useRef, useState } from 'react';
import { addEffect, addImageFromFile, addShape, addSpec, addText, pickFile } from '../editor/actions';
import { exportFile, importFile, newDesign, saveCurrent } from '../editor/session';
import { isDirty, useEditor } from '../editor/store';
import { EFFECT_LABELS } from '../model/factory';
import { hasMotion } from '../model/ops';
import type { EffectType } from '../model/types';

function Menu({ label, title, children, className }: { label: React.ReactNode; title?: string; children: (close: () => void) => React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [open]);
  return (
    <div className={`menu ${className ?? ''}`} ref={ref}>
      <button type="button" className={open ? 'on' : ''} title={title} onClick={() => setOpen(!open)}>{label}</button>
      {open && <div className="menu-pop">{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function TopBar() {
  const name = useEditor((s) => s.doc.name);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const dirty = useEditor(isDirty);
  const zoom = useEditor((s) => s.zoom);
  const playing = useEditor((s) => s.playing);
  const motion = useEditor((s) => hasMotion(s.doc));
  const st = useEditor.getState;
  const open = (dialog: 'presets' | 'backgrounds' | 'content' | 'designs' | 'export' | 'savePreset') => st().set({ dialog });

  const zoomBy = (k: number) => {
    const cur = zoom === 'fit' ? 1 : zoom;
    st().set({ zoom: Math.max(0.25, Math.min(4, Math.round(cur * k * 100) / 100)) });
  };

  return (
    <header className="topbar">
      <div className="brand">자짤 스튜디오</div>
      <Menu label="파일 ▾">
        {(close) => (
          <>
            <button type="button" onClick={() => { close(); newDesign(); }}>새로 만들기</button>
            <button type="button" onClick={() => { close(); void saveCurrent(); }}>저장 <kbd>Ctrl+S</kbd></button>
            <button type="button" onClick={() => { close(); void saveCurrent(true); }}>새 이름으로 저장</button>
            <button type="button" onClick={() => { close(); open('designs'); }}>내 디자인…</button>
            <hr />
            <button type="button" onClick={() => { close(); open('savePreset'); }}>지금 디자인을 프리셋으로 저장</button>
            <hr />
            <button type="button" onClick={() => { close(); exportFile(); }}>파일로 백업 (.jjal)</button>
            <button type="button" onClick={() => { close(); void importFile(); }}>백업 파일 열기…</button>
          </>
        )}
      </Menu>
      <button type="button" className="icon-btn" disabled={!canUndo} title="실행 취소 (Ctrl+Z)" onClick={() => st().undo()}>↶</button>
      <button type="button" className="icon-btn" disabled={!canRedo} title="다시 실행 (Ctrl+Y)" onClick={() => st().redo()}>↷</button>
      <input
        className="doc-name" type="text" placeholder="디자인 이름" value={name}
        onChange={(e) => st().apply((d) => { d.name = e.target.value; }, 'docname')}
      />
      <span className={`save-state${dirty ? ' dirty' : ''}`}>{dirty ? '● 저장 안 됨' : '저장됨'}</span>
      <div className="spacer" />
      <button type="button" onClick={() => open('content')}>내용</button>
      <button type="button" onClick={() => open('presets')}>프리셋</button>
      <button type="button" onClick={() => open('backgrounds')}>배경</button>
      <div className="sep" />
      {motion && (
        <button type="button" title="움직임 미리보기 재생/정지" onClick={() => st().set({ playing: !playing })}>
          {playing ? '❚❚ 정지' : '▶ 재생'}
        </button>
      )}
      <div className="zoom">
        <button type="button" className="icon-btn" title="축소" onClick={() => zoomBy(1 / 1.25)}>−</button>
        <button type="button" title="화면에 맞춤" className={zoom === 'fit' ? 'on' : ''} onClick={() => st().set({ zoom: 'fit' })}>
          {zoom === 'fit' ? '맞춤' : `${Math.round(zoom * 100)}%`}
        </button>
        <button type="button" className="icon-btn" title="확대" onClick={() => zoomBy(1.25)}>+</button>
      </div>
      <button type="button" className="primary" title="PNG · WebP로 저장 (Ctrl+E)" onClick={() => open('export')}>내보내기</button>
    </header>
  );
}

export function AddBar() {
  return (
    <aside className="addbar">
      <span className="addbar-title">추가</span>
      <button type="button" onClick={addText} title="텍스트 레이어 추가"><b>T</b><span>텍스트</span></button>
      <button
        type="button" title="이미지 레이어 추가 (파일을 창에 끌어다 놓아도 됩니다)"
        onClick={async () => { const f = await pickFile('image/*'); if (f) await addImageFromFile(f); }}
      ><b>🖼</b><span>이미지</span></button>
      <button type="button" onClick={addSpec} title="사양 목록 레이어 추가"><b>☰</b><span>사양</span></button>
      <Menu label={<><b>▭</b><span>도형</span></>} title="도형 레이어 추가" className="flyout">
        {(close) => (
          <>
            <button type="button" onClick={() => { close(); addShape('rect'); }}>사각형</button>
            <button type="button" onClick={() => { close(); addShape('ellipse'); }}>원</button>
            <button type="button" onClick={() => { close(); addShape('slant'); }}>기울인 사각형</button>
          </>
        )}
      </Menu>
      <Menu label={<><b>✦</b><span>효과</span></>} title="움직이는 효과 레이어 추가" className="flyout">
        {(close) => (
          <>
            {(Object.entries(EFFECT_LABELS) as [EffectType, string][]).map(([type, label]) => (
              <button type="button" key={type} onClick={() => { close(); addEffect(type); }}>{label}</button>
            ))}
          </>
        )}
      </Menu>
    </aside>
  );
}

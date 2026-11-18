import { useEffect, useState } from 'react';
import {
  addEffect, addEmoji, addImageFromFile, addText, clearPhoto, deleteSelection, duplicateSelection, fitToCard,
  pickFile, reorderSelection, setPhoto,
} from '../editor/actions';
import { saveCurrent } from '../editor/session';
import { useEditor } from '../editor/store';
import { EFFECTS } from '../model/factory';
import { findLayer, flatten, hasMotion } from '../model/ops';
import type { EffectType, Layer } from '../model/types';
import { assetSrc } from '../render/assets';
import { EMOJI } from './Bars';
import { SpecEditor } from './Content';
import { QuickBar } from './QuickBar';
import { Stage } from './Stage';

const QUERY = '(max-width: 760px)';

/** 폰 폭이면 간편 모드 화면을 쓴다. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

type Tab = 'content' | 'style' | 'add';

const KIND_NAME: Record<Layer['kind'], string> = {
  shape: '도형', image: '이미지', text: '텍스트', spec: '사양 목록', effect: '효과', group: '그룹',
};

function ContentTab() {
  const nickname = useEditor((s) => s.doc.content.nickname);
  const photoSrc = useEditor((s) => assetSrc(s.doc, s.doc.content.photo));
  return (
    <div className="m-pane">
      <label className="field">
        <span>닉네임</span>
        <input type="text" value={nickname} onChange={(e) => useEditor.getState().apply((d) => { d.content.nickname = e.target.value; }, 'nickname')} />
      </label>
      <div className="field">
        <span>내 사진</span>
        <div className="photo-field">
          {photoSrc ? <img src={photoSrc} alt="" /> : <div className="photo-empty">없음</div>}
          <button type="button" onClick={async () => { const f = await pickFile('image/*'); if (f) await setPhoto(f); }}>{photoSrc ? '바꾸기' : '사진 넣기'}</button>
          {photoSrc && <button type="button" onClick={clearPhoto}>빼기</button>}
        </div>
      </div>
      <h4>사양</h4>
      <SpecEditor />
    </div>
  );
}

function StyleTab() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const layer = selection.length === 1 ? findLayer(doc.layers, selection[0])?.layer : null;
  const all = [...flatten(doc.layers)].reverse().filter((l) => l.kind !== 'group');
  return (
    <div className="m-pane">
      <label className="field">
        <span>고칠 요소 (캔버스에서 탭해도 됩니다)</span>
        <select value={layer?.id ?? ''} onChange={(e) => useEditor.getState().select(e.target.value ? [e.target.value] : [])}>
          <option value="">카드 전체 (크기·테두리)</option>
          {all.map((l) => <option key={l.id} value={l.id}>{l.name} · {KIND_NAME[l.kind]}{l.locked ? ' 🔒' : ''}</option>)}
        </select>
      </label>
      <QuickBar sliders />
      {layer && (
        <div className="m-actions">
          <button type="button" onClick={() => reorderSelection(1)}>앞으로</button>
          <button type="button" onClick={() => reorderSelection(-1)}>뒤로</button>
          <button type="button" onClick={duplicateSelection}>복제</button>
          {layer.kind !== 'text' && layer.kind !== 'group' && <button type="button" onClick={() => fitToCard(layer.id)}>꽉 채우기</button>}
          <button
            type="button"
            onClick={() => useEditor.getState().apply((d) => { const hit = findLayer(d.layers, layer.id); if (hit) hit.layer.locked = !hit.layer.locked; })}
          >{layer.locked ? '잠금 풀기' : '잠그기'}</button>
          <button type="button" className="danger" onClick={deleteSelection}>삭제</button>
        </div>
      )}
      <p className="note">세부 속성·레이어 묶기 같은 기능은 PC 화면에서 쓸 수 있습니다.</p>
    </div>
  );
}

function AddTab({ done }: { done: () => void }) {
  const [group, setGroup] = useState(0);
  const set = useEditor.getState().set;
  return (
    <div className="m-pane">
      <div className="m-actions">
        <button type="button" onClick={() => set({ dialog: 'backgrounds' })}>🌄 배경 바꾸기</button>
        <button type="button" onClick={() => { addText(); done(); }}>T 텍스트</button>
        <button type="button" onClick={async () => { const f = await pickFile('image/*'); if (f) { await addImageFromFile(f); done(); } }}>🖼 이미지</button>
      </div>
      <label className="field">
        <span>움직이는 효과 추가</span>
        <select value="" onChange={(e) => { if (e.target.value) { addEffect(e.target.value as EffectType); done(); } }}>
          <option value="">효과 고르기…</option>
          {Object.entries(EFFECTS).map(([type, m]) => <option key={type} value={type}>{m.border ? '테두리' : '배경'} · {m.label}</option>)}
        </select>
      </label>
      <div className="field">
        <span>이모티콘</span>
        <div className="chips">
          {EMOJI.map((g, i) => <button type="button" key={g.name} className={i === group ? 'on' : ''} onClick={() => setGroup(i)}>{g.name}</button>)}
        </div>
        <div className="emoji-grid">
          {EMOJI[group].items.split(' ').map((ch) => <button type="button" key={ch} onClick={() => { addEmoji(ch); done(); }}>{ch}</button>)}
        </div>
      </div>
    </div>
  );
}

/** 폰용 간편 모드: 위에 캔버스, 아래에 내용·꾸미기·추가 탭. */
export function MobileLayout() {
  const [tab, setTab] = useState<Tab>('content');
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const playing = useEditor((s) => s.playing);
  const motion = useEditor((s) => hasMotion(s.doc));
  const selected = useEditor((s) => s.selection.length > 0);
  const cropId = useEditor((s) => s.cropId);
  const st = useEditor.getState;

  // 캔버스에서 요소를 탭하면 바로 고칠 수 있게 꾸미기 탭으로 넘긴다.
  useEffect(() => { if (selected) setTab('style'); }, [selected]);

  return (
    <>
      <header className="m-top">
        <b className="brand">자짤생성툴 <em>v2</em></b>
        <button type="button" className="icon-btn" disabled={!canUndo} aria-label="실행 취소" onClick={() => st().undo()}>↶</button>
        <button type="button" className="icon-btn" disabled={!canRedo} aria-label="다시 실행" onClick={() => st().redo()}>↷</button>
        {motion && <button type="button" className="icon-btn" aria-label="움직임 재생/정지" onClick={() => st().set({ playing: !playing })}>{playing ? '❚❚' : '▶'}</button>}
        <span className="spacer" />
        <button type="button" onClick={() => st().set({ dialog: 'presets' })}>프리셋</button>
        <button type="button" className="primary" onClick={() => st().set({ dialog: 'export' })}>저장</button>
      </header>
      <div className="m-stage">
        <Stage margin={28} grip={20} />
        {cropId && <button type="button" className="primary m-crop-done" onClick={() => st().set({ cropId: null })}>자르기 완료</button>}
      </div>
      <nav className="m-tabs">
        <button type="button" className={tab === 'content' ? 'on' : ''} onClick={() => setTab('content')}>① 내용</button>
        <button type="button" className={tab === 'style' ? 'on' : ''} onClick={() => setTab('style')}>② 꾸미기</button>
        <button type="button" className={tab === 'add' ? 'on' : ''} onClick={() => setTab('add')}>＋ 추가</button>
        <button type="button" title="이 기기에 저장해 두기" onClick={() => { void saveCurrent(); }}>보관</button>
      </nav>
      {tab === 'content' && <ContentTab />}
      {tab === 'style' && <StyleTab />}
      {tab === 'add' && <AddTab done={() => setTab('style')} />}
    </>
  );
}

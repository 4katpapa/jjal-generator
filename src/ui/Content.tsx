import { useState } from 'react';
import { clearPhoto, pickFile, setPhoto } from '../editor/actions';
import { toast, useEditor } from '../editor/store';
import { makeRow } from '../model/factory';
import { flatten } from '../model/ops';
import { ICON_KINDS, mergeSpecs, parseSpecText, resolveIcon } from '../model/specs';
import type { IconSet, SpecRow } from '../model/types';
import { desktop, type DetectedSpec } from '../io/desktop';
import { assetSrc, iconUrl } from '../render/assets';
import { Modal } from './controls';

function patchRow(id: string, recipe: (row: SpecRow) => void, key?: string): void {
  useEditor.getState().apply((d) => {
    const row = d.content.specs.find((r) => r.id === id);
    if (row) recipe(row);
  }, key);
}

function applyIncoming(incoming: DetectedSpec[], mode: 'merge' | 'replace'): void {
  if (mode === 'replace') {
    useEditor.getState().apply((d) => { d.content.specs = incoming.map((r) => makeRow(r.label, r.value)); });
    toast(`사양 ${incoming.length}행으로 바꿨습니다.`);
    return;
  }
  let text = '';
  useEditor.getState().apply((d) => {
    const { rows, summary } = mergeSpecs(d.content.specs, incoming);
    d.content.specs = rows;
    text = `빈 칸 ${summary.filled}개 채움 · ${summary.added}행 추가 · 직접 적은 값 ${summary.kept}개 유지`;
  });
  toast(text || '바뀐 내용이 없습니다.');
}

/** 사양 행 편집기. 속성 패널과 내용 창이 함께 쓴다. */
export function SpecEditor() {
  const specs = useEditor((s) => s.doc.content.specs);
  const specLayer = useEditor((s) => flatten(s.doc.layers).find((l) => l.kind === 'spec'));
  const defaultColor = specLayer && specLayer.kind === 'spec' ? specLayer.valueColor : '#ffffff';
  const iconSet: IconSet = specLayer && specLayer.kind === 'spec' ? specLayer.icons.set : 'color';
  const [panel, setPanel] = useState<null | 'paste' | 'detect'>(null);
  const [pasted, setPasted] = useState('');
  const [detected, setDetected] = useState<DetectedSpec[] | null>(null);
  const [detectMsg, setDetectMsg] = useState('');

  const move = (index: number, dir: 1 | -1) => {
    useEditor.getState().apply((d) => {
      const to = index + dir;
      if (to < 0 || to >= d.content.specs.length) return;
      const [row] = d.content.specs.splice(index, 1);
      d.content.specs.splice(to, 0, row);
    });
  };

  const detect = async () => {
    if (!desktop) return;
    setPanel('detect');
    setDetected(null);
    setDetectMsg('이 PC의 사양을 읽는 중…');
    const result = await desktop.readSpecs();
    if (result.error || result.rows.length === 0) {
      setDetectMsg(`사양을 읽지 못했습니다${result.error ? `: ${result.error}` : '.'}`);
      return;
    }
    setDetected(result.rows);
    setDetectMsg('Windows가 알려 주는 부품만 읽었습니다. 파워·케이스·쿨러는 직접 적어 주세요.');
  };

  const parsed = panel === 'paste' ? parseSpecText(pasted) : [];
  const incoming = panel === 'paste' ? parsed : detected ?? [];

  return (
    <div className="spec-editor">
      <div className="spec-tools">
        <button type="button" onClick={() => setPanel(panel === 'paste' ? null : 'paste')}>붙여넣기</button>
        <button type="button" disabled={!desktop} onClick={() => { void detect(); }}>이 PC에서 읽기</button>
      </div>
      {!desktop && <p className="note">“이 PC에서 읽기”는 Windows 앱에서 됩니다. 브라우저에서는 붙여넣기를 쓰세요.</p>}

      {panel && (
        <div className="spec-incoming">
          {panel === 'paste' && (
            <textarea
              autoFocus rows={5} value={pasted} placeholder={'한 줄에 하나씩 붙여넣으세요.\nCPU: 8코어 프로세서\nVGA 그래픽카드 12GB'}
              onChange={(e) => setPasted(e.target.value)}
            />
          )}
          {panel === 'detect' && <p className="note">{detectMsg}</p>}
          {incoming.length > 0 && (
            <>
              <ul className="incoming-list">
                {incoming.map((r, i) => <li key={i}><b>{r.label || '—'}</b> {r.value}</li>)}
              </ul>
              <div className="spec-tools">
                <button type="button" className="primary" onClick={() => { applyIncoming(incoming, 'merge'); setPanel(null); }}>
                  빈 칸 채우고 추가
                </button>
                <button type="button" onClick={() => { applyIncoming(incoming, 'replace'); setPanel(null); }}>
                  목록 전체 바꾸기
                </button>
                <button type="button" onClick={() => setPanel(null)}>취소</button>
              </div>
              <p className="note">“빈 칸 채우고 추가”는 이미 적어 둔 값을 건드리지 않습니다.</p>
            </>
          )}
        </div>
      )}

      <div className="spec-rows">
        {specs.map((row, i) => {
          const kind = resolveIcon(row);
          return (
            <div className="spec-row" key={row.id}>
              <div className="spec-line">
                {kind ? <img className="row-icon" src={iconUrl(iconSet, kind)} alt="" /> : <span className="row-icon none" />}
                <select
                  className="icon-select" value={row.icon} title="아이콘"
                  onChange={(e) => patchRow(row.id, (r) => { r.icon = e.target.value as SpecRow['icon']; })}
                >
                  <option value="auto">자동</option>
                  <option value="none">없음</option>
                  {ICON_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.name}</option>)}
                </select>
                <input
                  className="label-input" value={row.label} placeholder="항목" maxLength={24}
                  onChange={(e) => patchRow(row.id, (r) => { r.label = e.target.value; }, `label:${row.id}`)}
                />
                <button type="button" className="mini" disabled={i === 0} title="위로" onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="mini" disabled={i === specs.length - 1} title="아래로" onClick={() => move(i, 1)}>↓</button>
                <button
                  type="button" className="mini danger" title="행 삭제"
                  onClick={() => useEditor.getState().apply((d) => { d.content.specs.splice(i, 1); })}
                >✕</button>
              </div>
              <div className="spec-line">
                <textarea
                  className="value-input" rows={Math.max(1, row.value.split('\n').length)} value={row.value}
                  placeholder="사양 (Enter로 줄바꿈)"
                  onChange={(e) => patchRow(row.id, (r) => { r.value = e.target.value; }, `value:${row.id}`)}
                />
                <input
                  type="color" className={`row-color${row.color ? ' set' : ''}`} value={row.color ?? defaultColor}
                  title={row.color ? '이 행만 다른 색을 씁니다' : '이 행만 색 바꾸기 (지금은 목록의 사양값 색)'}
                  onChange={(e) => patchRow(row.id, (r) => { r.color = e.target.value; }, `color:${row.id}`)}
                />
                {row.color && (
                  <button type="button" className="mini" title="목록의 사양값 색으로 되돌리기" onClick={() => patchRow(row.id, (r) => { r.color = null; })}>↺</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="spec-tools">
        <button type="button" onClick={() => useEditor.getState().apply((d) => { d.content.specs.push(makeRow('')); })}>+ 빈 행</button>
        <select
          value="" onChange={(e) => {
            const k = ICON_KINDS.find((x) => x.kind === e.target.value);
            if (k) useEditor.getState().apply((d) => { d.content.specs.push(makeRow(k.label)); });
          }}
        >
          <option value="">+ 부품·주변기기 추가…</option>
          {ICON_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.name} ({k.label})</option>)}
        </select>
      </div>
    </div>
  );
}

export function ContentDialog() {
  const nickname = useEditor((s) => s.doc.content.nickname);
  const photoSrc = useEditor((s) => assetSrc(s.doc, s.doc.content.photo));
  const close = () => useEditor.getState().set({ dialog: null });
  return (
    <Modal title="내용 — 닉네임 · 사진 · 사양" onClose={close} footer={<button type="button" className="primary" onClick={close}>완료</button>}>
      <p className="note">여기 적은 내용은 프리셋을 바꿔도 그대로 따라옵니다.</p>
      <div className="content-grid">
        <label className="field">
          <span>닉네임</span>
          <input
            type="text" value={nickname}
            onChange={(e) => useEditor.getState().apply((d) => { d.content.nickname = e.target.value; }, 'nickname')}
          />
        </label>
        <div className="field">
          <span>내 사진</span>
          <div className="photo-field">
            {photoSrc ? <img src={photoSrc} alt="" /> : <div className="photo-empty">없음</div>}
            <button type="button" onClick={async () => { const f = await pickFile('image/*'); if (f) await setPhoto(f); }}>
              {photoSrc ? '바꾸기' : '사진 넣기'}
            </button>
            {photoSrc && <button type="button" onClick={clearPhoto}>빼기</button>}
          </div>
        </div>
      </div>
      <h4>사양</h4>
      <SpecEditor />
    </Modal>
  );
}

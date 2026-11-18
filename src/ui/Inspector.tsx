import { useEffect, useMemo, useRef, useState } from 'react';
import {
  alignSelection, copyStyle, deleteSelection, fitToCard, hasStyleClip, pasteStyle, groupSelection, patchLayer, pickFile, replaceImage, useAsBackground,
  type AlignMode,
} from '../editor/actions';
import { blendHasNoEffect } from '../editor/blendCheck';
import { CARD_SCHEMA, sectionsFor, type PropDef, type Section } from '../editor/schema';
import { useEditor } from '../editor/store';
import { findLayer, getPath, setPath } from '../model/ops';
import type { Doc, Layer } from '../model/types';
import { assetSrc } from '../render/assets';
import { SpecEditor } from './Content';
import { ColorControl, FontControl, NumberControl, Segment, Toggle } from './controls';

const KIND_NAME: Record<Layer['kind'], string> = {
  shape: '도형', image: '이미지', text: '텍스트', spec: '사양 목록', effect: '효과', group: '그룹',
};

type Setter = (def: PropDef, value: unknown) => void;

function read(def: PropDef, target: unknown, doc: Doc): unknown {
  return def.get ? def.get(target, doc) : getPath(target, def.path);
}

function PropRow({ def, target, doc, onSet }: { def: PropDef; target: unknown; doc: Doc; onSet: Setter }) {
  const value = read(def, target, doc);
  const t = useEditor((st) => (st.playing ? 0 : st.t));
  const blendNote = useMemo(() => {
    if (def.path !== 'blend' || !(target as Layer).id) return null;
    return blendHasNoEffect(doc, (target as Layer).id, t)
      ? '지금 색 조합에서는 “보통”과 결과가 같습니다. 이 레이어 아래에 다른 색이 깔려 있어야 차이가 나고, 흰색에 스크린·검정에 곱하기처럼 변화가 없는 조합도 있습니다.'
      : null;
  }, [def.path, target, doc, t]);
  const note = blendNote ?? def.note?.(target, doc) ?? null;
  const areaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (def.control !== 'textarea') return undefined;
    const focus = () => { areaRef.current?.focus(); areaRef.current?.select(); };
    window.addEventListener('jjal:focus-text', focus);
    return () => window.removeEventListener('jjal:focus-text', focus);
  }, [def.control]);

  let control: React.ReactNode;
  if (def.control === 'number') {
    control = (
      <NumberControl
        value={Number(value)} min={def.min} max={def.max} step={def.step} unit={def.unit}
        percent={def.percent} slider={def.slider} onChange={(v) => onSet(def, v)}
      />
    );
  } else if (def.control === 'color') {
    control = <ColorControl value={String(value)} onChange={(v) => onSet(def, v)} />;
  } else if (def.control === 'toggle') {
    control = <Toggle value={!!value} label={def.label} onChange={(v) => onSet(def, v)} />;
  } else if (def.control === 'select') {
    control = (
      <select value={String(value)} onChange={(e) => onSet(def, e.target.value)}>
        {def.options!.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    );
  } else if (def.control === 'segment') {
    control = <Segment value={value as string | number} options={def.options!} onChange={(v) => onSet(def, v)} />;
  } else if (def.control === 'font') {
    control = <FontControl value={String(value)} onChange={(v) => onSet(def, v)} />;
  } else {
    control = (
      <textarea
        ref={areaRef} rows={Math.min(5, Math.max(2, String(value).split('\n').length))} value={String(value)}
        onChange={(e) => onSet(def, e.target.value)}
      />
    );
  }
  const stacked = def.control === 'textarea' || def.control === 'font' || def.control === 'segment';
  return (
    <div className={`prop${stacked ? ' stacked' : ''}`}>
      <label>{def.label}</label>
      <div className="prop-control">{control}</div>
      {note && (
        <p className="note warn">
          {note}
          {def.fix && <button type="button" className="mini" onClick={() => onSet({ ...def, set: (t, _v, d) => def.fix!.apply(t, d) }, null)}>{def.fix.label}</button>}
        </p>
      )}
    </div>
  );
}

function Sections({ sections, target, doc, onSet }: { sections: Section[]; target: unknown; doc: Doc; onSet: Setter }) {
  return (
    <>
      {sections.map((section) => {
        if (section.visible && !section.visible(target, doc)) return null;
        const on = section.toggle ? !!getPath(target, section.toggle) : true;
        const props = section.props.filter((p) => !p.visible || p.visible(target, doc));
        return (
          <section className="insp-section" key={section.title}>
            <header>
              <h4>{section.title}</h4>
              {section.toggle && (
                <Toggle
                  value={on} label={section.title}
                  onChange={(v) => onSet({ path: section.toggle!, label: section.title, control: 'toggle' }, v)}
                />
              )}
            </header>
            {on && props.map((def) => <PropRow key={def.path} def={def} target={target} doc={doc} onSet={onSet} />)}
          </section>
        );
      })}
    </>
  );
}

const ALIGN: { mode: AlignMode; icon: string; title: string }[] = [
  { mode: 'left', icon: '⇤', title: '왼쪽 맞춤' },
  { mode: 'hcenter', icon: '↔', title: '가로 가운데' },
  { mode: 'right', icon: '⇥', title: '오른쪽 맞춤' },
  { mode: 'top', icon: '⤒', title: '위 맞춤' },
  { mode: 'vcenter', icon: '↕', title: '세로 가운데' },
  { mode: 'bottom', icon: '⤓', title: '아래 맞춤' },
];

function AlignBar({ scope }: { scope: string }) {
  return (
    <div className="align-bar">
      <span className="sub">{scope}</span>
      {ALIGN.map((a) => (
        <button key={a.mode} type="button" title={a.title} onClick={() => alignSelection(a.mode)}>{a.icon}</button>
      ))}
    </div>
  );
}

function LayerInspector({ layer, doc }: { layer: Layer; doc: Doc }) {
  const cropId = useEditor((s) => s.cropId);
  const [, bump] = useState(0);
  const onSet: Setter = (def, value) => {
    patchLayer(layer.id, (l, d) => {
      if (def.set) def.set(l, value, d);
      else setPath(l, def.path, value);
    }, `${layer.id}:${def.path}`);
  };
  const hasImage = layer.kind === 'image'
    && !!assetSrc(doc, layer.slot === 'photo' ? doc.content.photo : layer.asset);

  return (
    <>
      <header className="panel-head">
        <h3>{layer.name}</h3>
        <span className="sub">{KIND_NAME[layer.kind]}</span>
      </header>
      <div className="insp-body">
        {layer.locked && (
          <p className="note warn">
            잠긴 레이어입니다. 캔버스에서 선택·이동되지 않습니다.
            <button type="button" className="mini" onClick={() => patchLayer(layer.id, (l) => { l.locked = false; })}>잠금 풀기</button>
          </p>
        )}
        {!layer.visible && (
          <p className="note warn">
            숨긴 레이어라 값을 바꿔도 화면에 보이지 않습니다.
            <button type="button" className="mini" onClick={() => patchLayer(layer.id, (l) => { l.visible = true; })}>보이기</button>
          </p>
        )}
        {layer.kind !== 'group' && <AlignBar scope="카드 기준 맞춤" />}
        {layer.kind !== 'group' && (
          <div className="insp-actions">
            {layer.kind !== 'text' && (
              <button type="button" title="위치 0,0 · 카드 크기 · 회전 0으로 되돌립니다" onClick={() => fitToCard(layer.id)}>카드에 꽉 채우기</button>
            )}
            <button type="button" disabled={layer.rot === 0} onClick={() => patchLayer(layer.id, (l) => { l.rot = 0; })}>회전 0°</button>
            <button type="button" title="이 레이어의 꾸밈을 기억합니다 (Ctrl+Alt+C)" onClick={() => { copyStyle(); bump((n) => n + 1); }}>스타일 복사</button>
            <button type="button" disabled={!hasStyleClip()} title="기억한 꾸밈을 이 레이어에 입힙니다 (Ctrl+Alt+V)" onClick={pasteStyle}>스타일 붙여넣기</button>
          </div>
        )}

        {layer.kind === 'image' && (
          <div className="insp-actions">
            <button type="button" onClick={async () => { const f = await pickFile('image/*'); if (f) await replaceImage(layer.id, f); }}>
              {hasImage ? '이미지 바꾸기' : '이미지 넣기'}
            </button>
            <button
              type="button" disabled={!hasImage} className={cropId === layer.id ? 'on' : ''}
              onClick={() => useEditor.getState().set({ cropId: cropId === layer.id ? null : layer.id })}
            >{cropId === layer.id ? '자르기 끝내기' : '자르기 (끌어서 위치)'}</button>
            {layer.role !== 'bg' && hasImage && (
              <button type="button" onClick={() => useAsBackground(layer.id)}>카드 배경으로 깔기</button>
            )}
          </div>
        )}
        {layer.kind === 'spec' && (
          <details className="insp-section" open>
            <summary>내용 — 사양 {doc.content.specs.length}행</summary>
            <SpecEditor />
          </details>
        )}
        <Sections sections={sectionsFor(layer)} target={layer} doc={doc} onSet={onSet} />
      </div>
    </>
  );
}

function CardInspector({ doc }: { doc: Doc }) {
  const onSet: Setter = (def, value) => {
    useEditor.getState().apply((d) => {
      if (def.set) def.set(d, value, d);
      else setPath(d, def.path, value);
    }, `card:${def.path}`);
  };
  return (
    <>
      <header className="panel-head">
        <h3>카드 설정</h3>
        <span className="sub">레이어를 고르면 그 속성이 나옵니다</span>
      </header>
      <div className="insp-body">
        <Sections sections={CARD_SCHEMA} target={doc} doc={doc} onSet={onSet} />
        <p className="note">출력 크기는 항상 카드 크기 그대로입니다. 그림자·발광은 카드 경계에서 잘립니다.</p>
      </div>
    </>
  );
}

export function Inspector() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const layers = selection.map((id) => findLayer(doc.layers, id)?.layer).filter((l): l is Layer => !!l);

  let body: React.ReactNode;
  if (layers.length === 0) body = <CardInspector doc={doc} />;
  else if (layers.length === 1) body = <LayerInspector key={layers[0].id} layer={layers[0]} doc={doc} />;
  else {
    body = (
      <>
        <header className="panel-head">
          <h3>{layers.length}개 선택</h3>
          <span className="sub">함께 옮길 수 있습니다</span>
        </header>
        <div className="insp-body">
          <AlignBar scope="선택 범위 기준 맞춤" />
          <div className="insp-actions">
            <button type="button" onClick={groupSelection}>그룹으로 묶기</button>
            <button type="button" className="danger" onClick={deleteSelection}>삭제</button>
          </div>
          <p className="note">세부 속성은 레이어를 하나만 골랐을 때 나옵니다.</p>
        </div>
      </>
    );
  }
  return <section className="panel inspector">{body}</section>;
}

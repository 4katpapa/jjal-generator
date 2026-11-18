import { patchLayer, pickFile, replaceImage } from '../editor/actions';
import { CARD_SCHEMA, sectionsFor, type PropDef, type Section } from '../editor/schema';
import { useEditor } from '../editor/store';
import { findLayer, getPath, setPath } from '../model/ops';
import type { Doc, Layer, LayerKind } from '../model/types';
import { assetSrc } from '../render/assets';
import { ColorControl, FontControl, NumberControl, Toggle } from './controls';

// 캔버스 위 빠른 도구모음. 고른 레이어에서 자주 만지는 속성만 한 줄로 보여준다.
// 속성 패널과 같은 정의(schema.ts)를 쓰므로 값·범위·표시 조건이 항상 같다.

const QUICK: Record<LayerKind, string[]> = {
  text: ['font', 'size', 'color', 'bold', 'italic', 'styles.outline.on', 'styles.outline.color', 'styles.outline.width', 'opacity'],
  spec: ['font', 'size', 'labelColor', 'valueColor', 'icons.on', 'styles.outline.on', 'styles.outline.color', 'opacity'],
  shape: ['fill.type', 'fill.color', 'fill.color2', 'fill.opacity', 'radius', 'opacity'],
  image: ['zoom', 'fit', 'mask', 'radius', 'opacity'],
  effect: ['effect', 'color', 'color2', 'density', 'speed', 'opacity'],
  group: ['opacity'],
};

const CARD_QUICK = ['card.w', 'card.h', 'card.radius', 'card.border.on', 'card.border.style', 'card.border.color', 'card.border.width'];

const SHORT: Record<string, string> = {
  'styles.outline.on': '외곽선',
  'styles.outline.color': '외곽선 색',
  'styles.outline.width': '두께',
  'icons.on': '아이콘',
  'fill.type': '채움',
  'fill.opacity': '채움 %',
  'fill.color2': '색 2',
  color2: '색 2',
  radius: '둥글기',
  'card.radius': '둥글기',
  'card.border.on': '테두리',
  'card.border.style': '선',
  'card.border.color': '선 색',
  'card.border.width': '두께',
  effect: '효과',
  opacity: '불투명',
  labelColor: '항목 색',
  valueColor: '값 색',
};

interface Item { def: PropDef; shown: boolean }

/** 정의에서 경로에 맞는 속성을 찾고, 지금 그림에 영향을 주는지도 함께 판단한다. */
function collect(sections: Section[], paths: string[], target: unknown, doc: Doc): Item[] {
  const out: Item[] = [];
  for (const path of paths) {
    for (const section of sections) {
      if (section.visible && !section.visible(target, doc)) continue;
      if (section.toggle === path) {
        out.push({ def: { path, label: section.title, control: 'toggle' }, shown: true });
        break;
      }
      const def = section.props.find((p) => p.path === path);
      if (!def) continue;
      const sectionOn = !section.toggle || !!getPath(target, section.toggle);
      out.push({ def, shown: sectionOn && (!def.visible || def.visible(target, doc)) });
      break;
    }
  }
  return out.filter((i) => i.shown);
}

function Control({ def, target, doc, onSet, sliders }: { def: PropDef; target: unknown; doc: Doc; onSet: (def: PropDef, v: unknown) => void; sliders?: boolean }) {
  const value = def.get ? def.get(target, doc) : getPath(target, def.path);
  let control: React.ReactNode;
  if (def.control === 'number') {
    control = (
      <NumberControl
        value={Number(value)} min={def.min} max={def.max} step={def.step} unit={def.unit}
        percent={def.percent} slider={!!sliders && def.slider !== false} onChange={(v) => onSet(def, v)}
      />
    );
  } else if (def.control === 'color') {
    control = <ColorControl value={String(value)} onChange={(v) => onSet(def, v)} />;
  } else if (def.control === 'toggle') {
    control = <Toggle value={!!value} label={def.label} onChange={(v) => onSet(def, v)} />;
  } else if (def.control === 'font') {
    control = <FontControl compact value={String(value)} onChange={(v) => onSet(def, v)} />;
  } else {
    control = (
      <select
        value={String(value)}
        onChange={(e) => {
          const picked = def.options!.find((o) => String(o.value) === e.target.value);
          onSet(def, picked ? picked.value : e.target.value);
        }}
      >
        {def.options!.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <label className={`quick-item quick-${def.control}`} title={def.label}>
      <span>{SHORT[def.path] ?? def.label}</span>
      {control}
    </label>
  );
}

const KIND_NAME: Record<LayerKind, string> = {
  shape: '도형', image: '이미지', text: '텍스트', spec: '사양 목록', effect: '효과', group: '그룹',
};

/** sliders: 숫자 칸 옆에 슬라이더도 보여 준다(터치 화면용). */
export function QuickBar({ sliders }: { sliders?: boolean } = {}) {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const cropId = useEditor((s) => s.cropId);
  const layers = selection.map((id) => findLayer(doc.layers, id)?.layer).filter((l): l is Layer => !!l);

  if (layers.length > 1) {
    return <div className="quickbar"><b className="quick-title">{layers.length}개 선택</b><span className="sub">하나만 고르면 빠른 도구가 나옵니다</span></div>;
  }

  if (layers.length === 0) {
    const onSet = (def: PropDef, value: unknown) => useEditor.getState().apply((d) => {
      if (def.set) def.set(d, value, d);
      else setPath(d, def.path, value);
    }, `card:${def.path}`);
    return (
      <div className="quickbar">
        <b className="quick-title">카드</b>
        {collect(CARD_SCHEMA, CARD_QUICK, doc, doc).map(({ def }) => <Control key={def.path} def={def} target={doc} doc={doc} onSet={onSet} sliders={sliders} />)}
      </div>
    );
  }

  const layer = layers[0];
  const onSet = (def: PropDef, value: unknown) => patchLayer(layer.id, (l, d) => {
    if (def.set) def.set(l, value, d);
    else setPath(l, def.path, value);
  }, `${layer.id}:${def.path}`);
  const hasImage = layer.kind === 'image' && !!assetSrc(doc, layer.slot === 'photo' ? doc.content.photo : layer.asset);

  return (
    <div className="quickbar">
      <b className="quick-title">{KIND_NAME[layer.kind]}</b>
      {layer.kind === 'image' && (
        <>
          <button type="button" onClick={async () => { const f = await pickFile('image/*'); if (f) await replaceImage(layer.id, f); }}>
            {hasImage ? '바꾸기' : '이미지 넣기'}
          </button>
          <button
            type="button" disabled={!hasImage} className={cropId === layer.id ? 'on' : ''}
            onClick={() => useEditor.getState().set({ cropId: cropId === layer.id ? null : layer.id })}
          >{cropId === layer.id ? '자르기 끝' : '자르기'}</button>
        </>
      )}
      {collect(sectionsFor(layer), QUICK[layer.kind], layer, doc).map(({ def }) => (
        <Control key={def.path} def={def} target={layer} doc={doc} onSet={onSet} sliders={sliders} />
      ))}
    </div>
  );
}

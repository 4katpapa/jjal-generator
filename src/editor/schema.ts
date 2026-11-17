import type { Doc, EffectLayer, ImageLayer, Layer, LayerKind, ShapeLayer, SpecLayer, TextLayer } from '../model/types';
import { EFFECT_LABELS } from '../model/factory';
import { hasMotion } from '../model/ops';
import { layerBox } from '../render/geometry';
import { layoutSpec } from '../render/spec';

// 속성 패널과 자동 검사가 함께 쓰는 속성 정의.
// 여기에 적힌 속성만 화면에 나오고, 여기에 적힌 속성은 모두 "값을 바꾸면 그림이 바뀐다"는 검사를 받는다.

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PropDef {
  path: string;
  label: string;
  control: 'number' | 'color' | 'toggle' | 'select' | 'segment' | 'textarea' | 'font';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** 0..1 값을 0..100%로 보여준다. */
  percent?: boolean;
  /** false면 슬라이더 없이 숫자 칸만 둔다(위치처럼 범위가 정해지지 않은 값). */
  slider?: boolean;
  options?: { value: string | number; label: string }[];
  /** 이 속성이 지금 그림에 영향을 주는지. false면 패널에서 감춘다. */
  visible?: (target: any, doc: Doc) => boolean;
  /** 실제 적용값이 설정값과 다를 때 그 이유를 알려 주는 문구. */
  note?: (target: any, doc: Doc) => string | null;
  /** note와 함께 보여 줄 한 번에 해결 버튼. */
  fix?: { label: string; apply: (target: any, doc: Doc) => void };
  get?: (target: any, doc: Doc) => unknown;
  set?: (target: any, value: any, doc: Doc) => void;
  /** 자동 검사용: 이 속성이 눈에 보이도록 대상을 준비한다. */
  prep?: (target: any, doc: Doc) => void;
  /** 자동 검사용: 바꿔 볼 값. 없으면 종류에 맞게 고른다. */
  alt?: unknown;
}

export interface Section {
  title: string;
  /** 켜기/끄기 스위치가 되는 속성 경로. 꺼져 있으면 아래 항목을 감춘다. */
  toggle?: string;
  visible?: (target: any, doc: Doc) => boolean;
  props: PropDef[];
}

const BLENDS = [
  { value: 'source-over', label: '보통' },
  { value: 'multiply', label: '곱하기' },
  { value: 'screen', label: '스크린' },
  { value: 'overlay', label: '오버레이' },
  { value: 'soft-light', label: '소프트 라이트' },
  { value: 'lighter', label: '더하기(발광)' },
  { value: 'darken', label: '어둡게' },
  { value: 'lighten', label: '밝게' },
];

const SHAPES = [
  { value: 'rect', label: '사각' },
  { value: 'ellipse', label: '원' },
  { value: 'slant', label: '기울임' },
];

const pos: PropDef[] = [
  { path: 'x', label: 'X', control: 'number', slider: false, step: 1, alt: 137 },
  { path: 'y', label: 'Y', control: 'number', slider: false, step: 1, alt: 93 },
];
const size: PropDef[] = [
  { path: 'w', label: '너비', control: 'number', slider: false, min: 4, max: 4000, step: 1, alt: 333 },
  { path: 'h', label: '높이', control: 'number', slider: false, min: 4, max: 4000, step: 1, alt: 111 },
];
const rot: PropDef = { path: 'rot', label: '회전', control: 'number', min: -180, max: 180, step: 1, unit: '°', alt: 25 };

const display: Section = {
  title: '표시',
  props: [
    { path: 'opacity', label: '불투명도', control: 'number', min: 0, max: 1, step: 0.01, percent: true, alt: 0.4 },
    { path: 'blend', label: '혼합', control: 'select', options: BLENDS, alt: 'multiply' },
  ],
};

const styleSections: Section[] = [
  {
    title: '그림자', toggle: 'styles.shadow.on',
    props: [
      { path: 'styles.shadow.color', label: '색', control: 'color' },
      { path: 'styles.shadow.opacity', label: '진하기', control: 'number', min: 0.05, max: 1, step: 0.01, percent: true, alt: 1 },
      { path: 'styles.shadow.blur', label: '흐림', control: 'number', min: 0, max: 40, step: 0.5, alt: 30 },
      { path: 'styles.shadow.x', label: '가로 이동', control: 'number', min: -40, max: 40, step: 0.5, alt: 20 },
      { path: 'styles.shadow.y', label: '세로 이동', control: 'number', min: -40, max: 40, step: 0.5, alt: 20 },
    ],
  },
  {
    title: '외곽선', toggle: 'styles.outline.on',
    props: [
      { path: 'styles.outline.color', label: '색', control: 'color' },
      { path: 'styles.outline.width', label: '두께', control: 'number', min: 0.5, max: 12, step: 0.5, alt: 8 },
    ],
  },
  {
    title: '발광', toggle: 'styles.glow.on',
    props: [
      { path: 'styles.glow.color', label: '색', control: 'color' },
      { path: 'styles.glow.blur', label: '범위', control: 'number', min: 1, max: 40, step: 0.5, alt: 30 },
      { path: 'styles.glow.strength', label: '세기', control: 'number', min: 0.5, max: 5, step: 0.1, alt: 5 },
    ],
  },
];

const shapeOutline = (prefix: 'shape' | 'mask'): PropDef[] => [
  { path: prefix, label: '모양', control: 'segment', options: SHAPES, alt: 'ellipse' },
  {
    path: 'radius', label: '모서리 둥글기', control: 'number', min: 0, max: 150, step: 1, alt: 60,
    visible: (l) => l[prefix] === 'rect', prep: (l) => { l[prefix] = 'rect'; },
  },
  {
    path: 'slant', label: '기울기', control: 'number', min: -200, max: 200, step: 1, alt: -90,
    visible: (l) => l[prefix] === 'slant', prep: (l) => { l[prefix] = 'slant'; },
  },
];

const isPattern = (l: ShapeLayer) => l.fill.type !== 'solid' && l.fill.type !== 'linear';

const shape: Section[] = [
  { title: '배치', props: [...pos, ...size, rot] },
  { title: '모양', props: shapeOutline('shape') },
  {
    title: '채움',
    props: [
      {
        path: 'fill.type', label: '종류', control: 'select', alt: 'stripes',
        options: [
          { value: 'solid', label: '단색' }, { value: 'linear', label: '그라디언트' },
          { value: 'dots', label: '점 무늬' }, { value: 'stripes', label: '줄무늬' },
          { value: 'grid', label: '격자' }, { value: 'checker', label: '체커' },
        ],
      },
      { path: 'fill.color', label: '색', control: 'color' },
      {
        path: 'fill.color2', label: '두 번째 색', control: 'color',
        visible: (l: ShapeLayer) => l.fill.type !== 'solid', prep: (l: ShapeLayer) => { l.fill.type = 'linear'; },
      },
      {
        path: 'fill.angle', label: '각도', control: 'number', min: 0, max: 360, step: 1, unit: '°', alt: 20,
        visible: (l: ShapeLayer) => l.fill.type !== 'solid', prep: (l: ShapeLayer) => { l.fill.type = 'linear'; },
      },
      {
        path: 'fill.size', label: '무늬 크기', control: 'number', min: 4, max: 80, step: 1, alt: 37,
        visible: isPattern, prep: (l: ShapeLayer) => { l.fill.type = 'stripes'; },
      },
      { path: 'fill.opacity', label: '채움 불투명도', control: 'number', min: 0, max: 1, step: 0.01, percent: true, alt: 0.3 },
    ],
  },
  display,
  ...styleSections,
];

const image: Section[] = [
  { title: '배치', props: [...pos, ...size, rot] },
  {
    title: '이미지',
    props: [
      {
        path: 'slot', label: '내 사진 자리로 사용', control: 'toggle',
        get: (l: ImageLayer) => l.slot === 'photo',
        set: (l: ImageLayer, v: boolean) => { l.slot = v ? 'photo' : null; },
      },
      {
        path: 'fit', label: '맞춤', control: 'segment', alt: 'contain',
        options: [{ value: 'cover', label: '채우기' }, { value: 'contain', label: '전체 보기' }, { value: 'stretch', label: '늘이기' }],
      },
      { path: 'zoom', label: '확대', control: 'number', min: 0.2, max: 5, step: 0.01, percent: true, alt: 2.2 },
      { path: 'panX', label: '가로 위치', control: 'number', min: -400, max: 400, step: 1, alt: 55 },
      { path: 'panY', label: '세로 위치', control: 'number', min: -400, max: 400, step: 1, alt: 35 },
      { path: 'flipH', label: '좌우 반전', control: 'toggle' },
    ],
  },
  { title: '모양', props: shapeOutline('mask') },
  {
    title: '보정',
    props: [
      { path: 'brightness', label: '밝기', control: 'number', min: 20, max: 200, step: 1, unit: '%', alt: 160 },
      { path: 'contrast', label: '대비', control: 'number', min: 20, max: 200, step: 1, unit: '%', alt: 170 },
      { path: 'saturation', label: '채도', control: 'number', min: 0, max: 200, step: 1, unit: '%', alt: 0 },
      { path: 'blur', label: '흐림', control: 'number', min: 0, max: 20, step: 0.5, alt: 8 },
    ],
  },
  display,
  ...styleSections,
];

const text: Section[] = [
  {
    title: '내용',
    props: [
      {
        path: 'text', label: '문구', control: 'textarea', alt: '바뀐 문구',
        get: (l: TextLayer, doc) => (l.slot === 'nickname' ? doc.content.nickname : l.text),
        set: (l: TextLayer, v: string, doc) => {
          if (l.slot === 'nickname') doc.content.nickname = v;
          else l.text = v;
        },
        note: (l: TextLayer) => (l.slot === 'nickname' ? '닉네임 자리입니다. 여기서 고치면 내용의 닉네임이 바뀝니다.' : null),
      },
      {
        path: 'slot', label: '닉네임 자리로 사용', control: 'toggle',
        get: (l: TextLayer) => l.slot === 'nickname',
        set: (l: TextLayer, v: boolean, doc) => {
          if (!v) l.text = doc.content.nickname;
          l.slot = v ? 'nickname' : null;
        },
        prep: (l: TextLayer, doc) => { l.text = '다른 문구'; doc.content.nickname = '닉네임'; },
      },
    ],
  },
  {
    title: '글자',
    props: [
      { path: 'font', label: '글꼴', control: 'font', alt: 'Courier New' },
      { path: 'size', label: '크기', control: 'number', min: 8, max: 160, step: 1, unit: 'px', alt: 61 },
      { path: 'bold', label: '굵게', control: 'toggle' },
      { path: 'italic', label: '기울임', control: 'toggle' },
      { path: 'color', label: '색', control: 'color' },
      {
        path: 'align', label: '정렬', control: 'segment', alt: 'right',
        options: [{ value: 'left', label: '왼쪽' }, { value: 'center', label: '가운데' }, { value: 'right', label: '오른쪽' }],
        visible: (l: TextLayer) => !l.vertical,
        set: (l: TextLayer, v: TextLayer['align'], doc) => {
          const box = layerBox(l, doc.content);
          l.align = v;
          l.x = v === 'left' ? box.x : v === 'center' ? box.x + box.w / 2 : box.x + box.w;
        },
        note: (l: TextLayer, doc) => ((l.slot === 'nickname' ? doc.content.nickname : l.text).includes('\n')
          ? null : '한 줄일 때는 글자 수가 바뀔 때 늘어나는 방향을 정합니다.'),
        prep: (l: TextLayer) => { l.slot = null; l.text = '가나다라마바사\n가'; },
      },
      { path: 'lineHeight', label: '줄 높이', control: 'number', min: 0.8, max: 3, step: 0.05, alt: 2.4 },
      { path: 'letterSpacing', label: '자간', control: 'number', min: -5, max: 40, step: 0.5, unit: 'px', alt: 18 },
      { path: 'vertical', label: '세로쓰기', control: 'toggle' },
    ],
  },
  {
    title: '그라디언트', toggle: 'gradient.on',
    props: [
      { path: 'gradient.color2', label: '끝 색', control: 'color' },
      { path: 'gradient.angle', label: '각도', control: 'number', min: 0, max: 360, step: 1, unit: '°', alt: 0 },
    ],
  },
  { title: '배치', props: [...pos, rot] },
  display,
  ...styleSections,
];

const roomy = (l: SpecLayer) => { l.x = 20; l.y = 10; l.w = 800; l.h = 280; l.size = 14; };

const spec: Section[] = [
  {
    title: '글자',
    props: [
      { path: 'font', label: '글꼴', control: 'font', alt: 'Courier New' },
      {
        path: 'size', label: '크기', control: 'number', min: 8, max: 60, step: 1, unit: 'px', alt: 20, prep: roomy,
        note: (l: SpecLayer, doc) => {
          const lay = layoutSpec(l, doc.content.specs);
          if (lay.shrunk) return `영역에 맞추느라 실제로는 ${lay.fontSize.toFixed(1)}px로 그려집니다. 영역을 키우면 설정한 크기가 됩니다.`;
          if (lay.overflow) return '내용이 영역보다 큽니다.';
          return null;
        },
        fix: { label: '자동 맞춤 끄기', apply: (l: SpecLayer) => { l.autoFit = false; } },
      },
      { path: 'lineHeight', label: '줄 높이', control: 'number', min: 1, max: 3, step: 0.05, alt: 1.9, prep: roomy },
      { path: 'labelColor', label: '항목명 색', control: 'color' },
      { path: 'valueColor', label: '사양값 색', control: 'color' },
      { path: 'labelBold', label: '항목명 굵게', control: 'toggle' },
      { path: 'valueBold', label: '사양값 굵게', control: 'toggle' },
    ],
  },
  {
    title: '목록 배치',
    props: [
      {
        path: 'autoFit', label: '영역에 자동 맞춤', control: 'toggle',
        prep: (l: SpecLayer) => { l.w = 260; l.h = 90; l.size = 30; l.autoFit = true; },
        note: (l: SpecLayer, doc) => (!l.autoFit && layoutSpec(l, doc.content.specs).overflow ? '내용이 영역 밖으로 넘칩니다.' : null),
      },
      {
        path: 'columns', label: '열', control: 'segment', alt: 2, prep: roomy,
        options: [{ value: 1, label: '1열' }, { value: 2, label: '2열' }],
      },
      {
        path: 'colGap', label: '열 간격', control: 'number', min: 0, max: 120, step: 1, alt: 110,
        visible: (l: SpecLayer) => l.columns === 2, prep: (l: SpecLayer) => { roomy(l); l.columns = 2; },
      },
      {
        path: 'labelWidth', label: '항목명 폭 (0=자동)', control: 'number', min: 0, max: 240, step: 1, alt: 150, prep: roomy,
      },
      { path: 'gap', label: '항목명–값 간격', control: 'number', min: 0, max: 80, step: 1, alt: 70, prep: roomy },
      {
        path: 'valign', label: '세로 정렬', control: 'segment', alt: 'top', prep: roomy,
        options: [{ value: 'top', label: '위' }, { value: 'middle', label: '가운데' }, { value: 'bottom', label: '아래' }],
      },
      { path: 'padding', label: '안쪽 여백', control: 'number', min: 0, max: 60, step: 1, alt: 40, prep: roomy },
    ],
  },
  {
    title: '아이콘', toggle: 'icons.on',
    props: [
      {
        path: 'icons.set', label: '시리즈', control: 'segment', alt: 'pixel',
        options: [{ value: 'color', label: '컬러' }, { value: 'mono', label: '모노' }, { value: 'pixel', label: '픽셀' }],
      },
      { path: 'icons.scale', label: '크기 (글자 대비)', control: 'number', min: 0.5, max: 2.5, step: 0.05, alt: 2.2, prep: roomy },
    ],
  },
  {
    title: '배치',
    props: [
      ...pos,
      {
        ...size[0],
        prep: (l: SpecLayer) => { l.columns = 2; },
        note: (l: SpecLayer, doc) => (l.columns === 2 || layoutSpec(l, doc.content.specs).shrunk
          ? null
          : '지금은 내용이 영역보다 좁아서 너비를 바꿔도 그림은 그대로입니다. 영역 너비는 자동 맞춤의 한계와 2열 배치의 기준입니다.'),
      },
      size[1],
      rot,
    ],
  },
  display,
  ...styleSections,
];

const particle = (l: EffectLayer) => l.effect === 'sparkle' || l.effect === 'starfield' || l.effect === 'fall';

const effect: Section[] = [
  {
    title: '효과',
    props: [
      {
        path: 'effect', label: '종류', control: 'select', alt: 'aurora',
        options: Object.entries(EFFECT_LABELS).map(([value, label]) => ({ value, label })),
      },
      { path: 'color', label: '색', control: 'color' },
      { path: 'color2', label: '두 번째 색', control: 'color', visible: (l: EffectLayer) => l.effect !== 'shine' },
      { path: 'density', label: '양', control: 'number', min: 0, max: 1, step: 0.01, percent: true, alt: 1 },
      { path: 'speed', label: '빠르기', control: 'number', min: 1, max: 4, step: 1, alt: 3 },
      { path: 'size', label: '크기', control: 'number', min: 0.3, max: 3, step: 0.05, alt: 2.6 },
      {
        path: 'radius', label: '모서리 둥글기', control: 'number', min: 0, max: 150, step: 1, alt: 95,
        visible: (l: EffectLayer) => !particle(l),
        prep: (l: EffectLayer) => { if (l.effect === 'shine') { l.density = 1; l.size = 3; } },
      },
      { path: 'seed', label: '배치 바꾸기', control: 'number', min: 1, max: 99, step: 1, alt: 42, visible: particle },
    ],
  },
  { title: '배치', props: [...pos, ...size] },
  display,
  ...styleSections,
];

const group: Section[] = [display, ...styleSections];

export const SCHEMA: Record<LayerKind, Section[]> = { shape, image, text, spec, effect, group };

/** 아무것도 선택하지 않았을 때 나오는 카드 설정. 대상은 문서 전체다. */
export const CARD_SCHEMA: Section[] = [
  {
    title: '카드',
    props: [
      { path: 'card.w', label: '너비', control: 'number', slider: false, min: 200, max: 2000, step: 1, unit: 'px', alt: 600 },
      { path: 'card.h', label: '높이', control: 'number', slider: false, min: 100, max: 1200, step: 1, unit: 'px', alt: 400 },
      { path: 'card.radius', label: '모서리 둥글기', control: 'number', min: 0, max: 150, step: 1, alt: 90 },
    ],
  },
  {
    title: '카드 테두리', toggle: 'card.border.on',
    props: [
      { path: 'card.border.color', label: '색', control: 'color' },
      { path: 'card.border.width', label: '두께', control: 'number', min: 1, max: 24, step: 0.5, alt: 16 },
    ],
  },
  {
    title: '모서리 바깥',
    visible: (doc: Doc) => doc.card.radius > 0,
    props: [
      {
        path: 'card.matte.type', label: '채움', control: 'segment', alt: 'color',
        options: [{ value: 'transparent', label: '투명' }, { value: 'color', label: '색으로 채움' }],
        prep: (doc: Doc) => { doc.card.radius = 40; },
        note: (doc: Doc) => (doc.card.matte.type === 'transparent'
          ? '투명을 지원하지 않는 게시판에서는 모서리 바깥이 검게 보일 수 있습니다. 그럴 땐 게시판 배경색으로 채우세요.' : null),
      },
      {
        path: 'card.matte.color', label: '바깥 색', control: 'color',
        visible: (doc: Doc) => doc.card.matte.type === 'color',
        prep: (doc: Doc) => { doc.card.radius = 40; doc.card.matte.type = 'color'; },
      },
    ],
  },
  {
    title: '움직임',
    visible: (doc: Doc) => hasMotion(doc),
    props: [
      { path: 'anim.duration', label: '반복 길이', control: 'number', min: 1, max: 6, step: 0.5, unit: '초', alt: 5 },
    ],
  },
];

export function sectionsFor(layer: Layer): Section[] {
  return SCHEMA[layer.kind];
}

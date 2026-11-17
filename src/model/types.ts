// 문서 모델. 캔버스에 보이는 모든 것은 layers 안에 있고, 배열 뒤쪽이 화면 앞쪽이다.

export type BlendMode =
  | 'source-over' | 'multiply' | 'screen' | 'overlay'
  | 'soft-light' | 'lighter' | 'darken' | 'lighten';

export interface LayerStyles {
  shadow: { on: boolean; color: string; opacity: number; blur: number; x: number; y: number };
  outline: { on: boolean; color: string; width: number };
  glow: { on: boolean; color: string; blur: number; strength: number };
}

export interface LayerBase {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blend: BlendMode;
  /** 회전 전 상자의 왼쪽 위. 텍스트 레이어의 x는 정렬 기준점(왼쪽/가운데/오른쪽)이다. */
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  styles: LayerStyles;
  /** 'bg'는 배경 갤러리가 교체 대상으로 삼는 바탕 레이어 표시다. */
  role: 'bg' | null;
}

export type FillType = 'solid' | 'linear' | 'dots' | 'stripes' | 'grid' | 'checker';

export interface FillProps {
  type: FillType;
  color: string;
  color2: string;
  angle: number;
  size: number;
  opacity: number;
}

export type OutlineShape = 'rect' | 'ellipse' | 'slant';

export interface ShapeLayer extends LayerBase {
  kind: 'shape';
  shape: OutlineShape;
  radius: number;
  slant: number;
  fill: FillProps;
}

export interface ImageLayer extends LayerBase {
  kind: 'image';
  /** doc.assets의 id. slot이 'photo'면 content.photo가 우선한다. */
  asset: string | null;
  slot: 'photo' | null;
  fit: 'cover' | 'contain' | 'stretch';
  zoom: number;
  panX: number;
  panY: number;
  flipH: boolean;
  mask: OutlineShape;
  radius: number;
  slant: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

export interface TextLayer extends LayerBase {
  kind: 'text';
  text: string;
  slot: 'nickname' | null;
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  color: string;
  gradient: { on: boolean; color2: string; angle: number };
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  vertical: boolean;
}

export type IconSet = 'color' | 'mono' | 'pixel';

export interface SpecLayer extends LayerBase {
  kind: 'spec';
  font: string;
  size: number;
  lineHeight: number;
  labelColor: string;
  valueColor: string;
  labelBold: boolean;
  valueBold: boolean;
  /** 0이면 가장 긴 항목명에 맞춘다. */
  labelWidth: number;
  gap: number;
  columns: 1 | 2;
  colGap: number;
  autoFit: boolean;
  valign: 'top' | 'middle' | 'bottom';
  padding: number;
  icons: { on: boolean; set: IconSet; scale: number };
}

export type EffectType =
  | 'sparkle' | 'starfield' | 'shine' | 'aurora'
  | 'scanline' | 'fall' | 'borderRun' | 'borderPulse';

export interface EffectLayer extends LayerBase {
  kind: 'effect';
  effect: EffectType;
  color: string;
  color2: string;
  density: number;
  /** 반복 구간 한 번에 몇 바퀴 도는지. 정수라서 끝과 처음이 이어진다. */
  speed: number;
  size: number;
  radius: number;
  seed: number;
}

export interface GroupLayer extends LayerBase {
  kind: 'group';
  children: Layer[];
}

export type Layer = ShapeLayer | ImageLayer | TextLayer | SpecLayer | EffectLayer | GroupLayer;
export type LayerKind = Layer['kind'];

export type IconKind =
  | 'cpu' | 'mb' | 'ram' | 'gpu' | 'ssd' | 'hdd' | 'psu' | 'case' | 'cooler'
  | 'monitor' | 'speaker' | 'mouse' | 'keyboard' | 'headset' | 'mic' | 'etc';

export interface SpecRow {
  id: string;
  label: string;
  value: string;
  icon: 'auto' | 'none' | IconKind;
  /** null이면 사양 목록 레이어의 값 글자색을 따른다. */
  color: string | null;
}

export interface Asset {
  id: string;
  name: string;
  /** 내장 이미지는 상대 URL, 사용자가 넣은 이미지는 data URL. */
  src: string;
  builtin: boolean;
}

export interface Card {
  w: number;
  h: number;
  radius: number;
  border: { on: boolean; color: string; width: number };
  /** 둥근 모서리 바깥을 채우는 방식. */
  matte: { type: 'transparent' | 'color'; color: string };
}

export interface Content {
  nickname: string;
  specs: SpecRow[];
  photo: string | null;
}

export interface Doc {
  version: 1;
  name: string;
  card: Card;
  content: Content;
  layers: Layer[];
  assets: Record<string, Asset>;
  anim: { duration: number; fps: number };
}

export interface Box { x: number; y: number; w: number; h: number; rot: number }

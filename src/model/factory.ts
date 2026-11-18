import type {
  Card, Content, Doc, EffectLayer, EffectType, GroupLayer, ImageLayer, Layer, LayerBase,
  LayerStyles, ShapeLayer, SpecLayer, SpecRow, TextLayer,
} from './types';

let counter = 0;
export function uid(prefix = 'l'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const DEFAULT_FONT = 'Nanum Gothic';

export function defaultStyles(): LayerStyles {
  return {
    shadow: { on: false, color: '#000000', opacity: 0.5, blur: 6, x: 0, y: 2 },
    outline: { on: false, color: '#ffffff', width: 2 },
    glow: { on: false, color: '#ffffff', blur: 8, strength: 2 },
  };
}

function base(name: string, x: number, y: number, w: number, h: number): LayerBase {
  return {
    id: uid(), name, visible: true, locked: false, opacity: 1, blend: 'source-over',
    x, y, w, h, rot: 0, styles: defaultStyles(), role: null,
  };
}

type Patch<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> | T[K] : T[K] };

/** 한 단계 깊이까지 병합한다(styles는 두 단계). 프리셋 정의를 짧게 쓰기 위한 도구다. */
function merge<T extends Layer>(layer: T, patch?: Omit<Patch<T>, 'styles'> & { styles?: Partial<{ [K in keyof LayerStyles]: Partial<LayerStyles[K]> }> }): T {
  if (!patch) return layer;
  const out = layer as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === 'styles') {
      const styles = layer.styles as unknown as Record<string, Record<string, unknown>>;
      for (const [sk, sv] of Object.entries(value as object)) {
        styles[sk] = { ...styles[sk], ...(sv as object) };
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object') {
      out[key] = { ...(out[key] as object), ...(value as object) };
    } else {
      out[key] = value;
    }
  }
  return layer;
}

export function makeShape(patch?: Parameters<typeof merge<ShapeLayer>>[1]): ShapeLayer {
  return merge<ShapeLayer>({
    ...base('도형', 60, 60, 220, 120), kind: 'shape', shape: 'rect', radius: 12, slant: 40,
    fill: { type: 'solid', color: '#4f8cff', color2: '#b06cff', angle: 90, size: 14, opacity: 1, base: true, weight: 1 },
  }, patch);
}

export function makeImage(patch?: Parameters<typeof merge<ImageLayer>>[1]): ImageLayer {
  return merge<ImageLayer>({
    ...base('이미지', 560, 30, 240, 240), kind: 'image', asset: null, slot: null,
    fit: 'cover', zoom: 1, panX: 0, panY: 0, flipH: false, mask: 'rect', radius: 0, slant: 60,
    brightness: 100, contrast: 100, saturation: 100, blur: 0,
  }, patch);
}

export function makeText(patch?: Parameters<typeof merge<TextLayer>>[1]): TextLayer {
  return merge<TextLayer>({
    ...base('텍스트', 40, 30, 0, 0), kind: 'text', text: '텍스트', slot: null,
    font: DEFAULT_FONT, size: 28, bold: true, italic: false, color: '#ffffff',
    gradient: { on: false, color2: '#ffd166', angle: 90 },
    align: 'left', lineHeight: 1.25, letterSpacing: 0, vertical: false,
  }, patch);
}

export function makeSpec(patch?: Parameters<typeof merge<SpecLayer>>[1]): SpecLayer {
  return merge<SpecLayer>({
    ...base('사양 목록', 30, 60, 480, 220), kind: 'spec',
    font: DEFAULT_FONT, size: 18, lineHeight: 1.35,
    labelColor: '#ffffff', valueColor: '#ffffff', labelBold: true, valueBold: true,
    labelWidth: 0, gap: 14, columns: 1, colGap: 24, autoFit: true, valign: 'middle', padding: 0,
    icons: { on: true, set: 'color', scale: 1.15 },
  }, patch);
}

export interface EffectMeta {
  label: string;
  /** 테두리를 따라 그리는 효과인지(아니면 영역을 채우는 효과). */
  border: boolean;
  /** 각 속성이 이 효과의 그림에 영향을 주는지. 영향이 없는 속성은 패널에서 감춘다. */
  color: boolean;
  color2: boolean;
  seed: boolean;
  radius: boolean;
}

const fx = (label: string, flags: string): EffectMeta => ({
  label, border: flags.includes('b'), color: !flags.includes('n'),
  color2: flags.includes('2'), seed: flags.includes('s'), radius: flags.includes('r'),
});

// 표기: 2=두 번째 색 사용, s=배치 바꾸기 사용, r=모서리 둥글기 사용, b=테두리 효과, n=색 미사용
export const EFFECTS: Record<EffectType, EffectMeta> = {
  sparkle: fx('반짝임', '2s'),
  starfield: fx('흐르는 별', '2s'),
  shine: fx('광택 스윕', 'r'),
  aurora: fx('오로라', '2r'),
  scanline: fx('스캔라인', '2r'),
  fall: fx('꽃잎 흩날림', '2s'),
  snow: fx('눈 내림', '2s'),
  rain: fx('비 내림', '2s'),
  hearts: fx('하트 둥둥', '2s'),
  bubbles: fx('비눗방울', '2s'),
  fireflies: fx('반딧불', '2s'),
  meteor: fx('유성', '2s'),
  rays: fx('회전 광선', 'r'),
  wave: fx('시그널 파형', '2'),
  bars: fx('이퀄라이저 막대', '2s'),
  matrix: fx('매트릭스 문자', '2s'),
  borderRun: fx('테두리 빛 순환', 'b2r'),
  borderPulse: fx('테두리 맥동', 'b2r'),
  borderMarquee: fx('테두리 행진', 'b2r'),
  borderRainbow: fx('무지개 테두리', 'bnr'),
  borderCorners: fx('모서리 브래킷', 'b2r'),
};

export const EFFECT_LABELS = Object.fromEntries(
  Object.entries(EFFECTS).map(([k, v]) => [k, v.label]),
) as Record<EffectType, string>;

const EFFECT_COLORS: Partial<Record<EffectType, [string, string]>> = {
  aurora: ['#58e6ff', '#b06cff'],
  hearts: ['#ff6fa5', '#ffc2d8'],
  rain: ['#bfe3ff', '#ffffff'],
  fireflies: ['#fff59a', '#b8ff8a'],
  meteor: ['#ffffff', '#8fd3ff'],
  wave: ['#42e8ff', '#ff6fd8'],
  bars: ['#42e8ff', '#b06cff'],
  matrix: ['#39ff88', '#eaffef'],
  borderMarquee: ['#ffffff', '#ffd166'],
  borderCorners: ['#42e8ff', '#ffffff'],
};

export function makeEffect(effect: EffectType, card: Card, patch?: Parameters<typeof merge<EffectLayer>>[1]): EffectLayer {
  return merge<EffectLayer>({
    ...base(EFFECT_LABELS[effect], 0, 0, card.w, card.h), kind: 'effect', effect,
    color: EFFECT_COLORS[effect]?.[0] ?? '#ffffff',
    color2: EFFECT_COLORS[effect]?.[1] ?? '#ffd6f0',
    density: 0.5, speed: 1, size: 1, radius: card.radius, seed: 7,
  }, patch);
}

export function makeGroup(children: Layer[], name = '그룹'): GroupLayer {
  return { ...base(name, 0, 0, 0, 0), kind: 'group', children };
}

export function makeRow(label: string, value = '', icon: SpecRow['icon'] = 'auto'): SpecRow {
  return { id: uid('r'), label, value, icon, color: null };
}

export function defaultContent(): Content {
  return {
    nickname: '닉네임',
    specs: ['CPU', 'MB', 'RAM', 'VGA', 'SSD', 'PSU', 'CHA', 'CS'].map((l) => makeRow(l)),
    photo: null,
  };
}

export function defaultCard(): Card {
  return {
    w: 850, h: 300, radius: 16,
    border: { on: false, style: 'solid', color: '#ffffff', color2: '#ffd166', width: 3, inset: 0 },
    deco: { on: false, style: 'dashed', color: '#ffffff', color2: '#ffd166', width: 1.5, inset: 10 },
    matte: { type: 'transparent', color: '#ffffff' },
  };
}

export function emptyDoc(): Doc {
  return {
    version: 1, name: '', card: defaultCard(), content: defaultContent(),
    layers: [], assets: {}, anim: { duration: 3, fps: 20 },
  };
}

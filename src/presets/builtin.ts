import type { Asset, Card, Doc, Layer } from '../model/types';
import { defaultCard, makeEffect, makeImage, makeShape, makeSpec, makeText } from '../model/factory';
import { backgroundUrl } from '../render/assets';

/** 프리셋은 내용(사양·닉네임·사진)을 뺀 평범한 문서 조각이다. 적용하면 일반 레이어가 된다. */
export interface PresetData {
  card: Card;
  layers: Layer[];
  assets: Record<string, Asset>;
  anim?: Doc['anim'];
}

export interface Preset {
  id: string;
  name: string;
  hint: string;
  motion: boolean;
  build: () => PresetData;
}

const W = 850;
const H = 300;

function card(patch: { radius?: number; border?: Partial<Card['border']>; deco?: Partial<Card['deco']> } = {}): Card {
  const base = defaultCard();
  return {
    ...base,
    radius: patch.radius ?? base.radius,
    border: { ...base.border, ...patch.border },
    deco: { ...base.deco, ...patch.deco },
  };
}

function bgAsset(id: string, name: string): Record<string, Asset> {
  return { [`bg_${id}`]: { id: `bg_${id}`, name, src: backgroundUrl(id), builtin: true } };
}

const base = { name: '배경', role: 'bg' as const, locked: true, x: 0, y: 0, w: W, h: H, radius: 0 };

export const PRESETS: Preset[] = [
  {
    id: 'clean-light', name: '클린 라이트', hint: '흰 패널 + 둥근 사진', motion: false,
    build: () => {
      const c = card({ radius: 16 });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'linear', color: '#f4f8ff', color2: '#cfe0ff', angle: 20 } }),
          makeShape({
            name: '사양 패널', x: 22, y: 22, w: 506, h: 256, radius: 16, fill: { color: '#ffffff', opacity: 0.92 },
            styles: { shadow: { on: true, color: '#3b5bb5', opacity: 0.22, blur: 18, y: 4 } },
          }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 556, y: 28, w: 266, h: 244, radius: 20,
            styles: { shadow: { on: true, color: '#3b5bb5', opacity: 0.3, blur: 16, y: 4 } },
          }),
          makeSpec({ x: 44, y: 78, w: 464, h: 186, size: 16, labelColor: '#3565d8', valueColor: '#1d2b4f' }),
          makeText({ name: '닉네임', slot: 'nickname', x: 44, y: 34, size: 26, color: '#1d2b4f' }),
        ],
      };
    },
  },
  {
    id: 'pink-pop', name: '핑크 팝', hint: '기울인 사진 + 흰 글자 외곽선 + 반짝임', motion: true,
    build: () => {
      const c = card({ radius: 18, border: { on: true, color: '#ffffff', width: 4 } });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'dots', color: '#ffe9f6', color2: '#f6c3e2', size: 22, angle: 20 } }),
          makeShape({
            name: '빛 번짐', x: 0, y: 0, w: W, h: H, radius: 0, opacity: 0.75, blend: 'soft-light',
            fill: { type: 'linear', color: '#ffffff', color2: '#c77dff', angle: 25 },
          }),
          makeImage({ name: '내 사진', slot: 'photo', x: 452, y: 0, w: 440, h: H, mask: 'slant', slant: 120 }),
          makeSpec({
            x: 34, y: 64, w: 440, h: 222, size: 17, labelColor: '#ffffff', valueColor: '#ffffff',
            styles: { outline: { on: true, color: '#7a2a8f', width: 2.5 } },
          }),
          makeText({
            name: '닉네임', slot: 'nickname', x: 34, y: 16, size: 30, color: '#ffffff',
            styles: { outline: { on: true, color: '#b0338a', width: 3 } },
          }),
          makeEffect('sparkle', c, { color: '#ffffff', color2: '#ffd6f0', density: 0.35 }),
        ],
      };
    },
  },
  {
    id: 'dark-neon', name: '다크 네온', hint: '격자 바탕 + 네온 글자 + 테두리 빛', motion: true,
    build: () => {
      const c = card({ radius: 14 });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'grid', color: '#18224a', color2: '#0b1022', size: 26, angle: 0 } }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 26, y: 26, w: 248, h: 248, radius: 14,
            styles: { outline: { on: true, color: '#42e8ff', width: 2 }, glow: { on: true, color: '#42e8ff', blur: 14, strength: 1.2 } },
          }),
          makeSpec({
            x: 302, y: 74, w: 522, h: 202, size: 16, labelColor: '#42e8ff', valueColor: '#e8f6ff',
            styles: { glow: { on: true, color: '#1fb6ff', blur: 6, strength: 1 } },
          }),
          makeText({
            name: '닉네임', slot: 'nickname', x: 302, y: 26, size: 28, color: '#42e8ff',
            styles: { glow: { on: true, color: '#42e8ff', blur: 12, strength: 1.6 } },
          }),
          makeEffect('borderRun', c, { color: '#42e8ff', color2: '#ffffff', density: 0.34 }),
        ],
      };
    },
  },
  {
    id: 'galaxy-panel', name: '은하 패널', hint: '어두운 배경 사진 + 반투명 패널', motion: false,
    build: () => {
      const c = card({ radius: 16 });
      return {
        card: c,
        assets: bgAsset('011', '은하수 성운 파노라마'),
        layers: [
          makeImage({ ...base, asset: 'bg_011' }),
          makeShape({ name: '사양 패널', x: 20, y: 20, w: 484, h: 260, radius: 14, fill: { color: '#070a16', opacity: 0.62 } }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 574, y: 40, w: 220, h: 220, mask: 'ellipse',
            styles: { outline: { on: true, color: '#ffffff', width: 3 }, shadow: { on: true, opacity: 0.6, blur: 16, y: 4 } },
          }),
          makeSpec({ x: 40, y: 74, w: 444, h: 192, size: 16, labelColor: '#9fd0ff', valueColor: '#ffffff' }),
          makeText({ name: '닉네임', slot: 'nickname', x: 40, y: 30, size: 26, color: '#ffffff' }),
        ],
      };
    },
  },
  {
    id: 'glass-spring', name: '봄 글래스', hint: '밝은 배경 사진 + 유리 패널', motion: true,
    build: () => {
      const c = card({ radius: 20 });
      return {
        card: c,
        assets: bgAsset('091', '봄 새벽 벚꽃 안개'),
        layers: [
          makeImage({ ...base, asset: 'bg_091' }),
          makeShape({
            name: '유리 패널', x: 232, y: 22, w: 596, h: 256, radius: 20, fill: { color: '#ffffff', opacity: 0.72 },
            styles: { outline: { on: true, color: '#ffffff', width: 1.5 }, shadow: { on: true, color: '#7a4a6b', opacity: 0.22, blur: 18, y: 4 } },
          }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 30, y: 56, w: 180, h: 180, mask: 'ellipse',
            styles: { outline: { on: true, color: '#ffffff', width: 4 }, shadow: { on: true, color: '#7a4a6b', opacity: 0.35, blur: 14, y: 3 } },
          }),
          makeSpec({ x: 254, y: 78, w: 552, h: 186, size: 16, labelColor: '#b0508a', valueColor: '#3b2b4d' }),
          makeText({ name: '닉네임', slot: 'nickname', x: 254, y: 34, size: 26, color: '#4a3560' }),
          makeEffect('fall', c, { color: '#ffd1e6', color2: '#ffffff', density: 0.3, size: 0.9 }),
        ],
      };
    },
  },
  {
    id: 'terminal', name: '터미널', hint: '검은 화면 + 초록 글자 + 스캔라인', motion: true,
    build: () => {
      const c = card({ radius: 8, border: { on: true, color: '#39ff88', width: 2 } });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'solid', color: '#050a06' } }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 622, y: 40, w: 200, h: 220, radius: 6, saturation: 0,
            styles: { outline: { on: true, color: '#39ff88', width: 1.5 } },
          }),
          makeSpec({
            x: 28, y: 66, w: 570, h: 214, size: 16, font: 'Consolas', labelColor: '#39ff88', valueColor: '#c8ffd9',
            icons: { on: false },
          }),
          makeText({ name: '닉네임', slot: 'nickname', x: 28, y: 22, size: 24, font: 'Consolas', color: '#39ff88' }),
          makeEffect('scanline', c, { color: '#39ff88', color2: '#39ff88', density: 0.4 }),
        ],
      };
    },
  },
  {
    id: 'minimal-2col', name: '미니멀 2열', hint: '사진 없이 사양을 두 열로', motion: false,
    build: () => {
      const c = card({ radius: 10 });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'solid', color: '#f3f1ec' } }),
          makeShape({ name: '머리띠', x: 0, y: 0, w: W, h: 64, radius: 0, fill: { color: '#22252b' } }),
          makeSpec({
            x: 30, y: 84, w: 790, h: 196, size: 16, columns: 2, colGap: 30, labelColor: '#c0562b', valueColor: '#22252b',
          }),
          makeText({ name: '닉네임', slot: 'nickname', x: 30, y: 16, size: 26, color: '#ffffff' }),
        ],
      };
    },
  },
  {
    id: 'gaming-sweep', name: '게이밍 스윕', hint: '기울인 색 띠 + 광택 + 테두리 맥동', motion: true,
    build: () => {
      const c = card({ radius: 16 });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'linear', color: '#12061f', color2: '#061a2b', angle: 0 } }),
          makeShape({
            name: '색 띠', x: 396, y: -10, w: 240, h: 320, shape: 'slant', slant: 118,
            fill: { type: 'linear', color: '#ff3d81', color2: '#7a5cff', angle: 90, opacity: 0.9 },
          }),
          makeImage({ name: '내 사진', slot: 'photo', x: 486, y: 0, w: 410, h: H, mask: 'slant', slant: 110 }),
          makeSpec({ x: 30, y: 70, w: 410, h: 214, size: 16, labelColor: '#ff7ab8', valueColor: '#ffffff' }),
          makeText({
            name: '닉네임', slot: 'nickname', x: 30, y: 22, size: 28, color: '#ffffff',
            gradient: { on: true, color2: '#ff9ad1', angle: 0 },
          }),
          makeEffect('shine', c, { color: '#ffffff', density: 0.35, opacity: 0.55 }),
          makeEffect('borderPulse', c, { color: '#ff3d81', color2: '#ffffff', density: 0.5 }),
        ],
      };
    },
  },
  {
    id: 'firefly-night', name: '반딧불 밤', hint: '밤 배경 사진 + 반딧불 + 둥근 사진', motion: true,
    build: () => {
      const c = card({ radius: 18 });
      return {
        card: c,
        assets: bgAsset('093', '늦여름 밤의 반딧불'),
        layers: [
          makeImage({ ...base, asset: 'bg_093' }),
          makeShape({ name: '사양 패널', x: 300, y: 22, w: 528, h: 256, radius: 16, fill: { color: '#06140f', opacity: 0.58 } }),
          makeEffect('fireflies', c, { color: '#fff59a', color2: '#b8ff8a', density: 0.45 }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 44, y: 44, w: 212, h: 212, mask: 'ellipse',
            styles: { outline: { on: true, color: '#fff59a', width: 3 }, glow: { on: true, color: '#fff59a', blur: 16, strength: 1.2 } },
          }),
          makeSpec({ x: 322, y: 78, w: 486, h: 186, size: 16, labelColor: '#d9ff9a', valueColor: '#ffffff' }),
          makeText({ name: '닉네임', slot: 'nickname', x: 322, y: 32, size: 27, color: '#fff59a' }),
        ],
      };
    },
  },
  {
    id: 'rainy-room', name: '비 오는 게임방', hint: '어두운 방 사진 + 비 + 모서리 브래킷', motion: true,
    build: () => {
      const c = card({ radius: 12 });
      return {
        card: c,
        assets: bgAsset('150', '비 오는 밤의 게임방'),
        layers: [
          makeImage({ ...base, asset: 'bg_150', brightness: 80 }),
          makeEffect('rain', c, { color: '#bfe3ff', color2: '#ffffff', density: 0.4 }),
          makeShape({ name: '사양 패널', x: 24, y: 24, w: 500, h: 252, radius: 10, fill: { color: '#05080f', opacity: 0.66 } }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 572, y: 36, w: 236, h: 228, radius: 12,
            styles: { outline: { on: true, color: '#8fd3ff', width: 2 }, shadow: { on: true, opacity: 0.7, blur: 18, y: 4 } },
          }),
          makeSpec({ x: 44, y: 78, w: 462, h: 186, size: 16, labelColor: '#8fd3ff', valueColor: '#f1f7ff' }),
          makeText({ name: '닉네임', slot: 'nickname', x: 44, y: 34, size: 26, color: '#ffffff' }),
          makeEffect('borderCorners', c, { color: '#8fd3ff', color2: '#ffffff', density: 0.4 }),
        ],
      };
    },
  },
  {
    id: 'pixel-spring', name: '도트 봄날', hint: '도트 배경 + 픽셀 아이콘 + 꽃잎', motion: true,
    build: () => {
      const c = card({ radius: 6, border: { on: true, color: '#ffffff', width: 5 }, deco: { on: true, style: 'dashed', color: '#ff8fb8', width: 2, inset: 9 } });
      return {
        card: c,
        assets: bgAsset('157', '벚꽃나무와 낮은 언덕의 봄 들판'),
        layers: [
          makeImage({ ...base, asset: 'bg_157' }),
          makeShape({ name: '사양 패널', x: 28, y: 28, w: 478, h: 244, radius: 4, fill: { color: '#ffffff', opacity: 0.84 } }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 566, y: 44, w: 236, h: 212, radius: 4,
            styles: { outline: { on: true, color: '#ffffff', width: 5 } },
          }),
          makeSpec({
            x: 46, y: 80, w: 444, h: 180, size: 15, font: 'Consolas', labelColor: '#d6336c', valueColor: '#3b2a4a',
            icons: { set: 'pixel' },
          }),
          makeText({ name: '닉네임', slot: 'nickname', x: 46, y: 38, size: 25, color: '#d6336c' }),
          makeEffect('fall', c, { color: '#ffc2d8', color2: '#ffffff', density: 0.35 }),
        ],
      };
    },
  },
  {
    id: 'heart-pop', name: '하트 팝', hint: '하트 무늬 + 하트 모양 사진 + 하트 둥둥', motion: true,
    build: () => {
      const c = card({ radius: 22, border: { on: true, color: '#ffffff', width: 4 }, deco: { on: true, style: 'dotted', color: '#ffffff', width: 2.5, inset: 11 } });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'hearts', color: '#ffb3d1', color2: '#ff7fb2', size: 34, angle: 12 } }),
          makeShape({
            name: '사양 패널', x: 30, y: 30, w: 470, h: 240, radius: 22, fill: { color: '#ffffff', opacity: 0.9 },
            styles: { shadow: { on: true, color: '#b3245f', opacity: 0.25, blur: 14, y: 3 } },
          }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 556, y: 36, w: 250, h: 232, mask: 'heart',
            styles: { outline: { on: true, color: '#ffffff', width: 5 }, shadow: { on: true, color: '#b3245f', opacity: 0.35, blur: 12, y: 3 } },
          }),
          makeSpec({ x: 52, y: 82, w: 430, h: 176, size: 15, labelColor: '#e64980', valueColor: '#4a2338' }),
          makeText({ name: '닉네임', slot: 'nickname', x: 92, y: 38, size: 26, color: '#e64980' }),
          makeText({ name: '이모티콘 💖', text: '💖', x: 50, y: 36, size: 28, bold: false }),
          makeEffect('hearts', c, { color: '#ffffff', color2: '#ffd6e6', density: 0.25, size: 0.8 }),
        ],
      };
    },
  },
  {
    id: 'matrix', name: '매트릭스', hint: '검은 화면 + 떨어지는 문자 + 초록 글자', motion: true,
    build: () => {
      const c = card({ radius: 6, border: { on: true, style: 'glow', color: '#39ff88', color2: '#39ff88', width: 2 } });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'solid', color: '#020603' } }),
          makeEffect('matrix', c, { color: '#1f9d55', color2: '#c8ffd9', density: 0.55, opacity: 0.55 }),
          makeShape({ name: '사양 패널', x: 26, y: 24, w: 540, h: 252, radius: 4, fill: { color: '#020603', opacity: 0.8 } }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 610, y: 40, w: 204, h: 220, radius: 4, saturation: 30,
            styles: { outline: { on: true, color: '#39ff88', width: 1.5 } },
          }),
          makeSpec({
            x: 44, y: 76, w: 506, h: 188, size: 15, font: 'Consolas', labelColor: '#39ff88', valueColor: '#d6ffe4',
            icons: { on: false },
          }),
          makeText({
            name: '닉네임', slot: 'nickname', x: 44, y: 32, size: 25, font: 'Consolas', color: '#39ff88',
            styles: { glow: { on: true, color: '#39ff88', blur: 10, strength: 1.4 } },
          }),
        ],
      };
    },
  },
  {
    id: 'equalizer', name: '이퀄라이저', hint: '어두운 그라디언트 + 막대 + 무지개 테두리', motion: true,
    build: () => {
      const c = card({ radius: 16 });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'linear', color: '#0d0b1f', color2: '#1a1033', angle: 90 } }),
          makeShape({ name: '격자', x: 0, y: 0, w: W, h: H, radius: 0, fill: { type: 'grid', color: '#ffffff', size: 30, opacity: 0.05, base: false } }),
          makeEffect('bars', c, { color: '#42e8ff', color2: '#b06cff', density: 0.55, size: 1.1, opacity: 0.75 }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 28, y: 28, w: 244, h: 244, radius: 18,
            styles: { outline: { on: true, color: '#ffffff', width: 2.5 }, shadow: { on: true, opacity: 0.6, blur: 16, y: 4 } },
          }),
          makeSpec({ x: 300, y: 76, w: 524, h: 190, size: 16, labelColor: '#b99cff', valueColor: '#ffffff' }),
          makeText({
            name: '닉네임', slot: 'nickname', x: 300, y: 28, size: 28, color: '#42e8ff',
            gradient: { on: true, color2: '#d08cff', angle: 0 },
          }),
          makeEffect('borderRainbow', c, { density: 0.8, size: 0.7 }),
        ],
      };
    },
  },
  {
    id: 'retro-check', name: '레트로 체크', hint: '체크 무늬 + 굵은 이중 테두리 + 별', motion: false,
    build: () => {
      const c = card({ radius: 10, border: { on: true, style: 'double', color: '#2b2118', width: 6 } });
      return {
        card: c,
        assets: {},
        layers: [
          makeShape({ ...base, fill: { type: 'checker', color: '#f4a261', color2: '#fdf0d5', size: 44, angle: 0 } }),
          makeShape({
            name: '사양 패널', x: 36, y: 34, w: 468, h: 232, radius: 8, fill: { color: '#fffaf0' },
            styles: { outline: { on: true, color: '#2b2118', width: 3 }, shadow: { on: true, color: '#2b2118', opacity: 1, blur: 0, x: 6, y: 6 } },
          }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 566, y: 46, w: 224, h: 208, radius: 8,
            styles: { outline: { on: true, color: '#2b2118', width: 3 }, shadow: { on: true, color: '#2b2118', opacity: 1, blur: 0, x: 6, y: 6 } },
          }),
          makeSpec({ x: 56, y: 86, w: 430, h: 168, size: 15, labelColor: '#e76f51', valueColor: '#2b2118', icons: { set: 'mono' } }),
          makeText({ name: '닉네임', slot: 'nickname', x: 56, y: 44, size: 26, color: '#2b2118' }),
          makeShape({
            name: '별', shape: 'star', x: 752, y: 22, w: 62, h: 62, rot: 14, fill: { color: '#e9c46a' },
            styles: { outline: { on: true, color: '#2b2118', width: 3 } },
          }),
        ],
      };
    },
  },
  {
    id: 'snow-village', name: '눈 오는 마을', hint: '눈 마을 배경 + 유리 패널 + 눈 내림', motion: true,
    build: () => {
      const c = card({ radius: 20 });
      return {
        card: c,
        assets: bgAsset('164', '눈 덮인 마을과 따뜻한 창문 불빛'),
        layers: [
          makeImage({ ...base, asset: 'bg_164' }),
          makeShape({
            name: '유리 패널', x: 24, y: 24, w: 500, h: 252, radius: 18, fill: { color: '#ffffff', opacity: 0.78 },
            styles: { outline: { on: true, color: '#ffffff', width: 1.5 }, shadow: { on: true, color: '#2b3a67', opacity: 0.22, blur: 16, y: 4 } },
          }),
          makeImage({
            name: '내 사진', slot: 'photo', x: 572, y: 42, w: 216, h: 216, mask: 'ellipse',
            styles: { outline: { on: true, color: '#ffffff', width: 5 }, shadow: { on: true, color: '#2b3a67', opacity: 0.35, blur: 14, y: 3 } },
          }),
          makeSpec({ x: 46, y: 80, w: 460, h: 184, size: 16, labelColor: '#3b6fb6', valueColor: '#1f2a44' }),
          makeText({ name: '닉네임', slot: 'nickname', x: 46, y: 36, size: 26, color: '#1f2a44' }),
          makeEffect('snow', c, { color: '#ffffff', color2: '#e6f1ff', density: 0.45 }),
        ],
      };
    },
  },
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

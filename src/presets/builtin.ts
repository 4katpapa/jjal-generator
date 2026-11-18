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

function card(patch: { radius?: number; border?: Partial<Card['border']> } = {}): Card {
  const base = defaultCard();
  return { ...base, radius: patch.radius ?? base.radius, border: { ...base.border, ...patch.border } };
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
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

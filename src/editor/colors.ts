import { create } from 'zustand';

const KEY = 'jjal-recent-colors';
const LIMIT = 12;

function load(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((c) => /^#[0-9a-f]{6}$/.test(c)).slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

/** 최근에 고른 색. 색 고르기 창의 추천 색으로 나온다. */
export const useRecentColors = create<{ colors: string[] }>(() => ({ colors: load() }));

export function rememberColor(color: string): void {
  const c = color.toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(c)) return;
  const colors = [c, ...useRecentColors.getState().colors.filter((x) => x !== c)].slice(0, LIMIT);
  useRecentColors.setState({ colors });
  try {
    localStorage.setItem(KEY, JSON.stringify(colors));
  } catch {
    // 저장소를 못 쓰는 환경에서는 이번 실행 동안만 기억한다.
  }
}

interface EyeDropperLike { open: () => Promise<{ sRGBHex: string }> }

export const canPickFromScreen = typeof window !== 'undefined' && 'EyeDropper' in window;

/** 화면 아무 곳의 색을 찍어 온다. 취소하면 null. */
export async function pickFromScreen(): Promise<string | null> {
  if (!canPickFromScreen) return null;
  try {
    const Ctor = (window as unknown as { EyeDropper: new () => EyeDropperLike }).EyeDropper;
    const { sRGBHex } = await new Ctor().open();
    const m = sRGBHex.match(/^#[0-9a-f]{6}/i);
    return m ? m[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

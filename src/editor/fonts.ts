import { create } from 'zustand';
import { desktop } from '../io/desktop';

export const BUILTIN_FONTS: { family: string; label: string }[] = [
  { family: 'Nanum Gothic', label: '나눔고딕 (내장)' },
  { family: 'Malgun Gothic', label: '맑은 고딕' },
  { family: 'Gulim', label: '굴림' },
  { family: 'Dotum', label: '돋움' },
  { family: 'Batang', label: '바탕' },
  { family: 'Gungsuh', label: '궁서' },
  { family: 'Segoe UI', label: 'Segoe UI' },
  { family: 'Arial', label: 'Arial' },
  { family: 'Impact', label: 'Impact' },
  { family: 'Consolas', label: 'Consolas' },
  { family: 'Courier New', label: 'Courier New' },
  { family: 'Georgia', label: 'Georgia' },
];

interface FontState {
  system: string[];
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  message: string;
}

export const useFonts = create<FontState>(() => ({ system: [], status: 'idle', message: '' }));

/** PC에 설치된 글꼴 이름을 불러온다. 데스크톱 앱은 직접, 브라우저는 권한을 물어서 가져온다. */
export async function loadSystemFonts(): Promise<void> {
  useFonts.setState({ status: 'loading', message: '' });
  try {
    let families: string[] = [];
    if (desktop) {
      families = await desktop.listFonts();
    } else if ('queryLocalFonts' in window) {
      const fonts = await (window as unknown as { queryLocalFonts: () => Promise<{ family: string }[]> }).queryLocalFonts();
      families = fonts.map((f) => f.family);
    } else {
      useFonts.setState({ status: 'unavailable', message: '이 브라우저는 설치된 글꼴 목록을 제공하지 않습니다. Windows 앱에서는 모두 고를 수 있습니다.' });
      return;
    }
    const unique = [...new Set(families)].filter((f) => f && !f.startsWith('@')).sort((a, b) => a.localeCompare(b, 'ko'));
    if (unique.length === 0) {
      useFonts.setState({ status: 'unavailable', message: '글꼴 목록을 받지 못했습니다(권한이 거부되었을 수 있습니다).' });
      return;
    }
    useFonts.setState({ system: unique, status: 'ready', message: `${unique.length}개 글꼴을 불러왔습니다.` });
  } catch (err) {
    useFonts.setState({ status: 'unavailable', message: `글꼴 목록을 불러오지 못했습니다: ${(err as Error).message}` });
  }
}

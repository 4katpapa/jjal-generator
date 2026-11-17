// Windows 앱(Electron)에서만 있는 기능의 창구. 브라우저에서는 null이다.

export interface DetectedSpec { label: string; value: string }

export interface DesktopApi {
  readSpecs: () => Promise<{ rows: DetectedSpec[]; error?: string }>;
  listFonts: () => Promise<string[]>;
}

export const desktop: DesktopApi | null =
  typeof window !== 'undefined' ? ((window as unknown as { jjal?: DesktopApi }).jjal ?? null) : null;

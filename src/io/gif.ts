// 움직이는 GIF 인코더. WebP를 받지 않는 게시판용이다.
// 전체 프레임에서 256색 팔레트 하나를 뽑고(중앙값 분할), 프레임마다 LZW로 압축한다.

export interface GifFrame {
  /** RGBA 픽셀 (width × height × 4). */
  data: Uint8ClampedArray;
  /** 표시 시간(ms). GIF는 10ms 단위로만 저장한다. */
  duration: number;
}

interface Box { colors: number[]; }

const key15 = (r: number, g: number, b: number) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

/** 15비트로 줄인 색 분포에서 최대 max개의 대표색을 고른다. */
function buildPalette(frames: GifFrame[], max: number): number[][] {
  const hist = new Map<number, number>();
  for (const f of frames) {
    const d = f.data;
    // 큰 그림은 건너뛰며 표본을 뽑는다.
    const step = Math.max(1, Math.floor(d.length / 4 / 60000)) * 4;
    for (let i = 0; i < d.length; i += step) {
      if (d[i + 3] < 128) continue;
      const k = key15(d[i], d[i + 1], d[i + 2]);
      hist.set(k, (hist.get(k) ?? 0) + 1);
    }
  }
  const comp = (k: number, c: number) => (c === 0 ? (k >> 10) & 31 : c === 1 ? (k >> 5) & 31 : k & 31);
  let boxes: Box[] = [{ colors: [...hist.keys()] }];
  while (boxes.length < max) {
    let best = -1;
    let bestRange = 0;
    let bestCh = 0;
    boxes.forEach((box, i) => {
      if (box.colors.length < 2) return;
      for (let c = 0; c < 3; c += 1) {
        let lo = 31;
        let hi = 0;
        for (const k of box.colors) { const v = comp(k, c); if (v < lo) lo = v; if (v > hi) hi = v; }
        const range = (hi - lo) * Math.sqrt(box.colors.length);
        if (range > bestRange) { bestRange = range; best = i; bestCh = c; }
      }
    });
    if (best < 0) break;
    const box = boxes[best];
    box.colors.sort((a, b) => comp(a, bestCh) - comp(b, bestCh));
    // 픽셀 수 기준 중앙에서 나눈다.
    const total = box.colors.reduce((n, k) => n + hist.get(k)!, 0);
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < box.colors.length - 1; i += 1) {
      acc += hist.get(box.colors[i])!;
      if (acc >= total / 2) { cut = i + 1; break; }
    }
    boxes = [...boxes.slice(0, best), { colors: box.colors.slice(0, cut) }, { colors: box.colors.slice(cut) }, ...boxes.slice(best + 1)];
  }
  return boxes.filter((b) => b.colors.length > 0).map((box) => {
    let r = 0; let g = 0; let b = 0; let n = 0;
    for (const k of box.colors) {
      const w = hist.get(k)!;
      r += (((k >> 10) & 31) * 8 + 4) * w;
      g += (((k >> 5) & 31) * 8 + 4) * w;
      b += ((k & 31) * 8 + 4) * w;
      n += w;
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
}

function lzw(indices: Uint8Array, minCode: number, out: number[]): void {
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let codeSize = minCode + 1;
  let next = eoi + 1;
  let dict = new Map<number, number>();
  let cur = 0;
  let bits = 0;
  const block: number[] = [];
  const flush = () => { if (block.length) { out.push(block.length, ...block); block.length = 0; } };
  const emit = (code: number) => {
    cur |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      block.push(cur & 255);
      if (block.length === 255) flush();
      cur >>>= 8;
      bits -= 8;
    }
  };
  out.push(minCode);
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i += 1) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next);
      next += 1;
      if (next - 1 === 1 << codeSize && codeSize < 12) codeSize += 1;
    } else {
      emit(clear);
      dict = new Map();
      codeSize = minCode + 1;
      next = eoi + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) block.push(cur & 255);
  flush();
  out.push(0);
}

/** 프레임들을 움직이는 GIF로 묶는다. 투명한 픽셀(알파 50% 미만)은 투명색으로 저장한다. */
export function encodeGif(frames: GifFrame[], width: number, height: number): Uint8Array {
  const hasAlpha = frames.some((f) => {
    for (let i = 3; i < f.data.length; i += 4) if (f.data[i] < 128) return true;
    return false;
  });
  const palette = buildPalette(frames, hasAlpha ? 255 : 256);
  const transparent = hasAlpha ? palette.length : -1;
  if (hasAlpha) palette.push([0, 0, 0]);
  while (palette.length < 2) palette.push([0, 0, 0]);
  const depth = Math.max(1, Math.ceil(Math.log2(palette.length)));
  const tableSize = 1 << depth;

  const cache = new Int16Array(32768).fill(-1);
  const count = hasAlpha ? palette.length - 1 : palette.length;
  const nearest = (r: number, g: number, b: number): number => {
    const k = key15(r, g, b);
    if (cache[k] >= 0) return cache[k];
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < count; i += 1) {
      const p = palette[i];
      const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    cache[k] = best;
    return best;
  };

  const out: number[] = [];
  const word = (v: number) => out.push(v & 255, (v >> 8) & 255);
  out.push(...[...'GIF89a'].map((c) => c.charCodeAt(0)));
  word(width);
  word(height);
  out.push(0x80 | ((depth - 1) << 4) | (depth - 1), 0, 0);
  for (let i = 0; i < tableSize; i += 1) out.push(...(palette[i] ?? [0, 0, 0]));
  out.push(0x21, 0xff, 11, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);

  let owed = 0;
  for (const frame of frames) {
    // 10ms 단위 반올림 오차를 다음 프레임으로 넘겨 전체 길이를 맞춘다.
    const want = frame.duration + owed;
    const cs = Math.max(2, Math.round(want / 10));
    owed = want - cs * 10;
    out.push(0x21, 0xf9, 4, hasAlpha ? 0b00001001 : 0b00000100);
    word(cs);
    out.push(hasAlpha ? transparent : 0, 0);
    out.push(0x2c);
    word(0); word(0); word(width); word(height);
    out.push(0);
    const d = frame.data;
    const indices = new Uint8Array(width * height);
    for (let i = 0, p = 0; p < indices.length; i += 4, p += 1) {
      indices[p] = hasAlpha && d[i + 3] < 128 ? transparent : nearest(d[i], d[i + 1], d[i + 2]);
    }
    lzw(indices, Math.max(2, depth), out);
  }
  out.push(0x3b);
  return Uint8Array.from(out);
}

// 정지 WebP 여러 장을 움직이는 WebP 한 파일로 묶는다.
// 각 프레임은 브라우저가 인코딩한 WebP이고, 여기서는 RIFF 컨테이너만 다시 짠다.

export interface WebpFrame {
  /** 한 장짜리 WebP 파일 바이트. */
  data: Uint8Array;
  /** 표시 시간(ms). */
  duration: number;
}

interface Chunk { id: string; payload: Uint8Array }

const enc = new TextEncoder();

function fourcc(bytes: Uint8Array, at: number): string {
  return String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
}

function u32(bytes: Uint8Array, at: number): number {
  return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
}

/** WebP 파일에서 최상위 청크를 꺼낸다. */
export function parseWebp(bytes: Uint8Array): Chunk[] {
  if (bytes.length < 12 || fourcc(bytes, 0) !== 'RIFF' || fourcc(bytes, 8) !== 'WEBP') {
    throw new Error('WebP 파일이 아닙니다.');
  }
  const chunks: Chunk[] = [];
  let at = 12;
  while (at + 8 <= bytes.length) {
    const id = fourcc(bytes, at);
    const size = u32(bytes, at + 4);
    chunks.push({ id, payload: bytes.subarray(at + 8, at + 8 + size) });
    at += 8 + size + (size & 1);
  }
  return chunks;
}

function u24(value: number): number[] {
  return [value & 255, (value >> 8) & 255, (value >> 16) & 255];
}

function chunk(id: string, payload: Uint8Array): Uint8Array {
  const pad = payload.length & 1;
  const out = new Uint8Array(8 + payload.length + pad);
  out.set(enc.encode(id), 0);
  new DataView(out.buffer).setUint32(4, payload.length, true);
  out.set(payload, 8);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/**
 * 프레임들을 움직이는 WebP로 묶는다. 모든 프레임은 캔버스와 같은 크기여야 한다.
 * 프레임마다 이전 그림을 지우고 새로 그리게 해서 투명한 부분이 겹쳐 쌓이지 않게 한다.
 */
export function muxAnimatedWebp(frames: WebpFrame[], width: number, height: number, loop = 0): Uint8Array {
  if (frames.length === 0) throw new Error('프레임이 없습니다.');
  let hasAlpha = false;
  const body: Uint8Array[] = [];
  for (const frame of frames) {
    const chunks = parseWebp(frame.data);
    const image = chunks.filter((c) => c.id === 'ALPH' || c.id === 'VP8 ' || c.id === 'VP8L');
    if (!image.some((c) => c.id === 'VP8 ' || c.id === 'VP8L')) throw new Error('프레임에 이미지 데이터가 없습니다.');
    const vp8x = chunks.find((c) => c.id === 'VP8X');
    // 손실 프레임은 ALPH 청크, 무손실 프레임은 VP8L 머리의 알파 비트로 투명도를 알린다.
    const lossless = image.find((c) => c.id === 'VP8L');
    if (image.some((c) => c.id === 'ALPH') || (vp8x && (vp8x.payload[0] & 0x10)) || (lossless && (lossless.payload[4] & 0x10))) {
      hasAlpha = true;
    }
    const head = new Uint8Array([
      ...u24(0), ...u24(0), ...u24(width - 1), ...u24(height - 1), ...u24(Math.max(1, Math.round(frame.duration))),
      0b00000011, // 섞지 않고 덮어쓰기 + 다음 프레임 전에 지우기
    ]);
    body.push(chunk('ANMF', concat([head, ...image.map((c) => chunk(c.id, c.payload))])));
  }
  const vp8xPayload = new Uint8Array([0x02 | (hasAlpha ? 0x10 : 0), 0, 0, 0, ...u24(width - 1), ...u24(height - 1)]);
  const animPayload = new Uint8Array([0, 0, 0, 0, loop & 255, (loop >> 8) & 255]);
  const content = concat([enc.encode('WEBP'), chunk('VP8X', vp8xPayload), chunk('ANIM', animPayload), ...body]);
  const out = new Uint8Array(8 + content.length);
  out.set(enc.encode('RIFF'), 0);
  new DataView(out.buffer).setUint32(4, content.length, true);
  out.set(content, 8);
  return out;
}

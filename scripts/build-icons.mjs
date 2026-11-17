// Slices the 4x4 spec-icon sheets into public/icons/<set>/<kind>.png (160x160, transparent).
// Usage: node scripts/build-icons.mjs [sheetDir]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DEFAULT_SOURCE = 'C:\\Users\\HOME\\Desktop\\잡동사니\\자짤\\자짤 생성툴\\renderer\\assets\\spec-icons';
const sheetDir = path.resolve(process.argv[2] || DEFAULT_SOURCE);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = path.join(projectRoot, 'public', 'icons');

const SETS = ['color', 'mono', 'pixel'];
// Sheet cell order, row by row (4 columns x 4 rows).
const KINDS = [
  'cpu', 'mb', 'ram', 'gpu',
  'ssd', 'hdd', 'psu', 'case',
  'cooler', 'monitor', 'speaker', 'mouse',
  'keyboard', 'headset', 'mic', 'etc',
];
const GRID = 4;
const SIZE = 160;
const PADDING = 6;
const ALPHA_FLOOR = 24; // alpha at or below this is halo noise around the artwork
const ALPHA_SOLID = 250; // the artwork body is stored at alpha 250-254; treat it as opaque

// Finds the cut position inside the empty gutter closest to each quarter line.
function gutterCuts(occupied, length, label) {
  const cuts = [0];
  for (let i = 1; i < GRID; i++) {
    const center = Math.round((length * i) / GRID);
    let best = null;
    let start = -1;
    for (let at = 0; at <= length; at++) {
      const empty = at < length && occupied[at] === 0;
      if (empty && start < 0) start = at;
      if (!empty && start >= 0) {
        const middle = Math.floor((start + at - 1) / 2);
        if (best === null || Math.abs(middle - center) < Math.abs(best - center)) best = middle;
        start = -1;
      }
    }
    if (best === null || Math.abs(best - center) > length / (GRID * 4)) {
      throw new Error(`${label}: no empty gutter near ${center}`);
    }
    cuts.push(best);
  }
  cuts.push(length);
  return cuts;
}

async function sliceSheet(set) {
  const file = path.join(sheetDir, `${set}.png`);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Clean the alpha channel: drop the faint halo, make the near-opaque body fully opaque.
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] <= ALPHA_FLOOR) data[i - 3] = data[i - 2] = data[i - 1] = data[i] = 0;
    else if (data[i] >= ALPHA_SOLID) data[i] = 255;
  }

  const occupiedX = new Uint32Array(width);
  const occupiedY = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) { occupiedX[x]++; occupiedY[y]++; }
    }
  }
  const xs = gutterCuts(occupiedX, width, `${set} columns`);
  const ys = gutterCuts(occupiedY, height, `${set} rows`);

  const outDir = path.join(outRoot, set);
  await mkdir(outDir, { recursive: true });
  const report = [];

  for (let index = 0; index < KINDS.length; index++) {
    const col = index % GRID;
    const row = Math.floor(index / GRID);
    // Tight bounding box of the remaining (non-transparent) pixels inside the cell.
    let left = Infinity, right = -1, top = Infinity, bottom = -1;
    for (let y = ys[row]; y < ys[row + 1]; y++) {
      for (let x = xs[col]; x < xs[col + 1]; x++) {
        if (data[(y * width + x) * 4 + 3] === 0) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    if (right < left) throw new Error(`${set}/${KINDS[index]}: empty cell`);
    const box = { left, top, width: right - left + 1, height: bottom - top + 1 };
    const inner = SIZE - PADDING * 2;
    const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
    await sharp(data, { raw: { width, height, channels: 4 } })
      .extract(box)
      .resize({ width: inner, height: inner, fit: 'contain', background: transparent })
      .extend({ top: PADDING, bottom: PADDING, left: PADDING, right: PADDING, background: transparent })
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, `${KINDS[index]}.png`));
    report.push(`${KINDS[index]}=${box.left},${box.top},${box.width}x${box.height}`);
  }
  console.log(`${set}: cuts x[${xs.join(',')}] y[${ys.join(',')}]`);
  console.log(`  ${report.join(' ')}`);
}

for (const set of SETS) await sliceSheet(set);
console.log(`icons: ${SETS.length * KINDS.length} files written to ${outRoot}`);

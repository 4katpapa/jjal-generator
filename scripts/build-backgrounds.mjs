// Builds public/backgrounds/{full,thumb}/<NNN>.webp and backgrounds.json from the source PNG library.
// Usage: node scripts/build-backgrounds.mjs [sourceDir]
import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DEFAULT_SOURCE = 'C:\\Users\\HOME\\Desktop\\잡동사니\\자짤\\자짤 생성툴\\assets\\backgrounds';
const sourceDir = path.resolve(process.argv[2] || DEFAULT_SOURCE);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(projectRoot, 'public', 'backgrounds');
const fullDir = path.join(outDir, 'full');
const thumbDir = path.join(outDir, 'thumb');

const THUMB_WIDTH = 340;
const LIGHT_MIN = 0.6;
const DARK_MAX = 0.38;

const stripPrefix = (text) => text.replace(/^\d+_/, '').replace(/_/g, ' ').trim();
const hex = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');

async function mtimeOrNull(file) {
  try {
    return (await stat(file)).mtimeMs;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function collectSources() {
  const items = [];
  const folders = (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const folder of folders) {
    const files = await readdir(path.join(sourceDir, folder.name));
    for (const file of files) {
      const match = /^(\d+)_(.+)\.png$/i.exec(file);
      if (!match) continue;
      items.push({
        id: match[1],
        name: match[2].replace(/_/g, ' ').trim(),
        category: stripPrefix(folder.name),
        source: path.join(sourceDir, folder.name, file),
      });
    }
  }
  items.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const seen = new Map();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`Duplicate background id ${item.id}: ${seen.get(item.id)} / ${item.source}`);
    seen.set(item.id, item.source);
  }
  return items;
}

async function buildOne(item, counters) {
  const sourceMtime = (await stat(item.source)).mtimeMs;
  const fullPath = path.join(fullDir, `${item.id}.webp`);
  const thumbPath = path.join(thumbDir, `${item.id}.webp`);

  const fullMtime = await mtimeOrNull(fullPath);
  if (fullMtime === null || fullMtime <= sourceMtime) {
    await sharp(item.source).webp({ quality: 80, effort: 5 }).toFile(fullPath);
    counters.fullBuilt++;
  }
  const thumbMtime = await mtimeOrNull(thumbPath);
  if (thumbMtime === null || thumbMtime <= sourceMtime) {
    await sharp(item.source).resize({ width: THUMB_WIDTH }).webp({ quality: 72 }).toFile(thumbPath);
    counters.thumbBuilt++;
  }

  // Average colour over the opaque RGB content of the source image.
  const { channels } = await sharp(item.source).removeAlpha().toColourspace('srgb').stats();
  const [r, g, b] = channels.length >= 3 ? channels.map((c) => c.mean) : [channels[0].mean, channels[0].mean, channels[0].mean];
  const lum = Number(((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255).toFixed(2));
  const tone = lum >= LIGHT_MIN ? 'light' : lum <= DARK_MAX ? 'dark' : 'mid';

  return { id: item.id, name: item.name, category: item.category, tone, lum, color: `#${hex(r)}${hex(g)}${hex(b)}` };
}

async function runPool(items, worker, size) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

async function dirSizeMb(dir, ids) {
  let bytes = 0;
  for (const id of ids) bytes += (await stat(path.join(dir, `${id}.webp`))).size;
  return (bytes / 1024 / 1024).toFixed(1);
}

const items = await collectSources();
if (items.length === 0) throw new Error(`No background PNGs found under ${sourceDir}`);
await mkdir(fullDir, { recursive: true });
await mkdir(thumbDir, { recursive: true });

const counters = { fullBuilt: 0, thumbBuilt: 0 };
const entries = await runPool(items, (item) => buildOne(item, counters), Math.max(2, Math.min(6, os.availableParallelism())));
await writeFile(path.join(outDir, 'backgrounds.json'), `${JSON.stringify(entries, null, 2)}\n`, 'utf8');

const ids = entries.map((entry) => entry.id);
const tones = entries.reduce((acc, entry) => ({ ...acc, [entry.tone]: (acc[entry.tone] || 0) + 1 }), {});
console.log(
  `backgrounds: ${entries.length} entries | full ${await dirSizeMb(fullDir, ids)} MB (${counters.fullBuilt} built) | `
  + `thumb ${await dirSizeMb(thumbDir, ids)} MB (${counters.thumbBuilt} built) | `
  + `tone light ${tones.light || 0} / mid ${tones.mid || 0} / dark ${tones.dark || 0}`,
);

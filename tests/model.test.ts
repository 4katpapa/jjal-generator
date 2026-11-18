import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { emptyDoc, makeShape, makeText } from '../src/model/factory';
import {
  duplicateLayer, findLayer, flatten, groupLayers, insertLayer, moveLayer, pruneAssets, removeLayer,
  shiftLayer, ungroupLayer,
} from '../src/model/ops';
import { iconForLabel, mergeSpecs, parseSpecText } from '../src/model/specs';
import { makeRow } from '../src/model/factory';
import { muxAnimatedWebp, parseWebp } from '../src/io/webpAnim';

const require = createRequire(import.meta.url);
const { normalizeSpecs, sizeText } = require('../electron/normalize.cjs');

function docWith(n: number) {
  const doc = emptyDoc();
  for (let i = 0; i < n; i += 1) insertLayer(doc, makeShape({ name: `s${i}` }));
  return doc;
}

describe('레이어 조작', () => {
  it('추가·삭제·순서 변경', () => {
    const doc = docWith(3);
    const [a, b, c] = doc.layers.map((l) => l.id);
    expect(shiftLayer(doc, a, 1)).toBe(true);
    expect(doc.layers.map((l) => l.id)).toEqual([b, a, c]);
    expect(shiftLayer(doc, c, 1)).toBe(false);
    moveLayer(doc, c, b, 'below');
    expect(doc.layers.map((l) => l.id)).toEqual([c, b, a]);
    removeLayer(doc, b);
    expect(doc.layers).toHaveLength(2);
  });

  it('선택 레이어 위에 새 레이어를 넣는다', () => {
    const doc = docWith(2);
    const t = makeText();
    insertLayer(doc, t, doc.layers[0].id);
    expect(doc.layers[1].id).toBe(t.id);
  });

  it('그룹으로 묶고 풀어도 쌓임 순서가 유지된다', () => {
    const doc = docWith(4);
    const ids = doc.layers.map((l) => l.id);
    const gid = groupLayers(doc, [ids[2], ids[0]])!;
    const g = findLayer(doc.layers, gid)!.layer;
    expect(g.kind).toBe('group');
    expect(flatten(doc.layers).filter((l) => l.kind !== 'group').map((l) => l.id)).toEqual([ids[1], ids[0], ids[2], ids[3]]);
    expect(moveLayer(doc, gid, ids[0], 'above')).toBe(false);
    ungroupLayer(doc, gid);
    expect(doc.layers.map((l) => l.id)).toEqual([ids[1], ids[0], ids[2], ids[3]]);
  });

  it('복제는 새 id를 갖고 바로 위에 놓인다', () => {
    const doc = docWith(2);
    const copy = duplicateLayer(doc, doc.layers[0].id)!;
    expect(doc.layers[1].id).toBe(copy);
    expect(new Set(doc.layers.map((l) => l.id)).size).toBe(3);
  });

  it('쓰지 않는 자산을 정리하되 내 사진은 남긴다', () => {
    const doc = emptyDoc();
    doc.assets = { a: { id: 'a', name: '', src: 'x', builtin: false }, b: { id: 'b', name: '', src: 'y', builtin: false } };
    doc.content.photo = 'b';
    pruneAssets(doc);
    expect(Object.keys(doc.assets)).toEqual(['b']);
  });
});

describe('사양 입력', () => {
  it('여러 형태의 줄을 읽는다', () => {
    const rows = parseSpecText('CPU: Example CPU 8-Core\nVGA\tGPU 12GB\nRAM DDR5 32GB CL30 30:36:36\nMB   X100 BOARD');
    expect(rows).toEqual([
      { label: 'CPU', value: 'Example CPU 8-Core' }, { label: 'VGA', value: 'GPU 12GB' },
      { label: 'RAM', value: 'DDR5 32GB CL30 30:36:36' }, { label: 'MB', value: 'X100 BOARD' },
    ]);
  });

  it('라벨로 아이콘을 고른다', () => {
    expect(iconForLabel('NVMe')).toBe('ssd');
    expect(iconForLabel('그래픽카드')).toBe('gpu');
    expect(iconForLabel('CS')).toBe('cooler');
    expect(iconForLabel('뭔가')).toBe('etc');
  });

  it('읽어 온 사양은 빈 칸만 채우고 직접 적은 값은 지킨다', () => {
    const existing = [makeRow('CPU', '내가 적은 CPU'), makeRow('VGA', ''), makeRow('SSD', ''), makeRow('PSU', '')];
    const { rows, summary } = mergeSpecs(existing, [
      { label: 'CPU', value: 'Example CPU' }, { label: 'VGA', value: 'GPU 12GB' },
      { label: 'NVMe', value: 'Example SSD 4TB' }, { label: 'NVMe', value: 'Other SSD 2TB' },
    ]);
    expect(rows.map((r) => `${r.label}=${r.value}`)).toEqual(['CPU=내가 적은 CPU', 'VGA=GPU 12GB', 'SSD=Example SSD 4TB', 'NVMe=Other SSD 2TB', 'PSU=']);
    expect(summary).toEqual({ filled: 2, added: 1, kept: 1 });
  });
});

describe('PC 사양 다듬기', () => {
  it('확실한 부품만 행으로 만든다', () => {
    const rows = normalizeSpecs({
      cpu: [{ Name: 'Example Chip 9 8-Core Processor           ' }],
      board: { Manufacturer: 'Gigabyte Technology Co., Ltd.', Product: 'X100 EXAMPLE BOARD' },
      memory: [1, 2].map(() => ({ Capacity: 34359738368, Speed: 6000, ConfiguredClockSpeed: 6000, SMBIOSMemoryType: 34 })),
      gpu: [{ Name: 'Example GPU 12GB', PNPDeviceID: 'PCI\\VEN_10DE' }, { Name: 'Parsec Virtual Display', PNPDeviceID: 'ROOT\\X' }],
      disks: [
        { FriendlyName: 'WD Blue', MediaType: 'HDD', BusType: 'SATA', Size: 4000787030016 },
        { FriendlyName: 'Example SSD', MediaType: 'SSD', BusType: 'NVMe', Size: 2000398934016 },
        { FriendlyName: 'USB Stick', MediaType: 'Unspecified', BusType: 'USB', Size: 64000000000 },
      ],
    });
    expect(rows).toEqual([
      { label: 'CPU', value: 'Example Chip 9' }, { label: 'MB', value: 'Gigabyte X100 EXAMPLE BOARD' },
      { label: 'RAM', value: 'DDR5 32GB*2 6000MHz' }, { label: 'VGA', value: 'Example GPU 12GB' },
      { label: 'NVMe', value: 'Example SSD 2TB' }, { label: 'HDD', value: 'WD Blue 4TB' },
    ]);
    expect(sizeText(500107862016)).toBe('500GB');
  });
});

describe('움직이는 WebP 묶기', () => {
  const frame = (payload: number[]) => {
    const body = [0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, payload.length, 0, 0, 0, ...payload, ...(payload.length % 2 ? [0] : [])];
    return new Uint8Array([0x52, 0x49, 0x46, 0x46, body.length, 0, 0, 0, ...body]);
  };
  it('프레임을 ANMF로 감싸고 길이·크기를 적는다', () => {
    const out = muxAnimatedWebp([{ data: frame([1, 2, 3]), duration: 50 }, { data: frame([4, 5, 6, 7]), duration: 50 }], 850, 300);
    const chunks = parseWebp(out);
    expect(chunks.map((c) => c.id)).toEqual(['VP8X', 'ANIM', 'ANMF', 'ANMF']);
    expect(chunks[0].payload[0] & 0x02).toBe(0x02);
    expect(chunks[0].payload[4] | (chunks[0].payload[5] << 8)).toBe(849);
    expect(chunks[2].payload[12]).toBe(50);
    expect(new DataView(out.buffer).getUint32(4, true)).toBe(out.length - 8);
    expect(out.length % 2).toBe(0);
  });
});

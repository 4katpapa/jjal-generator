// 실제 캔버스에서 도는 자동 검사. 주소에 ?selftest 를 붙이면 실행된다.
// 핵심은 "속성 반영 검사": 속성 패널에 나오는 모든 속성에 대해 값을 바꾸면 그림이 실제로 바뀌는지 확인한다.

import { applyPreset, copySelection, copyStyle, pasteClipboard, pasteStyle, replaceColor, themeColors } from './editor/actions';
import { CARD_SCHEMA, SCHEMA, type PropDef, type Section } from './editor/schema';
import { useEditor } from './editor/store';
import { exportAnimatedWebp, exportGif, exportPng } from './io/exporter';
import { packDoc, unpackDoc } from './io/file';
import {
  EFFECT_LABELS, emptyDoc, makeEffect, makeGroup, makeImage, makeRow, makeShape, makeSpec, makeText,
} from './model/factory';
import { getPath, setPath } from './model/ops';
import type { Doc, EffectType, Layer, LayerKind } from './model/types';
import { PRESETS } from './presets/builtin';
import { ensureDocAssets } from './render/assets';
import { hitTest } from './render/geometry';
import { canvasSize, renderDoc } from './render/renderer';

export interface TestResult { name: string; ok: boolean; detail?: string }
export interface Report { passed: number; failed: number; ms: number; results: TestResult[] }

function testImage(kind: 'a' | 'b'): string {
  const c = document.createElement('canvas');
  c.width = kind === 'a' ? 300 : 200;
  c.height = kind === 'a' ? 180 : 200;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, kind === 'a' ? '#ff4d6d' : '#2ec4b6');
  grad.addColorStop(1, kind === 'a' ? '#4361ee' : '#ffbf69');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 9; i += 1) g.fillRect(12 + i * 31, 14 + (i % 3) * 52, 16, 30);
  g.fillStyle = '#111111';
  g.fillRect(c.width * 0.55, c.height * 0.2, c.width * 0.3, c.height * 0.25);
  return c.toDataURL('image/png');
}

function fixtureDoc(): Doc {
  const doc = emptyDoc();
  doc.content.nickname = '닉네임';
  doc.content.specs = [
    makeRow('CPU', 'Example CPU 8-Core'), makeRow('MB', 'Example Board'), makeRow('RAM', 'DDR5 16GB*2'),
    makeRow('VGA', 'Example GPU 12GB'), makeRow('SSD', 'NVMe 2TB'), makeRow('PSU', '1000W GOLD'),
  ];
  doc.assets = {
    A: { id: 'A', name: 'a', src: testImage('a'), builtin: false },
    B: { id: 'B', name: 'b', src: testImage('b'), builtin: false },
  };
  doc.content.photo = 'B';
  doc.layers = [makeShape({
    name: '배경', x: 0, y: 0, w: 850, h: 300, radius: 0,
    fill: { type: 'linear', color: '#26324d', color2: '#8d5a7c', angle: 30 },
  })];
  return doc;
}

function fixtureDocWithoutAssets(): Doc {
  const doc = fixtureDoc();
  doc.assets = {};
  doc.content.photo = null;
  return doc;
}

function fixtureLayer(kind: LayerKind, doc: Doc, effect: EffectType = 'sparkle'): Layer {
  if (kind === 'shape') return makeShape({ x: 100, y: 60, w: 300, h: 160 });
  if (kind === 'image') return makeImage({ x: 120, y: 40, w: 240, h: 220, asset: 'A' });
  if (kind === 'text') return makeText({ x: 120, y: 80, text: '가나다 ABC', size: 40 });
  if (kind === 'spec') return makeSpec({ x: 30, y: 20, w: 480, h: 240 });
  if (kind === 'effect') return makeEffect(effect, doc.card, { x: 100, y: 50, w: 400, h: 200, radius: 20 });
  return makeGroup([makeShape({ x: 90, y: 50, w: 200, h: 120 }), makeText({ x: 140, y: 150, text: '그룹', size: 36 })]);
}

async function pixels(doc: Doc, t: number, scale = 1): Promise<ImageData> {
  await ensureDocAssets(doc);
  const size = canvasSize(doc, scale);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  renderDoc(ctx, doc, { t, scale, editor: false });
  return ctx.getImageData(0, 0, size.w, size.h);
}

function diffCount(a: ImageData, b: ImageData): number {
  if (a.width !== b.width || a.height !== b.height) return Number.MAX_SAFE_INTEGER;
  let n = 0;
  for (let i = 0; i < a.data.length; i += 1) if (a.data[i] !== b.data[i]) n += 1;
  return n;
}

function altValue(def: PropDef, cur: unknown): unknown {
  if (def.alt !== undefined) return def.alt;
  if (def.control === 'toggle') return !cur;
  if (def.control === 'color') return cur === '#ff2d2d' ? '#2dff5a' : '#ff2d2d';
  if (def.control === 'number') return cur === def.max ? def.min : def.max ?? Number(cur) + 37;
  if (def.control === 'select' || def.control === 'segment') return def.options!.find((o) => o.value !== cur)!.value;
  if (def.control === 'font') return 'Courier New';
  return `${String(cur)} 변경`;
}

const T = 0.37;

/** 한 속성에 대해: 준비 → 그리기 → 값 변경 → 다시 그리기 → 달라졌는지. */
async function checkProp(
  label: string, base: Doc, pick: (doc: Doc) => unknown, section: Section, def: PropDef | null,
): Promise<TestResult> {
  const name = `${label} › ${section.title}${def ? ` › ${def.label}` : ' (켜기/끄기)'}`;
  try {
    const before = structuredClone(base);
    const target = pick(before) as Record<string, unknown>;
    if (def && section.toggle) setPath(target, section.toggle, true);
    def?.prep?.(target, before);
    if (section.visible && !section.visible(target, before)) return { name, ok: false, detail: '준비 후에도 구역이 보이지 않음' };
    if (def?.visible && !def.visible(target, before)) return { name, ok: false, detail: '준비 후에도 속성이 보이지 않음' };

    const after = structuredClone(before);
    const target2 = pick(after) as Record<string, unknown>;
    if (def) {
      const cur = def.get ? def.get(target2, after) : getPath(target2, def.path);
      const next = altValue(def, cur);
      if (def.set) def.set(target2, next, after);
      else setPath(target2, def.path, next);
    } else {
      setPath(target2, section.toggle!, !getPath(target2, section.toggle!));
    }
    const t = before.anim.duration * T;
    const changed = diffCount(await pixels(before, t), await pixels(after, t));
    return changed > 0 ? { name, ok: true } : { name, ok: false, detail: '값을 바꿨는데 그림이 그대로임' };
  } catch (err) {
    return { name, ok: false, detail: `오류: ${(err as Error).message}` };
  }
}

async function schemaChecks(label: string, base: Doc, pick: (doc: Doc) => unknown, sections: Section[]): Promise<TestResult[]> {
  const out: TestResult[] = [];
  for (const section of sections) {
    if (section.toggle) out.push(await checkProp(label, base, pick, section, null));
    for (const def of section.props) out.push(await checkProp(label, base, pick, section, def));
  }
  return out;
}

async function extraChecks(): Promise<TestResult[]> {
  const out: TestResult[] = [];
  const run = async (name: string, fn: () => Promise<string | null>) => {
    try {
      const fail = await fn();
      out.push(fail ? { name, ok: false, detail: fail } : { name, ok: true });
    } catch (err) {
      out.push({ name, ok: false, detail: `오류: ${(err as Error).message}` });
    }
  };

  await run('레이어 순서를 바꾸면 겹친 부분이 바뀐다', async () => {
    const a = fixtureDoc();
    a.layers.push(makeShape({ x: 100, y: 60, w: 200, h: 120, fill: { color: '#ff0000' } }));
    a.layers.push(makeShape({ x: 180, y: 100, w: 200, h: 120, fill: { color: '#0000ff' } }));
    const b = structuredClone(a);
    b.layers.splice(1, 2, b.layers[2], b.layers[1]);
    return diffCount(await pixels(a, 0), await pixels(b, 0)) > 0 ? null : '순서를 바꿔도 그림이 같음';
  });

  await run('숨긴 레이어는 그려지지 않는다', async () => {
    const a = fixtureDoc();
    const empty = await pixels(a, 0);
    a.layers.push({ ...makeShape({ x: 100, y: 60 }), visible: false });
    return diffCount(empty, await pixels(a, 0)) === 0 ? null : '숨긴 레이어가 그려짐';
  });

  for (const effect of Object.keys(EFFECT_LABELS) as EffectType[]) {
    await run(`효과 “${EFFECT_LABELS[effect]}”: 움직이고, 끝과 처음이 이어진다`, async () => {
      const doc = fixtureDoc();
      doc.layers.push(makeEffect(effect, doc.card));
      const start = await pixels(doc, 0);
      if (diffCount(start, await pixels(doc, doc.anim.duration)) !== 0) return '반복 끝이 처음과 다름';
      if (diffCount(start, await pixels(doc, doc.anim.duration * T)) === 0) return '시간이 지나도 그림이 그대로임';
      return null;
    });
  }

  await run('배율 2배 출력은 1배와 같은 그림이다(그림자·발광 포함)', async () => {
    const doc = fixtureDoc();
    doc.layers.push(makeShape({
      x: 120, y: 70, w: 260, h: 140,
      styles: { shadow: { on: true, blur: 16, x: 8, y: 10, opacity: 0.8 }, glow: { on: true, color: '#00e5ff', blur: 14, strength: 2 } },
    }));
    const one = await pixels(doc, 0, 1);
    const two = await pixels(doc, 0, 2);
    if (two.width !== one.width * 2 || two.height !== one.height * 2) return `크기가 ${two.width}×${two.height}`;
    let sum = 0;
    for (let y = 0; y < one.height; y += 1) {
      for (let x = 0; x < one.width; x += 1) {
        for (let c = 0; c < 3; c += 1) {
          const i2 = ((y * 2) * two.width + x * 2) * 4 + c;
          const avg = (two.data[i2] + two.data[i2 + 4] + two.data[i2 + two.width * 4] + two.data[i2 + two.width * 4 + 4]) / 4;
          sum += Math.abs(avg - one.data[(y * one.width + x) * 4 + c]);
        }
      }
    }
    const mean = sum / (one.width * one.height * 3);
    return mean < 2.5 ? null : `평균 차이 ${mean.toFixed(2)} (기준 2.5)`;
  });

  await run('출력 크기는 카드 크기 그대로다(가장자리 발광이 있어도)', async () => {
    const doc = fixtureDoc();
    doc.layers.push(makeShape({ x: -20, y: -20, w: 200, h: 100, styles: { glow: { on: true, blur: 40, strength: 5 } } }));
    const bmp = await createImageBitmap(await exportPng(doc, 1, 0));
    return bmp.width === 850 && bmp.height === 300 ? null : `출력이 ${bmp.width}×${bmp.height}`;
  });

  await run('움직이는 WebP: 프레임 수와 크기가 맞는다', async () => {
    const doc = fixtureDoc();
    doc.anim = { duration: 1, fps: 8 };
    doc.layers.push(makeEffect('sparkle', doc.card));
    const blob = await exportAnimatedWebp(doc, { scale: 1, fps: 8, quality: 0.8 });
    const bmp = await createImageBitmap(blob);
    if (bmp.width !== 850 || bmp.height !== 300) return `크기가 ${bmp.width}×${bmp.height}`;
    const Decoder = (window as unknown as { ImageDecoder?: new (init: object) => { tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } } } }).ImageDecoder;
    if (!Decoder) return null;
    const decoder = new Decoder({ data: await blob.arrayBuffer(), type: 'image/webp' });
    await decoder.tracks.ready;
    const n = decoder.tracks.selectedTrack.frameCount;
    return n === 8 ? null : `프레임이 ${n}개 (기대 8)`;
  });

  await run('움직이는 GIF: 프레임 수와 크기가 맞고 색이 크게 틀어지지 않는다', async () => {
    const doc = fixtureDoc();
    doc.anim = { duration: 1, fps: 8 };
    doc.layers.push(makeEffect('sparkle', doc.card));
    const blob = await exportGif(doc, { scale: 1, fps: 8 });
    const bmp = await createImageBitmap(blob);
    if (bmp.width !== 850 || bmp.height !== 300) return `크기가 ${bmp.width}×${bmp.height}`;
    const c = document.createElement('canvas');
    c.width = 850; c.height = 300;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(bmp, 0, 0);
    const got = g.getImageData(0, 0, 850, 300).data;
    const want = (await pixels(doc, 0)).data;
    let sum = 0;
    for (let i = 0; i < got.length; i += 4) sum += Math.abs(got[i] - want[i]) + Math.abs(got[i + 1] - want[i + 1]) + Math.abs(got[i + 2] - want[i + 2]);
    const mean = sum / (got.length / 4) / 3;
    if (mean > 6) return `원본과 평균 색 차이 ${mean.toFixed(1)} (기준 6)`;
    const Decoder = (window as unknown as { ImageDecoder?: new (init: object) => { tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } } } }).ImageDecoder;
    if (!Decoder) return null;
    const decoder = new Decoder({ data: await blob.arrayBuffer(), type: 'image/gif' });
    await decoder.tracks.ready;
    const n = decoder.tracks.selectedTrack.frameCount;
    return n === 8 ? null : `프레임이 ${n}개 (기대 8)`;
  });

  await run('색 테마: 한 색을 바꾸면 그 색을 쓰는 모든 곳이 바뀌고 한 번에 되돌아온다', async () => {
    const doc = fixtureDoc();
    doc.layers.push(makeShape({ fill: { color: '#123456' } }), makeText({ color: '#123456' }), makeText({ color: '#abcdef' }));
    useEditor.getState().setDoc(doc);
    const before = themeColors(doc).find((c) => c.color === '#123456');
    if (!before || before.count !== 2) return `쓰인 횟수가 ${before?.count}`;
    replaceColor('#123456', '#ff0000');
    const next = useEditor.getState().doc;
    const s1 = next.layers[1] as { fill: { color: string } };
    const t1 = next.layers[2] as { color: string };
    const t2 = next.layers[3] as { color: string };
    if (s1.fill.color !== '#ff0000' || t1.color !== '#ff0000' || t2.color !== '#abcdef') return '바뀐 범위가 틀림';
    useEditor.getState().undo();
    return useEditor.getState().doc === doc ? null : '실행 취소 한 번으로 돌아오지 않음';
  });

  await run('레이어 복사·붙여넣기와 스타일 복사', async () => {
    const doc = fixtureDoc();
    const a = makeText({ text: '가', color: '#ff00ff', styles: { outline: { on: true, color: '#00ff00', width: 4 } } });
    const b = makeText({ text: '나' });
    const img = makeImage({ asset: 'A' });
    doc.layers.push(a, b, img);
    const st = useEditor.getState();
    st.setDoc(doc);
    st.select([img.id]);
    copySelection();
    useEditor.getState().setDoc(fixtureDocWithoutAssets());
    pasteClipboard();
    const pasted = useEditor.getState().doc;
    if (pasted.layers.length !== 2 || pasted.layers[1].kind !== 'image' || pasted.layers[1].id === img.id) return '붙여넣은 레이어가 틀림';
    if (!pasted.assets.A) return '붙여넣은 이미지의 원본이 따라오지 않음';
    useEditor.getState().setDoc(doc);
    useEditor.getState().select([a.id]);
    copyStyle();
    useEditor.getState().select([b.id]);
    pasteStyle();
    const nb = useEditor.getState().doc.layers[2] as typeof b;
    return nb.color === '#ff00ff' && nb.styles.outline.on && nb.styles.outline.color === '#00ff00' && nb.text === '나' ? null : '스타일이 옮겨지지 않음';
  });

  await run('프리셋을 적용해도 내용은 그대로이고, 실행 취소 한 번으로 돌아온다', async () => {
    const st = useEditor.getState();
    const doc = fixtureDoc();
    doc.layers.push(makeSpec());
    st.setDoc(doc);
    applyPreset(PRESETS[1].build());
    const next = useEditor.getState().doc;
    if (next.content !== doc.content && JSON.stringify(next.content) !== JSON.stringify(doc.content)) return '내용이 바뀜';
    if (next.layers.length === doc.layers.length && next.layers[0].id === doc.layers[0].id) return '레이어가 안 바뀜';
    if (!next.assets.B) return '내 사진 자산이 사라짐';
    useEditor.getState().undo();
    return useEditor.getState().doc === doc ? null : '실행 취소 한 번으로 돌아오지 않음';
  });

  for (const preset of PRESETS) {
    await run(`프리셋 “${preset.name}”: 그려지고 사양·닉네임 자리가 있다`, async () => {
      const data = preset.build();
      const doc: Doc = { ...fixtureDoc(), card: data.card, layers: data.layers, assets: { ...fixtureDoc().assets, ...data.assets } };
      if (!data.layers.some((l) => l.kind === 'spec')) return '사양 목록 레이어가 없음';
      if (!data.layers.some((l) => l.kind === 'text' && l.slot === 'nickname')) return '닉네임 자리가 없음';
      if (!data.layers.some((l) => l.role === 'bg')) return '바탕 레이어 표시가 없음';
      const blank = { ...doc, layers: [] };
      return diffCount(await pixels(blank, 0), await pixels(doc, 0)) > 0 ? null : '아무것도 그려지지 않음';
    });
  }

  await run('백업 파일(.jjal)로 내보냈다가 열면 같은 문서다', async () => {
    const doc = fixtureDoc();
    doc.name = '왕복 검사';
    doc.layers.push(makeImage({ asset: 'A' }), makeText(), makeSpec());
    const back = unpackDoc(packDoc(doc));
    return JSON.stringify(back) === JSON.stringify(doc) ? null : '다시 연 문서가 다름';
  });

  await run('캔버스 클릭은 잠긴 레이어와 효과 레이어를 건너뛴다', async () => {
    const doc = fixtureDoc();
    doc.layers[0].locked = true;
    const shape = makeShape({ x: 100, y: 60, w: 200, h: 120 });
    doc.layers.push(shape, makeEffect('sparkle', doc.card));
    if (hitTest(doc, 150, 100) !== shape.id) return '효과 아래 도형이 선택되지 않음';
    return hitTest(doc, 700, 250) === null ? null : '잠긴 배경이 선택됨';
  });

  return out;
}

export async function runSelfTest(): Promise<Report> {
  const started = performance.now();
  const results: TestResult[] = [];
  const kinds: LayerKind[] = ['shape', 'image', 'text', 'spec', 'group'];
  for (const kind of kinds) {
    const base = fixtureDoc();
    base.layers.push(fixtureLayer(kind, base));
    results.push(...await schemaChecks(kind, base, (d) => d.layers[1], SCHEMA[kind]));
  }
  for (const effect of Object.keys(EFFECT_LABELS) as EffectType[]) {
    const base = fixtureDoc();
    base.layers.push(fixtureLayer('effect', base, effect));
    const sections = SCHEMA.effect.map((s) => ({
      ...s,
      // 효과 종류 자체를 바꾸는 검사는 한 번이면 된다.
      props: s.props.filter((p) => (p.path !== 'effect' || effect === 'sparkle')
        && (!p.visible || p.visible(base.layers[1], base))),
    }));
    results.push(...await schemaChecks(`effect:${effect}`, base, (d) => d.layers[1], sections));
  }
  const cardBase = fixtureDoc();
  cardBase.layers.push(makeEffect('sparkle', cardBase.card));
  results.push(...await schemaChecks('card', cardBase, (d) => d, CARD_SCHEMA));
  results.push(...await extraChecks());

  const failed = results.filter((r) => !r.ok).length;
  return { passed: results.length - failed, failed, ms: Math.round(performance.now() - started), results };
}

export function SelfTestView({ report }: { report: Report }) {
  return (
    <div className="selftest">
      <h1>자동 검사 — {report.failed === 0 ? '모두 통과' : `${report.failed}개 실패`}</h1>
      <p>{report.passed}개 통과 · {report.failed}개 실패 · {report.ms}ms</p>
      <ul>
        {report.results.filter((r) => !r.ok).map((r) => <li key={r.name} className="fail">✗ {r.name} — {r.detail}</li>)}
        {report.results.filter((r) => r.ok).map((r) => <li key={r.name}>✓ {r.name}</li>)}
      </ul>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { applyBackground, applyPreset, presetFromDoc, type BgMeta } from '../editor/actions';
import { makeThumb, openDesign, saveCurrent } from '../editor/session';
import { toast, useEditor } from '../editor/store';
import { download, exportAnimatedWebp, exportGif, exportPng, exportWebp, frameCount, renderFrame, safeName, sizeText } from '../io/exporter';
import {
  deleteDesign, deletePreset, getSetting, listDesigns, listPresets, savePreset, setSetting,
  type SavedDesign, type SavedPreset,
} from '../io/storage';
import { emptyDoc, uid } from '../model/factory';
import { hasMotion } from '../model/ops';
import { withSampleValues } from '../model/specs';
import type { Doc } from '../model/types';
import { PRESETS, type PresetData } from '../presets/builtin';
import { backgroundUrl, ensureDocAssets } from '../render/assets';
import { canvasSize, renderDoc } from '../render/renderer';
import { Modal, Segment } from './controls';

const close = () => useEditor.getState().set({ dialog: null });

/** 프리셋에 지금 내용을 끼운 임시 문서. 미리보기 전용이다. */
function previewDoc(data: PresetData, doc: Doc): Doc {
  const photo = doc.content.photo ? doc.assets[doc.content.photo] : null;
  return {
    ...emptyDoc(),
    card: data.card,
    layers: data.layers,
    assets: { ...data.assets, ...(photo ? { [photo.id]: photo } : {}) },
    anim: data.anim ?? doc.anim,
    content: { ...doc.content, specs: withSampleValues(doc.content.specs) },
  };
}

function PresetThumb({ data, doc, motion }: { data: PresetData; doc: Doc; motion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState(false);
  const preview = useMemo(() => previewDoc(data, doc), [data, doc]);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    const canvas = ref.current!;
    const scale = (300 / preview.card.w) * (window.devicePixelRatio || 1);
    const size = canvasSize(preview, scale);
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d')!;
    const draw = (t: number) => renderDoc(ctx, preview, { t, scale, editor: true });
    void ensureDocAssets(preview).then(() => {
      if (!alive) return;
      draw(preview.anim.duration * 0.4);
      if (hover && motion) {
        const start = performance.now();
        const loop = (now: number) => {
          draw(((now - start) / 1000) % preview.anim.duration);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }
    });
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [preview, hover, motion]);

  return <canvas ref={ref} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} />;
}

export function PresetGallery() {
  const doc = useEditor((s) => s.doc);
  const [tab, setTab] = useState<'builtin' | 'mine'>('builtin');
  const [mine, setMine] = useState<SavedPreset[]>([]);
  const builtin = useMemo(() => PRESETS.map((p) => ({ preset: p, data: p.build() })), []);

  useEffect(() => { void listPresets().then(setMine); }, []);

  const use = (data: PresetData, name: string) => {
    applyPreset(data);
    close();
    toast(`“${name}” 적용 — 사양·닉네임·사진은 그대로입니다. Ctrl+Z로 되돌릴 수 있습니다.`);
  };

  return (
    <Modal title="프리셋 고르기" onClose={close} wide>
      <div className="gallery-head">
        <Segment
          value={tab} onChange={setTab}
          options={[{ value: 'builtin', label: `기본 ${PRESETS.length}` }, { value: 'mine', label: `내 프리셋 ${mine.length}` }]}
        />
        <p className="note">지금 내 내용이 들어간 모습입니다. 고르면 디자인만 바뀌고, 적용한 뒤에는 모든 요소를 레이어로 자유롭게 고칠 수 있습니다.</p>
      </div>
      {tab === 'builtin' && (
        <div className="preset-grid">
          {builtin.map(({ preset, data }) => (
            <button type="button" className="preset-card" key={preset.id} onClick={() => use(data, preset.name)}>
              <PresetThumb data={data} doc={doc} motion={preset.motion} />
              <span className="preset-name">{preset.name}{preset.motion && <em>움직임</em>}</span>
              <span className="preset-hint">{preset.hint}</span>
            </button>
          ))}
        </div>
      )}
      {tab === 'mine' && (
        <div className="preset-grid">
          {mine.length === 0 && <p className="empty">아직 없습니다. 파일 메뉴의 “지금 디자인을 프리셋으로 저장”으로 추가하세요.</p>}
          {mine.map((p) => (
            <div className="preset-card" key={p.id}>
              <button type="button" className="thumb-btn" onClick={() => use(p.data, p.name)}>
                <PresetThumb data={p.data} doc={doc} motion={false} />
              </button>
              <span className="preset-name">{p.name}</span>
              <button
                type="button" className="mini danger"
                onClick={async () => {
                  if (!window.confirm(`내 프리셋 “${p.name}”을 지울까요? 되돌릴 수 없습니다.`)) return;
                  await deletePreset(p.id);
                  setMine(await listPresets());
                }}
              >지우기</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function SavePresetDialog() {
  const doc = useEditor((s) => s.doc);
  const [name, setName] = useState(doc.name || '내 프리셋');
  const save = async () => {
    const data = presetFromDoc(doc);
    await savePreset({ id: uid('p'), name: name.trim() || '내 프리셋', updated: Date.now(), thumb: await makeThumb(doc), data });
    close();
    toast('내 프리셋에 저장했습니다. “프리셋”에서 다시 쓸 수 있습니다.');
  };
  return (
    <Modal
      title="지금 디자인을 프리셋으로 저장" onClose={close}
      footer={<button type="button" className="primary" onClick={() => { void save(); }}>저장</button>}
    >
      <p className="note">레이어 구성과 카드 설정만 저장합니다. 사양·닉네임·내 사진은 프리셋에 들어가지 않습니다.</p>
      <label className="field">
        <span>이름</span>
        <input type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void save(); }} />
      </label>
    </Modal>
  );
}

let bgCache: BgMeta[] | null = null;

export function BackgroundGallery() {
  const [items, setItems] = useState<BgMeta[]>(bgCache ?? []);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('전체');
  const [query, setQuery] = useState('');
  const [adjust, setAdjust] = useState(true);
  const current = useEditor((s) => {
    const hit = Object.keys(s.doc.assets).find((id) => id.startsWith('bg_'));
    return hit ? hit.slice(3) : null;
  });

  useEffect(() => {
    void getSetting('bgAdjust', true).then(setAdjust);
    if (bgCache) return;
    fetch('backgrounds/backgrounds.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((list: BgMeta[]) => { bgCache = list; setItems(list); })
      .catch((err) => setError(`배경 목록을 불러오지 못했습니다: ${(err as Error).message}`));
  }, []);

  const categories = useMemo(() => ['전체', ...new Set(items.map((b) => b.category))], [items]);
  const shown = items.filter((b) => (category === '전체' || b.category === category)
    && (!query.trim() || `${b.name} ${b.category}`.toLowerCase().includes(query.trim().toLowerCase())));

  const apply = (bg: BgMeta) => applyBackground(bg, adjust);
  const random = () => {
    const pool = shown.filter((b) => b.id !== current);
    if (pool.length) apply(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <Modal title="배경 고르기" onClose={close} wide footer={<button type="button" className="primary" onClick={close}>완료</button>}>
      <div className="gallery-head">
        <input type="search" placeholder="이름·분류 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" onClick={random}>랜덤</button>
        <label className="check">
          <input
            type="checkbox" checked={adjust}
            onChange={(e) => { setAdjust(e.target.checked); void setSetting('bgAdjust', e.target.checked); }}
          />
          배경 밝기에 맞춰 사양·닉네임 글자색 바꾸기
        </label>
      </div>
      <div className="chips">
        {categories.map((c) => (
          <button type="button" key={c} className={c === category ? 'on' : ''} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>
      {error && <p className="note warn">{error}</p>}
      <p className="note">누르면 바로 바탕 레이어에 적용됩니다. 여러 장을 눌러 보며 고르세요. ({shown.length}장)</p>
      <div className="bg-grid">
        {shown.map((b) => (
          <button type="button" key={b.id} className={`bg-card${b.id === current ? ' on' : ''}`} onClick={() => apply(b)} title={`${b.category} · ${b.name}`}>
            <img src={backgroundUrl(b.id, true)} alt={b.name} loading="lazy" width={340} height={120} />
            <span>{b.name}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function DesignsDialog() {
  const [list, setList] = useState<SavedDesign[] | null>(null);
  const currentId = useEditor((s) => s.designId);
  const reload = () => { void listDesigns().then(setList); };
  useEffect(reload, []);
  return (
    <Modal title="내 디자인" onClose={close} wide>
      {list === null && <p className="note">불러오는 중…</p>}
      {list && list.length === 0 && <p className="empty">저장한 디자인이 없습니다. Ctrl+S로 지금 디자인을 저장하세요.</p>}
      <div className="preset-grid">
        {list?.map((d) => (
          <div className={`preset-card${d.id === currentId ? ' on' : ''}`} key={d.id}>
            <button type="button" className="thumb-btn" onClick={async () => { if (await openDesign(d.id)) close(); }}>
              <img src={d.thumb} alt="" />
            </button>
            <span className="preset-name">{d.name}</span>
            <span className="preset-hint">{new Date(d.updated).toLocaleString('ko-KR')}</span>
            <button
              type="button" className="mini danger"
              onClick={async () => {
                if (!window.confirm(`“${d.name}”을 지울까요? 되돌릴 수 없습니다.`)) return;
                await deleteDesign(d.id);
                if (d.id === useEditor.getState().designId) useEditor.setState({ designId: null, savedDoc: null });
                reload();
              }}
            >지우기</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

type Format = 'png' | 'webp' | 'anim' | 'gif';

const EXT: Record<Format, string> = { png: 'png', webp: 'webp', anim: 'webp', gif: 'gif' };
const SAVE_LABEL: Record<Format, string> = { png: 'PNG 저장', webp: 'WebP 저장', anim: '움직이는 WebP 저장', gif: 'GIF 저장' };

export function ExportDialog() {
  const doc = useEditor((s) => s.doc);
  const motion = hasMotion(doc);
  const [format, setFormat] = useState<Format>('png');
  const [scale, setScale] = useState(1);
  const [fps, setFps] = useState(doc.anim.fps);
  const [quality, setQuality] = useState(0.9);
  const [frameT, setFrameT] = useState(useEditor.getState().t);
  const [busy, setBusy] = useState<string | null>(null);
  /** 지금 설정으로 만들어 둔 결과물. 설정이 바뀌면 버린다. */
  const [made, setMade] = useState<Blob | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const moving = format === 'anim' || format === 'gif';

  useEffect(() => {
    void renderFrame(doc, Math.min(1, 560 / doc.card.w) * (window.devicePixelRatio || 1), frameT, previewRef.current!);
  }, [doc, frameT]);

  const build = async (): Promise<Blob> => {
    if (format === 'png') return exportPng(doc, scale, frameT);
    if (format === 'webp') return exportWebp(doc, scale, frameT, 1);
    const onProgress = (done: number, total: number) => setBusy(`프레임 ${done} / ${total}`);
    if (format === 'gif') return exportGif(doc, { scale, fps, onProgress });
    return exportAnimatedWebp(doc, { scale, fps, quality, onProgress });
  };

  // 정지 이미지는 금방 만들어지므로 설정을 바꿀 때마다 용량을 바로 보여 준다.
  useEffect(() => {
    setMade(null);
    if (moving) return undefined;
    let alive = true;
    const timer = setTimeout(() => { void build().then((blob) => { if (alive) setMade(blob); }).catch(() => undefined); }, 250);
    return () => { alive = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, format, scale, fps, quality, frameT]);

  const size = canvasSize(doc, scale);
  const frames = frameCount(doc, fps);

  const run = async (save: boolean) => {
    try {
      let blob = made;
      if (!blob) {
        setBusy('만드는 중…');
        blob = await build();
        setMade(blob);
      }
      if (!save) return;
      download(blob, `${safeName(doc.name)}.${EXT[format]}`);
      toast(`저장: ${size.w}×${size.h}px · ${sizeText(blob.size)}`);
      close();
    } catch (err) {
      toast(`내보내지 못했습니다: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      title="내보내기" onClose={busy ? () => undefined : close}
      footer={(
        <>
          {busy && <span className="busy">{busy}</span>}
          {!busy && <span className="size-info">{made ? `용량 ${sizeText(made.size)}` : moving ? '용량은 만들어 봐야 알 수 있습니다' : '용량 계산 중…'}</span>}
          {moving && !made && <button type="button" disabled={!!busy} onClick={() => { void run(false); }}>용량 확인</button>}
          <button type="button" className="primary" disabled={!!busy} onClick={() => { void run(true); }}>{SAVE_LABEL[format]}</button>
        </>
      )}
    >
      <div className="export-preview"><canvas ref={previewRef} /></div>
      <div className="prop stacked">
        <label>형식</label>
        <Segment
          value={format} onChange={setFormat}
          options={[
            { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' },
            { value: 'anim', label: '움직이는 WebP' }, { value: 'gif', label: '움직이는 GIF' },
          ]}
        />
        {moving && !motion && (
          <p className="note warn">움직이는 효과 레이어가 없어서 모든 프레임이 같은 그림입니다. 왼쪽 막대의 “효과”로 추가할 수 있습니다.</p>
        )}
        {format === 'gif' && (
          <p className="note">GIF는 256색이라 그라디언트·사진이 거칠어지고 용량이 큽니다. WebP를 받지 않는 게시판에만 쓰세요. 반투명은 완전 투명/불투명으로만 저장됩니다.</p>
        )}
      </div>
      <div className="prop stacked">
        <label>크기</label>
        <Segment
          value={scale} onChange={setScale}
          options={[1, 2, 3].map((n) => ({ value: n, label: `${n}배 · ${doc.card.w * n}×${doc.card.h * n}` }))}
        />
      </div>
      {!moving && motion && (
        <div className="prop stacked">
          <label>어느 순간을 저장할지 ({frameT.toFixed(2)}초)</label>
          <input type="range" min={0} max={doc.anim.duration} step={0.01} value={frameT} onChange={(e) => setFrameT(Number(e.target.value))} />
        </div>
      )}
      {moving && (
        <>
          <div className="prop stacked">
            <label>초당 프레임 (낮출수록 용량이 줄어듭니다)</label>
            <Segment value={fps} onChange={setFps} options={[10, 15, 20, 24, 30].map((n) => ({ value: n, label: String(n) }))} />
          </div>
          {format === 'anim' && (
            <div className="prop stacked">
              <label>화질 ({Math.round(quality * 100)}{quality >= 1 ? ' · 무손실' : ''})</label>
              <input type="range" min={0.5} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
            </div>
          )}
          <p className="note">{doc.anim.duration}초 반복 · {frames}프레임. 끝과 처음이 이어지게 만들어집니다.</p>
        </>
      )}
      <p className="note">
        출력은 정확히 {size.w}×{size.h}px입니다.
        {doc.card.radius > 0 && doc.card.matte.type === 'transparent'
          && ' 둥근 모서리 바깥은 투명입니다. 투명을 지원하지 않는 게시판에서는 검게 보일 수 있으니, 그럴 땐 카드 설정의 “모서리 바깥”을 색으로 채우세요.'}
      </p>
    </Modal>
  );
}

export function Dialogs() {
  const dialog = useEditor((s) => s.dialog);
  if (dialog === 'presets') return <PresetGallery />;
  if (dialog === 'backgrounds') return <BackgroundGallery />;
  if (dialog === 'designs') return <DesignsDialog />;
  if (dialog === 'export') return <ExportDialog />;
  if (dialog === 'savePreset') return <SavePresetDialog />;
  return null;
}

export { saveCurrent };

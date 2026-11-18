import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '../editor/store';
import { findLayer, hasMotion, leaves } from '../model/ops';
import type { Box, Layer } from '../model/types';
import { assetSrc, getImage, onImageReady } from '../render/assets';
import { boxBounds, boxCorners, hitTest, layerBox, pointInBox, unionRects, type Rect } from '../render/geometry';
import { canvasSize, renderDoc } from '../render/renderer';
import { measureTextLayer } from '../render/text';

type Handle = { hx: -1 | 0 | 1; hy: -1 | 0 | 1 };

type Drag =
  | {
    type: 'move'; sx: number; sy: number; moved: boolean; clickSelect: string[] | null;
    origin: { id: string; x: number; y: number }[]; bounds: Rect;
  }
  | {
    type: 'resize'; id: string; hx: number; hy: number; ax: number; ay: number;
    w0: number; h0: number; rot: number; size0: number;
  }
  | { type: 'rotate'; id: string; cx: number; cy: number; a0: number; rot0: number }
  | { type: 'crop'; id: string; sx: number; sy: number; panX: number; panY: number; rot: number };

const MARGIN = 90;
const SNAP_PX = 6;
const MIN_SIZE = 6;

function normAngle(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

/** margin: 카드 둘레에 남기는 여백. grip: 손잡이 크기(터치 화면에서는 크게). */
export function Stage({ margin = MARGIN, grip = 10 }: { margin?: number; grip?: number } = {}) {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const t = useEditor((s) => s.t);
  const zoom = useEditor((s) => s.zoom);
  const cropId = useEditor((s) => s.cropId);
  const playing = useEditor((s) => s.playing);
  const backdrop = useEditor((s) => s.backdrop);
  const board = backdrop === 'checker' ? null : backdrop;

  const viewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const [view, setView] = useState({ w: 800, h: 500 });
  const [tick, setTick] = useState(0);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });

  useLayoutEffect(() => {
    const el = viewRef.current!;
    const ro = new ResizeObserver(() => setView({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setView({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const off = onImageReady(bump);
    document.fonts?.addEventListener('loadingdone', bump);
    return () => { off(); document.fonts?.removeEventListener('loadingdone', bump); };
  }, []);

  const fit = Math.max(0.2, Math.min((view.w - margin) / doc.card.w, (view.h - margin) / doc.card.h, 3));
  const z = zoom === 'fit' ? fit : zoom;
  const cw = doc.card.w * z;
  const ch = doc.card.h * z;
  const innerW = Math.max(view.w, cw + margin);
  const innerH = Math.max(view.h, ch + margin);
  const ox = (innerW - cw) / 2;
  const oy = (innerH - ch) / 2;

  // 편집 화면도 출력과 같은 렌더러로 그린다.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const scale = z * (window.devicePixelRatio || 1);
    const size = canvasSize(doc, scale);
    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
    }
    renderDoc(canvas.getContext('2d')!, doc, { t, scale, editor: true });
  }, [doc, t, z, tick]);

  // 움직임 미리보기
  const moving = playing && hasMotion(doc);
  useEffect(() => {
    if (!moving) return undefined;
    let raf = 0;
    const start = performance.now() - useEditor.getState().t * 1000;
    const loop = (now: number) => {
      const dur = useEditor.getState().doc.anim.duration;
      useEditor.getState().set({ t: ((now - start) / 1000) % dur });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [moving]);

  const toDoc = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z };
  };

  const selected = useMemo(
    () => selection.map((id) => findLayer(doc.layers, id)?.layer).filter((l): l is Layer => !!l),
    [selection, doc],
  );
  const single = selected.length === 1 && selected[0].kind !== 'group' ? selected[0] : null;
  const singleBox: Box | null = single ? layerBox(single, doc.content) : null;
  const multiRect: Rect | null = !single && selected.length > 0
    ? unionRects(selected.map((l) => boxBounds(layerBox(l, doc.content))))
    : null;

  /** 이동 중 가장자리·가운데를 카드와 다른 레이어에 붙인다. */
  const snap = (bounds: Rect, dx: number, dy: number, ids: string[]) => {
    const state = useEditor.getState();
    const xs = [0, state.doc.card.w / 2, state.doc.card.w];
    const ys = [0, state.doc.card.h / 2, state.doc.card.h];
    const skip = new Set<string>();
    ids.forEach((id) => {
      const hit = findLayer(state.doc.layers, id);
      if (hit) leaves(hit.layer).forEach((l) => skip.add(l.id));
    });
    const visit = (layers: Layer[]) => {
      for (const l of layers) {
        if (!l.visible) continue;
        if (l.kind === 'group') { visit(l.children); continue; }
        if (l.kind === 'effect' || skip.has(l.id)) continue;
        const r = boxBounds(layerBox(l, state.doc.content));
        xs.push(r.x, r.x + r.w / 2, r.x + r.w);
        ys.push(r.y, r.y + r.h / 2, r.y + r.h);
      }
    };
    visit(state.doc.layers);
    const lim = SNAP_PX / z;
    const best = (edges: number[], cands: number[]) => {
      let delta = 0;
      let dist = lim;
      let at: number | null = null;
      for (const e of edges) for (const c of cands) {
        if (Math.abs(c - e) < dist) { dist = Math.abs(c - e); delta = c - e; at = c; }
      }
      return { delta, at };
    };
    const bx = best([bounds.x + dx, bounds.x + bounds.w / 2 + dx, bounds.x + bounds.w + dx], xs);
    const by = best([bounds.y + dy, bounds.y + bounds.h / 2 + dy, bounds.y + bounds.h + dy], ys);
    setGuides({ v: bx.at === null ? [] : [bx.at], h: by.at === null ? [] : [by.at] });
    return { dx: dx + bx.delta, dy: dy + by.delta };
  };

  const startMove = (e: React.PointerEvent, ids: string[], clickSelect: string[] | null) => {
    const state = useEditor.getState();
    const origin: { id: string; x: number; y: number }[] = [];
    const rects: Rect[] = [];
    ids.forEach((id) => {
      const hit = findLayer(state.doc.layers, id);
      if (!hit || hit.layer.locked) return;
      rects.push(boxBounds(layerBox(hit.layer, state.doc.content)));
      leaves(hit.layer).forEach((l) => origin.push({ id: l.id, x: l.x, y: l.y }));
    });
    const p = toDoc(e);
    drag.current = { type: 'move', sx: p.x, sy: p.y, moved: false, clickSelect, origin, bounds: unionRects(rects) };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const state = useEditor.getState();
    const p = toDoc(e);

    if (state.cropId) {
      const hit = findLayer(state.doc.layers, state.cropId);
      if (hit && hit.layer.kind === 'image' && pointInBox(p.x, p.y, layerBox(hit.layer, state.doc.content), 2)) {
        state.begin();
        drag.current = {
          type: 'crop', id: hit.layer.id, sx: p.x, sy: p.y,
          panX: hit.layer.panX, panY: hit.layer.panY, rot: hit.layer.rot,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      state.set({ cropId: null });
    }

    const hitId = hitTest(state.doc, p.x, p.y);
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (additive) {
      if (hitId) {
        state.select(state.selection.includes(hitId)
          ? state.selection.filter((id) => id !== hitId)
          : [...state.selection, hitId]);
      }
      return;
    }
    // 이미 선택한 것 위에서 누르면 그것을 끈다. 끌지 않고 떼면 그 자리의 맨 위 레이어를 고른다.
    const inside = state.selection.some((id) => {
      const hit = findLayer(state.doc.layers, id);
      return hit && pointInBox(p.x, p.y, { ...boxBounds(layerBox(hit.layer, state.doc.content)), rot: 0 }, 2);
    });
    if (inside) {
      startMove(e, state.selection, hitId ? [hitId] : null);
      return;
    }
    if (!hitId) {
      state.select([]);
      return;
    }
    state.select([hitId]);
    startMove(e, [hitId], null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const state = useEditor.getState();
    const p = toDoc(e);

    if (d.type === 'move') {
      let dx = p.x - d.sx;
      let dy = p.y - d.sy;
      if (!d.moved) {
        if (Math.hypot(dx, dy) * z < 3) return;
        d.moved = true;
        state.begin();
      }
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
      }
      if (!e.altKey) ({ dx, dy } = snap(d.bounds, dx, dy, state.selection));
      else setGuides({ v: [], h: [] });
      const rx = Math.round(dx);
      const ry = Math.round(dy);
      state.apply((draft) => {
        for (const o of d.origin) {
          const hit = findLayer(draft.layers, o.id);
          if (hit) { hit.layer.x = o.x + rx; hit.layer.y = o.y + ry; }
        }
      });
      return;
    }

    if (d.type === 'resize') {
      const rad = (d.rot * Math.PI) / 180;
      const ux = Math.cos(rad);
      const uy = Math.sin(rad);
      const lx = (p.x - d.ax) * ux + (p.y - d.ay) * uy;
      const ly = -(p.x - d.ax) * uy + (p.y - d.ay) * ux;
      state.apply((draft) => {
        const hit = findLayer(draft.layers, d.id);
        if (!hit || hit.layer.kind === 'group') return;
        const layer = hit.layer;
        let w = d.hx ? Math.max(MIN_SIZE, d.hx * lx) : d.w0;
        let h = d.hy ? Math.max(MIN_SIZE, d.hy * ly) : d.h0;
        const corner = d.hx !== 0 && d.hy !== 0;
        // 이미지는 기본으로 비율을 지키고 Shift로 푼다. 나머지는 Shift를 누를 때만 비율을 지킨다.
        const keep = layer.kind === 'text' || (corner && (layer.kind === 'image' ? !e.shiftKey : e.shiftKey));
        if (keep) {
          const k = Math.max(w / d.w0, h / d.h0);
          w = d.w0 * k;
          h = d.h0 * k;
        }
        if (layer.kind === 'text') {
          layer.size = Math.max(6, Math.min(400, Math.round(d.size0 * (w / d.w0) * 10) / 10));
          const m = measureTextLayer(layer, draft.content);
          w = m.w;
          h = m.h;
        } else {
          w = Math.round(w);
          h = Math.round(h);
        }
        const cx = d.ax + ux * ((d.hx * w) / 2) - uy * ((d.hy * h) / 2);
        const cy = d.ay + uy * ((d.hx * w) / 2) + ux * ((d.hy * h) / 2);
        const left = cx - w / 2;
        if (layer.kind === 'text') {
          layer.x = layer.align === 'left' || layer.vertical ? left : layer.align === 'center' ? cx : left + w;
          layer.y = cy - h / 2;
        } else {
          layer.x = Math.round(left);
          layer.y = Math.round(cy - h / 2);
          layer.w = w;
          layer.h = h;
        }
      });
      return;
    }

    if (d.type === 'rotate') {
      const a = (Math.atan2(p.y - d.cy, p.x - d.cx) * 180) / Math.PI;
      let rot = normAngle(d.rot0 + (a - d.a0));
      if (e.shiftKey) rot = Math.round(rot / 15) * 15;
      else if (Math.abs(rot - Math.round(rot / 90) * 90) < 2.5) rot = Math.round(rot / 90) * 90;
      else rot = Math.round(rot);
      state.apply((draft) => {
        const hit = findLayer(draft.layers, d.id);
        if (hit) hit.layer.rot = normAngle(rot);
      });
      return;
    }

    // 자르기: 상자 안에서 이미지만 옮긴다.
    const rad = (d.rot * Math.PI) / 180;
    const dx = p.x - d.sx;
    const dy = p.y - d.sy;
    const lx = dx * Math.cos(rad) + dy * Math.sin(rad);
    const ly = -dx * Math.sin(rad) + dy * Math.cos(rad);
    state.apply((draft) => {
      const hit = findLayer(draft.layers, d.id);
      if (hit && hit.layer.kind === 'image') {
        hit.layer.panX = Math.round(d.panX + (hit.layer.flipH ? -lx : lx));
        hit.layer.panY = Math.round(d.panY + ly);
      }
    });
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const state = useEditor.getState();
    setGuides({ v: [], h: [] });
    if (d.type === 'move' && !d.moved) {
      if (d.clickSelect) state.select(d.clickSelect);
      return;
    }
    state.commit();
  };

  const startHandle = (e: React.PointerEvent, handle: Handle | 'rotate') => {
    if (e.button !== 0 || !single || !singleBox) return;
    e.stopPropagation();
    const state = useEditor.getState();
    const b = singleBox;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const target = viewRef.current!.querySelector('.stage-inner') as HTMLElement;
    target.setPointerCapture(e.pointerId);
    state.begin();
    if (handle === 'rotate') {
      const p = toDoc(e);
      drag.current = {
        type: 'rotate', id: single.id, cx, cy, rot0: b.rot,
        a0: (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI,
      };
      return;
    }
    const rad = (b.rot * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    const lx = (-handle.hx * b.w) / 2;
    const ly = (-handle.hy * b.h) / 2;
    drag.current = {
      type: 'resize', id: single.id, hx: handle.hx, hy: handle.hy,
      ax: cx + lx * ux - ly * uy, ay: cy + lx * uy + ly * ux,
      w0: b.w, h0: b.h, rot: b.rot, size0: single.kind === 'text' ? single.size : 0,
    };
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const state = useEditor.getState();
    const p = toDoc(e);
    const id = hitTest(state.doc, p.x, p.y);
    if (!id) return;
    const layer = findLayer(state.doc.layers, id)!.layer;
    state.select([id]);
    if (layer.kind === 'image') {
      const src = assetSrc(state.doc, layer.slot === 'photo' ? state.doc.content.photo : layer.asset);
      if (getImage(src)) state.set({ cropId: id });
      else window.dispatchEvent(new CustomEvent('jjal:pick-image', { detail: id }));
    } else if (layer.kind === 'text') {
      window.dispatchEvent(new CustomEvent('jjal:focus-text'));
    } else if (layer.kind === 'spec') {
      state.set({ dialog: 'content' });
    }
  };

  // 휠: Ctrl+휠은 화면 확대, 자르기 중에는 이미지 확대.
  useEffect(() => {
    const el = viewRef.current!;
    const onWheel = (e: WheelEvent) => {
      const state = useEditor.getState();
      if (state.cropId) {
        e.preventDefault();
        const id = state.cropId;
        state.apply((draft) => {
          const hit = findLayer(draft.layers, id);
          if (hit && hit.layer.kind === 'image') {
            hit.layer.zoom = Math.max(0.2, Math.min(5, Math.round(hit.layer.zoom * Math.exp(-e.deltaY * 0.0012) * 100) / 100));
          }
        }, `cropzoom:${id}`);
        return;
      }
      if (e.ctrlKey) {
        e.preventDefault();
        const cur = state.zoom === 'fit' ? fit : state.zoom;
        state.set({ zoom: Math.max(0.25, Math.min(4, Math.round(cur * Math.exp(-e.deltaY * 0.0015) * 100) / 100)) });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [fit]);

  const sx = (x: number) => ox + x * z;
  const sy = (y: number) => oy + y * z;

  let gizmo: React.ReactNode = null;
  if (single && singleBox) {
    const pts = boxCorners(singleBox).map(([x, y]) => [sx(x), sy(y)] as [number, number]);
    const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const locked = single.locked;
    const crop = cropId === single.id;
    const handles: { h: Handle; at: [number, number] }[] = [
      { h: { hx: -1, hy: -1 }, at: pts[0] }, { h: { hx: 1, hy: -1 }, at: pts[1] },
      { h: { hx: 1, hy: 1 }, at: pts[2] }, { h: { hx: -1, hy: 1 }, at: pts[3] },
    ];
    if (single.kind !== 'text') {
      handles.push(
        { h: { hx: 0, hy: -1 }, at: mid(pts[0], pts[1]) }, { h: { hx: 1, hy: 0 }, at: mid(pts[1], pts[2]) },
        { h: { hx: 0, hy: 1 }, at: mid(pts[2], pts[3]) }, { h: { hx: -1, hy: 0 }, at: mid(pts[3], pts[0]) },
      );
    }
    const top = mid(pts[0], pts[1]);
    const rad = (singleBox.rot * Math.PI) / 180;
    const knob: [number, number] = [top[0] + Math.sin(rad) * (14 + grip), top[1] - Math.cos(rad) * (14 + grip)];
    gizmo = (
      <g>
        <polygon
          points={pts.map((p) => p.join(',')).join(' ')}
          className={`sel-box${locked ? ' locked' : ''}${crop ? ' crop' : ''}`}
        />
        {!locked && !crop && (
          <>
            <line x1={top[0]} y1={top[1]} x2={knob[0]} y2={knob[1]} className="sel-stem" />
            <circle cx={knob[0]} cy={knob[1]} r={grip * 0.6} className="sel-rotate" onPointerDown={(e) => startHandle(e, 'rotate')}>
              <title>끌어서 회전 (Shift: 15°씩)</title>
            </circle>
            {handles.map(({ h, at }) => (
              <rect
                key={`${h.hx}${h.hy}`} x={at[0] - grip / 2} y={at[1] - grip / 2} width={grip} height={grip} className="sel-handle"
                style={{ cursor: h.hx === 0 ? 'ns-resize' : h.hy === 0 ? 'ew-resize' : h.hx === h.hy ? 'nwse-resize' : 'nesw-resize' }}
                onPointerDown={(e) => startHandle(e, h)}
              />
            ))}
          </>
        )}
      </g>
    );
  } else if (multiRect) {
    gizmo = (
      <rect
        x={sx(multiRect.x)} y={sy(multiRect.y)} width={multiRect.w * z} height={multiRect.h * z}
        className="sel-box multi"
      />
    );
  }

  return (
    <div className="stage" ref={viewRef} style={board ? { background: board } : undefined}>
      <div
        className="stage-inner"
        style={{ width: innerW, height: innerH }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <div className={`canvas-wrap${board ? ' board' : ''}`} style={{ left: ox, top: oy, width: cw, height: ch, ...(board ? { background: board } : {}) }}>
          <canvas ref={canvasRef} style={{ width: cw, height: ch }} />
        </div>
        <svg className="overlay" width={innerW} height={innerH}>
          {guides.v.map((x) => <line key={`v${x}`} x1={sx(x)} x2={sx(x)} y1={0} y2={innerH} className="guide" />)}
          {guides.h.map((y) => <line key={`h${y}`} y1={sy(y)} y2={sy(y)} x1={0} x2={innerW} className="guide" />)}
          {gizmo}
        </svg>
      </div>
      {cropId && (
        <div className="stage-hint">
          자르기 중 — 끌어서 사진 위치, 휠로 확대 · <b>Enter</b> 또는 바깥 클릭으로 완료
        </div>
      )}
    </div>
  );
}

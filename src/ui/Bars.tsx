import { useEffect, useRef, useState } from 'react';
import { addEffect, addEmoji, addImageFromFile, addShapeKit, addSpec, addText, pickFile, SHAPE_KITS } from '../editor/actions';
import { exportFile, importFile, newDesign, saveCurrent } from '../editor/session';
import { isDirty, useEditor } from '../editor/store';
import { EFFECTS } from '../model/factory';
import { hasMotion } from '../model/ops';
import type { EffectType } from '../model/types';

function Menu({ label, title, children, className }: { label: React.ReactNode; title?: string; children: (close: () => void) => React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [open]);
  return (
    <div className={`menu ${className ?? ''}`} ref={ref}>
      <button type="button" className={open ? 'on' : ''} title={title} onClick={() => setOpen(!open)}>{label}</button>
      {open && <div className="menu-pop">{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function TopBar() {
  const name = useEditor((s) => s.doc.name);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const dirty = useEditor(isDirty);
  const zoom = useEditor((s) => s.zoom);
  const playing = useEditor((s) => s.playing);
  const motion = useEditor((s) => hasMotion(s.doc));
  const st = useEditor.getState;
  const open = (dialog: 'presets' | 'backgrounds' | 'content' | 'designs' | 'export' | 'savePreset') => st().set({ dialog });

  const zoomBy = (k: number) => {
    const cur = zoom === 'fit' ? 1 : zoom;
    st().set({ zoom: Math.max(0.25, Math.min(4, Math.round(cur * k * 100) / 100)) });
  };

  return (
    <header className="topbar">
      <div className="brand">자짤 스튜디오</div>
      <Menu label="파일 ▾">
        {(close) => (
          <>
            <button type="button" onClick={() => { close(); newDesign(); }}>새로 만들기</button>
            <button type="button" onClick={() => { close(); void saveCurrent(); }}>저장 <kbd>Ctrl+S</kbd></button>
            <button type="button" onClick={() => { close(); void saveCurrent(true); }}>새 이름으로 저장</button>
            <button type="button" onClick={() => { close(); open('designs'); }}>내 디자인…</button>
            <hr />
            <button type="button" onClick={() => { close(); open('savePreset'); }}>지금 디자인을 프리셋으로 저장</button>
            <hr />
            <button type="button" onClick={() => { close(); exportFile(); }}>파일로 백업 (.jjal)</button>
            <button type="button" onClick={() => { close(); void importFile(); }}>백업 파일 열기…</button>
          </>
        )}
      </Menu>
      <button type="button" className="icon-btn" disabled={!canUndo} title="실행 취소 (Ctrl+Z)" onClick={() => st().undo()}>↶</button>
      <button type="button" className="icon-btn" disabled={!canRedo} title="다시 실행 (Ctrl+Y)" onClick={() => st().redo()}>↷</button>
      <input
        className="doc-name" type="text" placeholder="디자인 이름" value={name}
        onChange={(e) => st().apply((d) => { d.name = e.target.value; }, 'docname')}
      />
      <span className={`save-state${dirty ? ' dirty' : ''}`}>{dirty ? '● 저장 안 됨' : '저장됨'}</span>
      <div className="spacer" />
      <button type="button" title="카드 크기·모서리·테두리·장식 선 (아무것도 선택하지 않으면 오른쪽에 나옵니다)" onClick={() => { st().select([]); st().set({ cropId: null }); }}>카드·테두리</button>
      <button type="button" onClick={() => open('content')}>내용</button>
      <button type="button" onClick={() => open('presets')}>프리셋</button>
      <button type="button" onClick={() => open('backgrounds')}>배경</button>
      <div className="sep" />
      {motion && (
        <button type="button" title="움직임 미리보기 재생/정지" onClick={() => st().set({ playing: !playing })}>
          {playing ? '❚❚ 정지' : '▶ 재생'}
        </button>
      )}
      <div className="zoom">
        <button type="button" className="icon-btn" title="축소" onClick={() => zoomBy(1 / 1.25)}>−</button>
        <button type="button" title="화면에 맞춤" className={zoom === 'fit' ? 'on' : ''} onClick={() => st().set({ zoom: 'fit' })}>
          {zoom === 'fit' ? '맞춤' : `${Math.round(zoom * 100)}%`}
        </button>
        <button type="button" className="icon-btn" title="확대" onClick={() => zoomBy(1.25)}>+</button>
      </div>
      <button type="button" className="primary" title="PNG · WebP로 저장 (Ctrl+E)" onClick={() => open('export')}>내보내기</button>
    </header>
  );
}

const EMOJI: { name: string; items: string }[] = [
  { name: '표정', items: '😀 😁 😂 🤣 😊 😍 🥰 😎 🤔 😴 😭 😡 🥺 😱 🤯 😇 🤗 😏 🙃 😋 🤤 🥹 😤 🫠 💀 👻 🤖 👽 😺 😻' },
  { name: '손·사람', items: '👍 👎 👏 🙏 ✌️ 🤞 🤘 👌 💪 👀 🫶 🤝 ✋ 👉 👈 🙌 🧑‍💻 🎮 🕹️ 🎧' },
  { name: '하트·별', items: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💖 💕 💘 💔 ⭐ 🌟 ✨ 💫 🔥 ⚡ 💥 🌈 ☀️ 🌙 ❄️ 🌸 🍀 🎀 🎉 🎊 💎 👑' },
  { name: '동물·음식', items: '🐱 🐶 🐰 🦊 🐻 🐼 🐧 🐥 🦄 🐉 🐟 🦋 🍰 🍩 🍪 🍕 🍔 🍜 ☕ 🍺' },
  { name: 'PC·사물', items: '💻 🖥️ ⌨️ 🖱️ 💾 📱 🔋 🔌 💡 🔧 ⚙️ 🧊 🚀 🏆 🎯 📌 🔒 ⏰ 📷 🎵' },
  { name: '기호 (색 적용)', items: '★ ☆ ♥ ♡ ♪ ♬ ✿ ❀ ✦ ✧ ◆ ◇ ● ○ ■ □ ▲ ▼ ◀ ▶ → ← ↑ ↓ ※ ♨ ☾ ☁ ✚ ✔ ✖ ∞ ♠ ♣' },
];

export function AddBar() {
  const [emojiTab, setEmojiTab] = useState(0);
  const areaFx = (Object.entries(EFFECTS) as [EffectType, (typeof EFFECTS)[EffectType]][]).filter(([, m]) => !m.border);
  const borderFx = (Object.entries(EFFECTS) as [EffectType, (typeof EFFECTS)[EffectType]][]).filter(([, m]) => m.border);
  return (
    <aside className="addbar">
      <span className="addbar-title">추가</span>
      <button type="button" onClick={addText} title="텍스트 레이어 추가"><b>T</b><span>텍스트</span></button>
      <button
        type="button" title="이미지 레이어 추가 (파일을 창에 끌어다 놓아도 됩니다)"
        onClick={async () => { const f = await pickFile('image/*'); if (f) await addImageFromFile(f); }}
      ><b>🖼</b><span>이미지</span></button>
      <button type="button" onClick={addSpec} title="사양 목록 레이어 추가"><b>☰</b><span>사양</span></button>
      <Menu label={<><b>▢</b><span>패널·도형</span></>} title="패널, 띠, 무늬, 도형 추가" className="flyout">
        {(close) => (
          <div className="kit-list">
            {SHAPE_KITS.map((k) => (
              <button type="button" key={k.id} onClick={() => { close(); addShapeKit(k.id); }}>
                <i>{k.icon}</i><span>{k.name}</span>{k.hint && <small>{k.hint}</small>}
              </button>
            ))}
            <p className="note">추가한 뒤 속성의 “모양·채움”에서 모양과 무늬를 바꿀 수 있습니다.</p>
          </div>
        )}
      </Menu>
      <Menu label={<><b>😊</b><span>이모티콘</span></>} title="이모티콘·기호 추가" className="flyout">
        {(close) => (
          <div className="emoji-pop">
            <div className="chips">
              {EMOJI.map((g, i) => (
                <button type="button" key={g.name} className={i === emojiTab ? 'on' : ''} onClick={() => setEmojiTab(i)}>{g.name}</button>
              ))}
            </div>
            <div className="emoji-grid">
              {EMOJI[emojiTab].items.split(' ').map((ch) => (
                <button type="button" key={ch} onClick={() => { close(); addEmoji(ch); }}>{ch}</button>
              ))}
            </div>
            <p className="note">텍스트 레이어로 들어갑니다. 닉네임 같은 문구 안에 직접 입력해도 됩니다(Win + . 키).</p>
          </div>
        )}
      </Menu>
      <Menu label={<><b>✦</b><span>효과</span></>} title="움직이는 효과 레이어 추가" className="flyout">
        {(close) => (
          <div className="fx-pop">
            <h5>배경 효과</h5>
            <div className="fx-grid">
              {areaFx.map(([type, m]) => <button type="button" key={type} onClick={() => { close(); addEffect(type); }}>{m.label}</button>)}
            </div>
            <h5>테두리 효과</h5>
            <div className="fx-grid">
              {borderFx.map(([type, m]) => <button type="button" key={type} onClick={() => { close(); addEffect(type); }}>{m.label}</button>)}
            </div>
            <p className="note">효과도 레이어입니다. 레이어 패널에서 끌어 사진 앞뒤로 옮길 수 있습니다.</p>
          </div>
        )}
      </Menu>
    </aside>
  );
}

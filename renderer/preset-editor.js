'use strict';

// UI preference is deliberately kept out of the saved card and undo signature.
window.createPresetEditor = (bridge) => {
  const P = window.SpecCardPresets;
  const $ = (id) => document.getElementById(id);
  const root = document.createElement('div');
  root.id = 'preset-workbench';
  root.innerHTML = `
    <div class="creation-mode" role="group" aria-label="만드는 방법">
      <button id="pe-mode-preset" aria-pressed="true">프리셋으로 만들기</button>
      <button id="pe-mode-direct" aria-pressed="false">직접 만들기</button>
    </div>
    <div id="pe-easy">
      <section class="pe-intro"><div class="pe-eyebrow">SAMPLE COLLECTION <span>18</span></div>
        <div class="pe-heading"><h2>나만의 카드, 간단하게</h2><button id="pe-browse" class="ghost">샘플 고르기</button></div>
        <p id="pe-current" aria-live="polite">마음에 드는 샘플을 선택해 시작하세요.</p>
      </section>
      <div id="pe-empty-note" class="pe-note">샘플을 적용하면 아래에서 닉네임·사양·이미지를 바꿀 수 있습니다. 기존 디자인도 직접 만들기에서 계속 편집할 수 있습니다.</div>
      <div id="pe-form" hidden>
        <section class="pe-section"><h3>01 <span>닉네임</span></h3>
          <label for="pe-nickname">카드에 표시할 이름</label><input id="pe-nickname" type="text" maxlength="100" placeholder="닉네임을 입력하세요" autocomplete="off" />
          <label class="chk"><input id="pe-nickname-visible" type="checkbox" checked /> 닉네임 표시</label>
          <p class="hint">이름의 위치는 샘플마다 다릅니다. 패널 안 제목·서명을 숨기면 사양이 그 공간을 사용합니다.</p>
        </section>
        <section class="pe-section"><h3>02 <span>사양</span></h3><div id="pe-spec-slot"></div>
          <p id="pe-row-note" class="hint"></p>
          <div id="pe-overflow" class="pe-note" hidden><p id="pe-overflow-text"></p><button id="pe-grow">카드 높이 +50px</button></div>
        </section>
        <section class="pe-section"><h3>03 <span>이미지</span></h3>
          <div class="row-btns"><button id="pe-image" class="primary">이미지 넣기</button><button id="pe-image-clear">제거</button><button id="pe-image-paste">붙여넣기</button></div>
          <p id="pe-image-status" class="hint">이미지 자리 표시는 저장된 결과에 포함되지 않습니다.</p>
          <label>이미지 맞춤<select id="pe-fit"><option value="contain">전체 보이기</option><option value="cover">빈틈없이 채우기</option></select></label>
          <label>이미지 확대 <input id="pe-image-scale" type="range" min="0.1" max="4" step="0.05" /></label>
          <div class="control-grid two"><label>가로 위치<input id="pe-image-x" type="number" min="-2400" max="2400" step="5" /></label><label>세로 위치<input id="pe-image-y" type="number" min="-1200" max="1200" step="5" /></label></div>
          <button id="pe-image-center" class="ghost full">이미지 위치·확대 초기화</button>
        </section>
        <details class="pe-section" open><summary>04 <span>색상과 글자</span></summary>
          <div class="pe-colors">
            <label>배경<input id="pe-bg" type="color" /></label><label>배경 끝<input id="pe-bg2" type="color" /></label>
            <label>사양 패널<input id="pe-panel" type="color" /></label><label>포인트<input id="pe-accent" type="color" /></label>
            <label>사양 글자<input id="pe-ink" type="color" /></label><label>닉네임<input id="pe-nick-color" type="color" /></label>
          </div>
          <label>글꼴<select id="pe-font"></select></label>
          <p class="hint">나눔고딕은 앱·웹에 포함되어 별도 설치가 필요 없습니다. 다른 글꼴은 기기마다 다를 수 있습니다.</p>
          <div class="control-grid two"><label>사양 크기<input id="pe-size" type="number" min="16" max="40" /></label><label>닉네임 크기<input id="pe-nick-size" type="number" min="16" max="60" /></label></div>
          <p id="pe-font-note" class="hint"></p>
        </details>
        <details class="pe-section" open><summary>05 <span>배치와 효과</span></summary>
          <label>사양 위치<select id="pe-side"><option value="left">왼쪽</option><option value="right">오른쪽</option></select></label>
          <p class="hint">선택한 디자인을 유지하며 사양·이미지와 연결된 요소를 이동합니다. 다른 디자인은 샘플 고르기에서 선택하세요.</p>
          <label id="pe-strength-control">샘플 효과 강도<input id="pe-strength" type="range" min="0" max="100" step="5" /></label>
          <label id="pe-motion-control" class="chk"><input id="pe-motion" type="checkbox" /> 샘플 움직임 효과</label>
          <p id="pe-effect-note" class="hint"></p>
        </details>
        <button id="pe-detail" class="ghost full">현재 디자인 그대로 세부 조정하기 →</button>
      </div>
    </div>`;
  document.querySelector('.task-switcher').before(root);
  const group = $('grp-spec'), home = document.createComment('shared spec editor home');
  group.before(home);
  const icons = group.querySelector('.spec-icon-settings'), iconHome = document.createComment('shared icon settings home');
  icons.before(iconHome);
  const iconDetails = document.createElement('details'); iconDetails.className = 'pe-icon-options';
  const iconSummary = document.createElement('summary'); iconSummary.textContent = '아이콘 표시·모양·크기';
  iconDetails.append(iconSummary);
  const dialog = document.createElement('dialog');
  dialog.id = 'pe-gallery';
  dialog.setAttribute('aria-labelledby', 'pe-gallery-title');
  dialog.innerHTML = `<div class="pe-gallery-head"><div><span class="pe-eyebrow">18 SAMPLE PRESETS</span><h2 id="pe-gallery-title">샘플 프리셋 고르기</h2></div><button id="pe-close" aria-label="샘플 선택 닫기">닫기</button></div>
    <div class="pe-gallery-body"><div class="pe-catalog" role="group" aria-label="샘플 목록"></div>
      <section class="pe-preview"><h3 id="pe-preview-name"></h3><div id="pe-preview-mount"></div>
        <div class="pe-preview-motion-row"><span id="pe-motion-badge"></span><button id="pe-preview-motion" class="ghost" hidden aria-pressed="false">미리보기 재생</button></div>
        <p id="pe-preview-note"></p><p class="hint">현재 사양·닉네임·이미지로 보는 적용 전 미리보기입니다. 비어 있는 내용에는 예시를 보여줍니다.</p>
        <p class="hint">적용하면 850×300 기본 배치와 스타일로 바뀝니다. 입력 내용과 추가한 텍스트·스티커는 보존됩니다. 실행 취소로 되돌릴 수 있습니다.</p>
        <p id="pe-preview-warning" class="pe-note" hidden></p><button id="pe-apply" class="primary full">이 프리셋 적용</button>
      </section></div>`;
  document.body.append(dialog);
  let mode = 'preset', candidate = P.CATALOG[0].id, galleryReady = false, lastFont = null;
  let previewRenderer = null, previewFrame = 0, previewPlaying = false, previewTime = 0, previewLastTime = 0;
  try { if (localStorage.getItem('speccard-creation-mode') === 'direct') mode = 'direct'; } catch (_) { /* optional preference */ }

  function setMode(next) {
    mode = next === 'direct' ? 'direct' : 'preset';
    const easy = mode === 'preset';
    document.body.classList.toggle('preset-mode', easy);
    $('pe-easy').hidden = !easy;
    $('pe-mode-preset').setAttribute('aria-pressed', String(easy));
    $('pe-mode-direct').setAttribute('aria-pressed', String(!easy));
    if (easy) $('pe-spec-slot').append(group);
    else home.after(group);
    if (easy) { iconHome.after(iconDetails); iconDetails.append(icons); }
    else { iconHome.after(icons); iconDetails.remove(); }
    group.open = true;
    bridge.clearSelection();
    try { localStorage.setItem('speccard-creation-mode', mode); } catch (_) { /* optional preference */ }
    sync();
    bridge.redraw();
  }
  const safe = (action) => { try { action(); } catch (error) { bridge.notify(error.message); } };
  const edit = (fn, atomic = false) => safe(() => bridge.edit(fn, atomic));
  const val = (id, value) => { if (document.activeElement !== $(id)) $(id).value = value ?? ''; };
  const checked = (id, value) => { $(id).checked = !!value; };
  const on = (id, event, fn) => { $(id).addEventListener(event, fn); };
  const control = (id, fn, event = 'input') => on(id, event, (e) => edit((s) => fn(s, e.target)));

  function sync() {
    const s = bridge.state(), preset = P.find(s.preset?.id), settings = P.settings(s), nick = P.nickname(s);
    $('pe-form').hidden = !preset;
    $('pe-empty-note').hidden = !!preset;
    $('pe-current').textContent = preset ? `${P.label(s)} · 현재 편집값 유지` : '마음에 드는 샘플을 선택해 시작하세요.';
    if (!preset) return;
    val('pe-nickname', nick?.text);
    checked('pe-nickname-visible', nick && nick.presetVisible !== false);
    val('pe-side', P.sideOf(s));
    $('pe-row-note').textContent = `${s.text.columns === 2 ? '직접 조정한 2열 배치를 유지합니다.' : '사양은 1열입니다.'} ${s.text.hideEmptyRows ? '값이 빈 행은 카드에 표시하지 않습니다.' : '빈 행도 표시하도록 직접 설정되어 있습니다.'}`;
    for (const [id, value] of Object.entries({ 'pe-bg': s.card.bg1, 'pe-bg2': s.card.bg2,
      'pe-panel': s.specPanel.fill, 'pe-accent': s.text.labelColor, 'pe-ink': s.text.valueColor,
      'pe-nick-color': nick?.color, 'pe-size': s.text.fontSize, 'pe-nick-size': nick?.size,
      'pe-image-scale': s.image.scale, 'pe-image-x': s.image.x, 'pe-image-y': s.image.y,
      'pe-strength': s.preset.effectStrength })) val(id, value);
    if (!Array.from($('pe-fit').options).some((o) => o.value === s.image.fit)) {
      const o = document.createElement('option'); o.value = s.image.fit; o.textContent = '직접 조정한 맞춤'; $('pe-fit').append(o);
    }
    val('pe-fit', s.image.fit);
    if (lastFont !== s.text.fontFamily) { bridge.fontOptions($('pe-font'), s.text.fontFamily); lastFont = s.text.fontFamily; }
    checked('pe-motion', s.fxs.some((f) => f.presetOwner === P.OWNER && f.enabled !== false));
    $('pe-motion-control').hidden = !settings.motion;
    $('pe-strength-control').hidden = !(settings.shade || settings.glow || settings.deco || settings.pattern || settings.motion);
    $('pe-effect-note').textContent = settings.motion ? '이 샘플에는 움직임이 포함됩니다. 켜고 끌 수 있으며, 움직이는 결과는 WebP로 저장하세요.'
      : '추가 효과와 세부 모양은 직접 만들기에서 조절할 수 있습니다.';
    $('pe-image-clear').disabled = !s.image.dataUrl;
    $('pe-image-status').textContent = s.image.dataUrl ? '이미지가 들어 있습니다. 아래에서 맞춤·위치·확대를 조절하세요.' : '이미지 자리 표시는 저장된 결과에 포함되지 않습니다.';
    const info = bridge.layout();
    $('pe-overflow').hidden = !info.issues.length;
    $('pe-overflow-text').textContent = info.issues.join(' ') + ' 높이를 늘리거나 직접 만들기에서 패널을 조절하세요.';
    $('pe-grow').disabled = s.card.height >= 1200;
    $('pe-font-note').textContent = info.fontSize ? `자동 맞춤: 현재 ${info.fontSize}px · 기본 ${s.text.fontSize}px (최소 ${s.text.minFontSize || 8}px)` : '';
    bridge.rangeNumbers();
  }

  function stopPreview() {
    cancelAnimationFrame(previewFrame); previewFrame = 0; previewPlaying = false;
    $('pe-preview-motion').setAttribute('aria-pressed', 'false');
    $('pe-preview-motion').textContent = '미리보기 재생';
  }

  function playPreview() {
    if (!previewRenderer?.animated) return;
    previewPlaying = true; previewLastTime = performance.now();
    $('pe-preview-motion').setAttribute('aria-pressed', 'true');
    $('pe-preview-motion').textContent = '미리보기 일시정지';
    const frame = (now) => {
      if (!dialog.open || !previewPlaying) return;
      if (!document.hidden && now - previewLastTime >= 66) {
        previewTime += Math.min(100, now - previewLastTime);
        previewRenderer.draw(previewTime); previewLastTime = now;
      } else if (document.hidden) previewLastTime = now;
      previewFrame = requestAnimationFrame(frame);
    };
    previewFrame = requestAnimationFrame(frame);
  }

  function preview(id) {
    stopPreview(); previewRenderer = null; previewTime = 0;
    candidate = id;
    const p = P.find(id);
    $('pe-preview-name').textContent = p.label;
    $('pe-preview-note').textContent = p.note;
    $('pe-motion-badge').textContent = p.motion ? '움직임 기본 포함' : '정지 구성';
    $('pe-preview-motion').hidden = true;
    dialog.querySelectorAll('[data-preset-id]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.presetId === id)));
    try {
      const result = bridge.preview(id, false);
      previewRenderer = result;
      result.canvas.id = 'pe-preview-image'; result.canvas.setAttribute('role', 'img');
      result.canvas.setAttribute('aria-label', '선택한 샘플의 카드 미리보기');
      $('pe-preview-mount').replaceChildren(result.canvas);
      $('pe-preview-warning').hidden = !result.issues.length;
      $('pe-preview-warning').textContent = result.issues.join(' ');
      $('pe-apply').disabled = false;
      $('pe-preview-motion').hidden = !result.animated;
      if (result.animated && !matchMedia('(prefers-reduced-motion: reduce)').matches) playPreview();
    } catch (error) {
      $('pe-preview-mount').replaceChildren();
      $('pe-preview-warning').hidden = false;
      $('pe-preview-warning').textContent = error.message;
      $('pe-apply').disabled = true;
    }
  }

  function browse() {
    if (!galleryReady) {
      const list = dialog.querySelector('.pe-catalog');
      for (const p of P.CATALOG) {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.presetId = p.id; b.className = 'pe-sample'; b.setAttribute('aria-pressed', 'false');
        const image = document.createElement('img'); image.alt = ''; image.width = 340; image.height = 120;
        image.src = bridge.preview(p.id, true).url;
        const name = document.createElement('span'); name.textContent = p.label;
        const features = document.createElement('small');
        features.textContent = `${p.icons ? ({ mono: '단색', color: '컬러', pixel: '픽셀' }[p.icons] + ' 아이콘') : '아이콘 없음'} · ${p.motion ? '움직임 포함' : '정지'}`;
        b.append(image, name, features); b.addEventListener('click', () => preview(p.id)); list.append(b);
      }
      galleryReady = true;
    }
    preview(P.find(bridge.state().preset?.id)?.id || candidate);
    dialog.showModal();
    $('pe-close').focus();
  }

  on('pe-mode-preset', 'click', () => setMode('preset'));
  on('pe-mode-direct', 'click', () => setMode('direct'));
  on('pe-detail', 'click', () => setMode('direct'));
  on('pe-browse', 'click', () => safe(browse));
  on('pe-close', 'click', () => dialog.close());
  dialog.addEventListener('close', () => { stopPreview(); previewRenderer = null; $('pe-preview-mount').replaceChildren(); });
  on('pe-preview-motion', 'click', () => { if (previewPlaying) stopPreview(); else playPreview(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  on('pe-apply', 'click', () => safe(() => { bridge.apply(candidate); dialog.close(); $('pe-nickname').focus(); }));
  control('pe-nickname', (s, el) => { bridge.nickname(s).text = el.value; });
  control('pe-nickname-visible', (s, el) => { bridge.nickname(s).presetVisible = el.checked; }, 'change');
  on('pe-side', 'change', (e) => edit((s) => P.setSide(s, e.target.value), true));
  on('pe-grow', 'click', () => edit((s) => P.grow(s, 50), true));
  on('pe-image', 'click', () => $('btn-image').click());
  on('pe-image-clear', 'click', () => $('btn-image-clear').click());
  on('pe-image-paste', 'click', () => $('btn-paste-image').click());
  on('pe-image-center', 'click', () => edit((s) => { Object.assign(s.image, { x: 0, y: 0, scale: 1 }); }, true));
  control('pe-fit', (s, el) => { Object.assign(s.image, { fit: el.value, x: 0, y: 0 }); }, 'change');
  for (const [id, key, min, max] of [['pe-image-scale', 'scale', 0.1, 4], ['pe-image-x', 'x', -2400, 2400], ['pe-image-y', 'y', -1200, 1200]]) {
    control(id, (s, el) => { if (el.value !== '') s.image[key] = Math.max(min, Math.min(max, Number(el.value))); });
  }
  control('pe-bg', (s, el) => { s.card.bg1 = el.value; if (s.card.bgStyle === 'solid') s.card.bg2 = el.value; });
  control('pe-bg2', (s, el) => { s.card.bg2 = el.value; s.card.bgStyle = 'gradient'; });
  control('pe-panel', (s, el) => { s.specPanel.fill = el.value; });
  control('pe-accent', (s, el) => P.setAccent(s, el.value));
  control('pe-ink', (s, el) => { s.text.valueColor = el.value; s.text.uniform = true; });
  control('pe-nick-color', (s, el) => { const n = P.nickname(s); if (n) n.color = el.value; });
  control('pe-font', (s, el) => { s.text.fontFamily = el.value; const n = P.nickname(s); if (n) n.fontFamily = el.value; }, 'change');
  control('pe-size', (s, el) => { if (el.value) s.text.fontSize = Math.max(16, Math.min(40, Number(el.value))); });
  control('pe-nick-size', (s, el) => { if (el.value) P.setNicknameSize(s, el.value); });
  control('pe-strength', (s, el) => P.setStrength(s, el.value));
  control('pe-motion', (s, el) => P.setMotion(s, el.checked), 'change');

  return { sync, start: () => setMode(mode), isPresetMode: () => mode === 'preset',
    documentLoaded: () => { if (!P.find(bridge.state().preset?.id)) setMode('direct'); else sync(); } };
};

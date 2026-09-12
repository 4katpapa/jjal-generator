'use strict';

window.BackgroundPresetUI = (() => {
  let dialog;
  let session = 0;
  let refreshId = 0;
  let gridId = 0;
  let snapshot;
  let selected = null;
  let onApply;
  let opener;
  let unsubscribe;
  let observer;
  let busy = false;
  let needsRefresh = false;
  let queue = [];
  let activeThumbnails = 0;
  let lastAppliedId = null;
  const el = (id) => document.getElementById(`bgl-${id}`);
  const errorText = (error) => String(error?.message || error).replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '');
  const status = (text) => { el('status').textContent = text; };

  function setBusy(value) {
    busy = value;
    for (const id of ['choose', 'default', 'open', 'refresh', 'search', 'category', 'source']) el(id).disabled = value;
    el('apply').disabled = value || !selected;
    el('random').disabled = value || !filteredItems().length;
    dialog.setAttribute('aria-busy', String(value));
  }

  function create() {
    dialog = document.createElement('dialog');
    dialog.id = 'background-library-dialog';
    dialog.className = 'background-library';
    dialog.setAttribute('aria-labelledby', 'bgl-title');
    dialog.innerHTML = `
      <header class="bgl-head"><div><span class="task-kicker">BACKGROUND LIBRARY</span><h2 id="bgl-title">배경 프리셋</h2></div><button id="bgl-close" class="icon-btn" aria-label="배경 프리셋 닫기">✕</button></header>
      <section class="bgl-folder" aria-label="이미지 폴더">
        <p id="bgl-root"></p>
        <div class="bgl-actions"><button id="bgl-choose">폴더 선택</button><button id="bgl-open">폴더 열기</button><button id="bgl-refresh">새로고침</button><button id="bgl-default" class="ghost">기본 폴더로</button></div>
        <p id="bgl-help" class="hint">내장 배경은 바로 사용할 수 있습니다. 개인 이미지는 위 폴더에 넣으세요. PNG · JPG · JPEG · WebP와 하위 폴더를 인식합니다.</p>
      </section>
      <div class="bgl-filters"><label>검색<input id="bgl-search" type="search" placeholder="파일 이름 또는 주제" autocomplete="off" /></label><label>배경<select id="bgl-source"><option value="">전체 배경</option><option value="builtin">내장 배경</option><option value="external">개인 배경</option></select></label><label>분류<select id="bgl-category"><option value="">전체 분류</option></select></label><span id="bgl-count" role="status"></span></div>
      <p id="bgl-status" class="bgl-status" role="status" aria-live="polite"></p>
      <div id="bgl-scroll" class="bgl-scroll"><div id="bgl-grid" class="bgl-grid" aria-label="배경 이미지 목록"></div><p id="bgl-empty" class="bgl-empty" hidden></p></div>
      <footer class="bgl-footer"><div><strong id="bgl-selected">이미지를 선택하세요.</strong><p class="hint">랜덤 적용은 현재 목록에서 고릅니다. 배경은 디자인과 함께 저장됩니다.</p></div><div class="bgl-footer-actions"><button id="bgl-random" title="현재 검색·분류한 목록에서 무작위 배경을 바로 적용합니다." disabled>랜덤 배경 적용</button><button id="bgl-apply" class="primary" disabled>배경으로 적용</button></div></footer>`;
    document.body.append(dialog);
    dialog.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
    });
    dialog.addEventListener('keyup', (event) => event.stopPropagation());
    dialog.addEventListener('close', () => {
      session++; refreshId++; gridId++;
      observer?.disconnect(); queue = [];
      unsubscribe?.(); unsubscribe = null;
      window.removeEventListener('focus', autoRefresh);
      onApply = null;
      busy = false;
      opener?.focus();
    });
    el('close').onclick = () => dialog.close();
    el('search').oninput = renderGrid;
    el('category').onchange = renderGrid;
    el('source').onchange = renderGrid;
    el('refresh').onclick = () => refresh();
    el('choose').onclick = () => refresh(() => window.api.chooseBackgroundFolder());
    el('default').onclick = () => refresh(() => window.api.defaultBackgroundFolder());
    el('open').onclick = () => refresh(() => window.api.openBackgroundFolder());
    el('apply').onclick = () => apply(false);
    el('random').onclick = () => apply(true);
  }

  async function refresh(loader = () => window.api.listBackgrounds()) {
    if (!dialog.open) return;
    if (busy) { needsRefresh = true; return; }
    const current = session;
    const request = ++refreshId;
    setBusy(true); status('이미지 목록을 읽는 중…');
    try {
      const next = await loader();
      if (!dialog.open || current !== session || request !== refreshId) return;
      if (next) {
        snapshot = next;
        el('root').textContent = `${next.isDefault ? '기본 개인 폴더' : '선택한 개인 폴더'} · ${next.root}`;
        el('root').title = next.root;
        el('help').textContent = `내장 배경 ${next.bundledCount || 0}장은 바로 사용할 수 있습니다. 개인 이미지는 위 폴더에 넣으세요. PNG · JPG · JPEG · WebP와 하위 폴더를 인식합니다.`;
        const category = el('category').value;
        el('category').replaceChildren(new Option('전체 분류', ''));
        for (const name of [...new Set(next.items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))) {
          el('category').add(new Option(name, name));
        }
        el('category').value = [...el('category').options].some((o) => o.value === category) ? category : '';
        if (!next.items.some((item) => item.id === selected)) selected = null;
        renderGrid();
      }
      status(snapshot?.message || '이미지를 선택한 뒤 배경으로 적용하세요.');
    } catch (error) {
      status(errorText(error));
    } finally {
      if (dialog.open && current === session && request === refreshId) {
        setBusy(false);
        if (document.activeElement === dialog) el('search').focus();
        if (needsRefresh) { needsRefresh = false; void refresh(); }
      }
    }
  }

  function autoRefresh() {
    if (busy) needsRefresh = true;
    else void refresh();
  }

  function filteredItems() {
    if (!snapshot) return [];
    const query = el('search').value.trim().toLocaleLowerCase('ko');
    const category = el('category').value;
    const source = el('source').value;
    return snapshot.items.filter((item) => (!source || item.source === source) && (!category || item.category === category)
      && `${item.name} ${item.category}`.toLocaleLowerCase('ko').includes(query));
  }

  function renderGrid() {
    if (!snapshot) return;
    const generation = ++gridId;
    observer?.disconnect(); queue = [];
    const items = filteredItems();
    if (!items.some((item) => item.id === selected)) selected = null;
    el('count').textContent = `${items.length} / ${snapshot.items.length}장`;
    const grid = el('grid');
    grid.replaceChildren();
    el('empty').hidden = items.length > 0;
    el('empty').textContent = el('source').value === 'external' && !snapshot.items.some((i) => i.source === 'external')
      ? '개인 배경이 없습니다. 폴더 열기로 위치를 확인해 이미지를 넣거나, 폴더 선택으로 다른 폴더를 지정하세요.'
      : snapshot.status === 'missing'
      ? (snapshot.isDefault ? '폴더 열기를 눌러 기본 폴더를 만든 뒤 이미지를 넣거나, 다운로드한 Backgrounds 폴더를 선택하세요.' : '선택했던 폴더를 찾을 수 없습니다. 폴더 선택으로 현재 이미지 폴더를 지정하세요.')
      : snapshot.status === 'error' ? snapshot.message
        : snapshot.items.length ? '검색 결과가 없습니다. 검색어나 분류를 바꿔 보세요.'
          : '배경 이미지가 없습니다. 폴더에 이미지를 넣으면 목록에 나타납니다.';
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        queue.push({ button: entry.target, item: entry.target._item, token: snapshot.token, generation });
      }
      drain();
    }, { root: el('scroll'), rootMargin: '120px' });
    for (const item of items) {
      const button = document.createElement('button');
      button.className = 'bgl-tile';
      button.dataset.id = item.id;
      button._item = item;
      button.setAttribute('aria-pressed', String(selected === item.id));
      const frame = document.createElement('div');
      frame.className = 'bgl-thumbnail';
      frame.textContent = '미리보기';
      const name = document.createElement('strong');
      name.textContent = item.name;
      const detail = document.createElement('small');
      detail.textContent = `${item.source === 'builtin' ? '내장' : '개인'} · ${item.category} · ${(item.bytes / 1048576).toFixed(1)}MB`;
      button.title = item.file;
      button.append(frame, name, detail);
      button.onclick = () => {
        if (busy) return;
        selected = item.id;
        for (const tile of grid.children) tile.setAttribute('aria-pressed', String(tile === button));
        updateSelection();
      };
      grid.append(button);
      observer.observe(button);
    }
    updateSelection();
  }

  function updateSelection() {
    const item = snapshot?.items.find((x) => x.id === selected);
    el('selected').textContent = item ? item.name : '이미지를 선택하세요.';
    el('apply').disabled = busy || !item;
    el('random').disabled = busy || !filteredItems().length;
  }

  function drain() {
    while (activeThumbnails < 3 && queue.length) {
      const task = queue.shift();
      activeThumbnails++;
      window.api.backgroundThumbnail({ id: task.item.id, token: task.token }).then((url) => {
        if (!dialog.open || task.generation !== gridId) return;
        const img = document.createElement('img');
        img.src = url; img.alt = ''; img.decoding = 'async';
        task.button.firstChild.replaceChildren(img);
      }).catch((error) => {
        if (!dialog.open || task.generation !== gridId) return;
        task.button.firstChild.textContent = '미리보기 불가';
        task.button.title = errorText(error);
        task.button.disabled = true;
        if (selected === task.item.id) { selected = null; updateSelection(); }
      }).finally(() => { activeThumbnails--; drain(); });
    }
  }

  async function apply(random) {
    if (busy || (!random && !selected)) return;
    const current = session;
    const candidates = random ? filteredItems().slice() : [snapshot.items.find((x) => x.id === selected)];
    if (!candidates.length) return;
    if (random) {
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      const previous = candidates.findIndex((item) => item.id === lastAppliedId);
      if (previous >= 0 && candidates.length > 1) candidates.push(...candidates.splice(previous, 1));
    }
    const callback = onApply;
    const isCurrent = () => dialog.open && current === session;
    setBusy(true); status(random ? '랜덤 배경을 불러오는 중…' : '선택한 배경을 불러오는 중…');
    try {
      let lastError;
      for (const item of candidates) {
        let url;
        try {
          url = await window.api.backgroundImage({ id: item.id, token: snapshot.token });
          if (!isCurrent()) return;
          const image = new Image(); image.src = url; await image.decode();
        } catch (error) {
          if (!isCurrent()) return;
          if (!random) throw error;
          lastError = error;
          continue;
        }
        if (!isCurrent()) return;
        const applied = await callback(url, isCurrent);
        if (isCurrent() && applied) { lastAppliedId = item.id; dialog.close(); }
        else if (isCurrent()) status('편집 중인 디자인이 바뀌었습니다. 창을 닫고 다시 선택해 주세요.');
        return;
      }
      throw new Error(`현재 목록에서 사용할 수 있는 배경을 찾지 못했습니다. ${lastError ? errorText(lastError) : '검색어나 분류를 바꿔 보세요.'}`);
    } catch (error) { if (isCurrent()) status(errorText(error)); }
    finally {
      if (isCurrent()) {
        setBusy(false);
        if (needsRefresh) { needsRefresh = false; void refresh(); }
      }
    }
  }

  function open(options) {
    if (!dialog) create();
    if (dialog.open) return;
    session++;
    opener = document.activeElement;
    onApply = options.onApply;
    selected = null; snapshot = null; needsRefresh = false;
    el('search').value = ''; el('category').value = ''; el('source').value = '';
    el('grid').replaceChildren(); el('count').textContent = ''; el('empty').hidden = true;
    updateSelection();
    dialog.showModal();
    el('search').focus();
    unsubscribe = window.api.onBackgroundsChanged(autoRefresh);
    window.addEventListener('focus', autoRefresh);
    void refresh();
  }

  return { open };
})();

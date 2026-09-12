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
  let observer;
  let busy = false;
  let queue = [];
  let activeThumbnails = 0;
  let lastAppliedId = null;
  const el = (id) => document.getElementById(`bgl-${id}`);
  const errorText = (error) => String(error?.message || error).replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '');
  const status = (text) => { el('status').textContent = text; };

  function setBusy(value) {
    busy = value;
    for (const id of ['refresh', 'search', 'category']) el(id).disabled = value;
    el('apply').disabled = value || !selected;
    dialog.setAttribute('aria-busy', String(value));
  }

  function create() {
    dialog = document.createElement('dialog');
    dialog.id = 'background-library-dialog';
    dialog.className = 'background-library';
    dialog.setAttribute('aria-labelledby', 'bgl-title');
    dialog.innerHTML = `
      <header class="bgl-head"><div><span class="task-kicker">BACKGROUND LIBRARY</span><h2 id="bgl-title">배경 프리셋</h2></div><div class="bgl-head-actions"><button id="bgl-refresh">새로고침</button><button id="bgl-close" class="icon-btn" aria-label="배경 프리셋 닫기">✕</button></div></header>
      <div class="bgl-filters"><label>검색<input id="bgl-search" type="search" placeholder="이름 또는 주제" autocomplete="off" /></label><label>분류<select id="bgl-category"><option value="">전체 분류</option></select></label><span id="bgl-count" role="status"></span></div>
      <p id="bgl-status" class="bgl-status" role="status" aria-live="polite"></p>
      <div id="bgl-scroll" class="bgl-scroll"><div id="bgl-grid" class="bgl-grid" aria-label="배경 이미지 목록"></div><p id="bgl-empty" class="bgl-empty" hidden></p></div>
      <footer class="bgl-footer"><div><strong id="bgl-selected">이미지를 선택하세요.</strong><p class="hint">선택한 배경은 디자인과 함께 저장됩니다.</p></div><button id="bgl-apply" class="primary" disabled>배경으로 적용</button></footer>`;
    document.body.append(dialog);
    dialog.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
    });
    dialog.addEventListener('keyup', (event) => event.stopPropagation());
    dialog.addEventListener('close', () => {
      session++; refreshId++; gridId++;
      observer?.disconnect(); queue = [];
      onApply = null;
      busy = false;
      opener?.focus();
    });
    el('close').onclick = () => dialog.close();
    el('search').oninput = renderGrid;
    el('category').onchange = renderGrid;
    el('refresh').onclick = () => refresh();
    el('apply').onclick = apply;
  }

  async function refresh() {
    if (!dialog.open) return;
    if (busy) return;
    const current = session;
    const request = ++refreshId;
    setBusy(true); status('이미지 목록을 읽는 중…');
    try {
      const next = await window.api.listBackgrounds();
      if (!dialog.open || current !== session || request !== refreshId) return;
      if (next) {
        snapshot = next;
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
      }
    }
  }

  function filteredItems() {
    if (!snapshot) return [];
    const query = el('search').value.trim().toLocaleLowerCase('ko');
    const category = el('category').value;
    return snapshot.items.filter((item) => (!category || item.category === category)
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
    el('empty').textContent = snapshot.status === 'error' ? snapshot.message
      : snapshot.items.length ? '검색 결과가 없습니다. 검색어나 분류를 바꿔 보세요.'
        : '사용 가능한 내장 배경이 없습니다. 앱 파일을 확인해 주세요.';
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
      detail.textContent = `${item.category} · ${(item.bytes / 1048576).toFixed(1)}MB`;
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

  async function apply() {
    if (busy || !selected) return;
    const current = session;
    const item = snapshot.items.find((entry) => entry.id === selected);
    const callback = onApply;
    const isCurrent = () => dialog.open && current === session;
    setBusy(true); status('선택한 배경을 불러오는 중…');
    try {
      const url = await window.api.backgroundImage({ id: item.id, token: snapshot.token });
      if (!isCurrent()) return;
      const applied = await callback(url, isCurrent, item);
      if (isCurrent() && applied) { lastAppliedId = item.id; dialog.close(); }
      else if (isCurrent()) status('편집 중인 디자인이 바뀌었습니다. 창을 닫고 다시 선택해 주세요.');
    } catch (error) { if (isCurrent()) status(errorText(error)); }
    finally { if (isCurrent()) setBusy(false); }
  }

  // 편집 화면에서 호출한다. 갤러리 검색·분류와 관계없이 전체 내장 배경을 대상으로 한다.
  async function random({ onApply: callback, isCurrent, currentUrl }) {
    const list = await window.api.listBackgrounds();
    if (!isCurrent()) return false;
    const candidates = list.items.slice();
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const previous = candidates.findIndex((item) => item.id === lastAppliedId);
    if (previous >= 0 && candidates.length > 1) candidates.push(...candidates.splice(previous, 1));
    let fallback;
    for (const item of candidates) {
      let url;
      try {
        url = await window.api.backgroundImage({ id: item.id, token: list.token });
        if (!isCurrent()) return false;
        const image = new Image(); image.src = url; await image.decode();
      } catch (_) { if (!isCurrent()) return false; continue; }
      if (!isCurrent()) return false;
      if (url === currentUrl && candidates.length > 1) { fallback = { item, url }; continue; }
      const applied = await callback(url, isCurrent, item);
      if (applied) lastAppliedId = item.id;
      return applied;
    }
    if (fallback && isCurrent()) {
      const applied = await callback(fallback.url, isCurrent, fallback.item);
      if (applied) lastAppliedId = fallback.item.id;
      return applied;
    }
    throw new Error(list.message || '사용 가능한 내장 배경이 없습니다. 앱 파일을 확인해 주세요.');
  }

  function open(options) {
    if (!dialog) create();
    if (dialog.open) return;
    session++;
    opener = document.activeElement;
    onApply = options.onApply;
    selected = null; snapshot = null;
    el('search').value = ''; el('category').value = '';
    el('grid').replaceChildren(); el('count').textContent = ''; el('empty').hidden = true;
    updateSelection();
    dialog.showModal();
    el('search').focus();
    void refresh();
  }

  return { open, random };
})();

'use strict';

(() => {
  if (window.api) return;
  const LIMIT = 64 * 1024 * 1024;
  const DB_NAME = 'jjal-generator-web';
  let database;
  let manifest;
  let pendingManifest;
  let dirty = false;
  let pickerOpen = false;
  let lastDownloadUrl = null;
  let offeredRecovery = null;
  let tabId;
  try {
    tabId = sessionStorage.getItem('jjal-recovery-tab') || crypto.randomUUID();
    sessionStorage.setItem('jjal-recovery-tab', tabId);
  } catch (_) { tabId = crypto.randomUUID(); }

  const plainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
  function validateProject(value) {
    if (!plainObject(value) || !plainObject(value.card) || !Array.isArray(value.rows)) {
      throw new Error('SpecCard 프로젝트 파일이 아닙니다. .speccard 백업 파일을 선택해 주세요.');
    }
    // Projects embed their images. Remote URLs would break offline backups and can taint Canvas.
    const images = [value.image?.dataUrl, value.card.bgImageDataUrl, ...(value.stickers || []).map((item) => item?.dataUrl)];
    for (const image of images) {
      if (image && !/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(image)) {
        throw new Error('프로젝트 이미지가 내장되어 있지 않거나 지원하지 않는 형식입니다.');
      }
    }
    return value;
  }
  function storageError(error) {
    return new Error(error?.name === 'QuotaExceededError'
      ? '브라우저 저장 공간이 부족합니다. 먼저 프로젝트를 백업한 뒤 불필요한 디자인을 정리해 주세요.'
      : '브라우저 저장소를 사용할 수 없습니다. 브라우저의 사이트 데이터 설정을 확인하고 프로젝트 파일로 백업해 주세요.');
  }
  function openDatabase() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('designs', { keyPath: 'file' });
        request.result.createObjectStore('recovery', { keyPath: 'tabId' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); database = null; };
        resolve(db);
      };
      request.onerror = () => reject(storageError(request.error));
      request.onblocked = () => reject(new Error('다른 자짤 생성기 탭을 닫고 다시 시도해 주세요.'));
    }).catch((error) => { database = null; throw error; });
    return database;
  }
  async function transact(storeName, mode, action) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => {}; // Abort is the final outcome; never report a write before commit.
      try {
        action(tx.objectStore(storeName), (value) => { result = value; });
      } catch (error) { tx.abort(); reject(error); }
    });
  }
  function readStore(store, key) {
    return transact(store, 'readonly', (table, done) => {
      const request = key === undefined ? table.getAll() : table.get(key);
      request.onsuccess = () => done(request.result);
    });
  }
  function safeName(value) {
    return String(value || 'speccard').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().slice(0, 100) || 'speccard';
  }
  function dataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('파일을 읽지 못했습니다. 다시 선택해 주세요.'));
      reader.readAsDataURL(blob);
    });
  }
  function base64Blob(value, mime) {
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    return new Blob([bytes], { type: mime });
  }
  function download(blob, filename) {
    if (lastDownloadUrl) URL.revokeObjectURL(lastDownloadUrl);
    const url = URL.createObjectURL(blob);
    lastDownloadUrl = url;
    let notice = document.getElementById('web-download-note');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'web-download-note'; notice.setAttribute('role', 'status');
      document.body.append(notice);
    }
    notice.replaceChildren();
    const message = document.createElement('p');
    message.textContent = '파일이 준비되었습니다. 다운로드가 시작되지 않으면 아래 파일명을 눌러 주세요.';
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.textContent = filename;
    const close = document.createElement('button');
    close.textContent = '닫기'; close.setAttribute('aria-label', '출력 파일 안내 닫기');
    close.onclick = () => { notice.remove(); URL.revokeObjectURL(url); if (lastDownloadUrl === url) lastDownloadUrl = null; };
    notice.append(message, link, close);
    link.click();
    return filename;
  }
  function pickFile(accept) {
    if (pickerOpen) return Promise.resolve(null);
    pickerOpen = true;
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = accept; input.hidden = true;
      const finish = (value) => { pickerOpen = false; input.remove(); resolve(value); };
      input.onchange = () => finish(input.files?.[0] || null);
      input.oncancel = () => finish(null);
      document.body.append(input); input.click();
    });
  }
  async function readImage(file) {
    if (file.size > LIMIT) throw new Error('이미지는 64MB 이하만 불러올 수 있습니다.');
    const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const ascii = (start, end) => String.fromCharCode(...signature.slice(start, end));
    let mime;
    if (signature[0] === 137 && ascii(1, 4) === 'PNG') mime = 'image/png';
    else if (signature[0] === 255 && signature[1] === 216 && signature[2] === 255) mime = 'image/jpeg';
    else if (['GIF87a', 'GIF89a'].includes(ascii(0, 6))) mime = 'image/gif';
    else if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') mime = 'image/webp';
    else throw new Error('PNG·JPEG·WebP·GIF 이미지 파일을 선택해 주세요.');
    const url = await dataUrl(new Blob([file], { type: mime }));
    try { const image = new Image(); image.src = url; await image.decode(); }
    catch (_) { throw new Error('이미지 파일이 손상되었거나 이 브라우저에서 읽을 수 없습니다.'); }
    return url;
  }
  async function fetchAsset(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('배경 이미지를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.');
    return response;
  }
  async function listBackgrounds() {
    if (!pendingManifest) {
      pendingManifest = (async () => {
        const response = await fetch('backgrounds/manifest.json', { cache: 'no-cache', signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('배경 목록을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
        const value = await response.json();
        if (!Array.isArray(value.items) || !value.token) throw new Error('배경 목록 형식이 올바르지 않습니다.');
        manifest = value;
        return value;
      })().finally(() => { pendingManifest = null; });
    }
    return pendingManifest;
  }
  function backgroundEntry(request) {
    const item = manifest?.items.find((entry) => entry.id === request.id);
    if (!item || manifest.token !== request.token) throw new Error('배경 목록을 새로고침한 뒤 다시 선택해 주세요.');
    return item;
  }
  function askSpecText() {
    return new Promise((resolve) => {
      const opener = document.activeElement;
      const dialog = document.createElement('dialog');
      dialog.className = 'web-spec-dialog';
      dialog.setAttribute('aria-labelledby', 'web-spec-title');
      dialog.innerHTML = `<h2 id="web-spec-title">사양 붙여넣기</h2>
        <p>한 줄에 하나씩 항목명과 사양을 입력하세요. 다음 화면에서 가져올 항목을 고를 수 있습니다.</p>
        <label for="web-spec-input">PC 부품 및 주변기기</label>
        <textarea id="web-spec-input" rows="9" placeholder="CPU: AMD Ryzen 7 9800X3D&#10;VGA: NVIDIA GeForce RTX 5080&#10;RAM: DDR5 32GB&#10;모니터: 27인치 QHD"></textarea>
        <p id="web-spec-error" role="alert"></p>
        <div class="modal-btns"><button type="button" data-action="cancel">취소</button><button type="button" class="primary" data-action="read">항목 확인</button></div>`;
      let result = null;
      dialog.addEventListener('keydown', (event) => event.stopPropagation());
      dialog.addEventListener('keyup', (event) => event.stopPropagation());
      dialog.querySelector('[data-action="cancel"]').onclick = () => dialog.close();
      dialog.querySelector('[data-action="read"]').onclick = () => {
        try { result = window.SpecText.parse(dialog.querySelector('textarea').value); dialog.close(); }
        catch (error) { dialog.querySelector('[role="alert"]').textContent = error.message; }
      };
      dialog.onclose = () => { dialog.remove(); opener?.focus(); resolve(result); };
      document.body.append(dialog); dialog.showModal(); dialog.querySelector('textarea').focus();
    });
  }

  const startup = document.getElementById('web-startup');
  if (startup) startup.querySelector('button').onclick = () => location.reload();

  window.addEventListener('beforeunload', (event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
  window.api = Object.freeze({
    platform: 'web',
    ready() { startup?.remove(); },
    initializationFailed(error) {
      if (startup) startup.querySelector('p').textContent = `편집기를 준비하지 못했습니다. ${error.message}`;
    },
    readSpecs: askSpecText,
    async pickImage() {
      const file = await pickFile('.png,.jpg,.jpeg,.webp,.gif');
      return file ? readImage(file) : null;
    },
    listBackgrounds,
    async backgroundThumbnail(request) {
      const item = backgroundEntry(request);
      return dataUrl(await (await fetchAsset(item.thumbnail)).blob());
    },
    async backgroundImage(request) {
      const item = backgroundEntry(request);
      return readImage(await (await fetchAsset(item.url)).blob());
    },
    async listDesigns() {
      const entries = await readStore('designs');
      return entries.map(({ file, name, thumbnail, mtime }) => ({ file, name, thumbnail, mtime })).sort((a, b) => b.mtime - a.mtime);
    },
    async loadDesign(file) {
      const record = await readStore('designs', file);
      if (!record) throw new Error('저장한 디자인을 찾지 못했습니다. 목록을 다시 열어 주세요.');
      return record.state;
    },
    async saveDesign(payload) {
      validateProject(payload);
      const file = typeof payload.file === 'string' && payload.file ? payload.file : `${crypto.randomUUID()}.json`;
      const name = String(payload.name || '무제');
      await transact('designs', 'readwrite', (table) => table.put({
        file, name, thumbnail: payload._thumbnail || null, mtime: Date.now(), state: { ...payload, file },
      }));
      return { file, name };
    },
    async deleteDesign(file) {
      await transact('designs', 'readwrite', (table) => table.delete(file));
      return true;
    },
    async exportPng({ dataUrl: url, suggestedName }) {
      if (!url.startsWith('data:image/png;base64,')) throw new Error('PNG 이미지 생성에 실패했습니다.');
      return download(base64Blob(url.split(',')[1], 'image/png'), `${safeName(suggestedName)}.png`);
    },
    async exportWebp({ dataBase64, suggestedName }) {
      return download(base64Blob(dataBase64, 'image/webp'), `${safeName(suggestedName)}.webp`);
    },
    async exportProject(payload) {
      validateProject(payload);
      return download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${safeName(payload.name)}.speccard`);
    },
    async importProject() {
      const file = await pickFile('.speccard,.json');
      if (!file) return null;
      if (file.size > LIMIT) throw new Error('프로젝트 파일은 64MB 이하만 열 수 있습니다.');
      let state;
      try { state = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); }
      catch (_) { throw new Error('프로젝트 파일의 내용을 읽을 수 없습니다. 올바른 .speccard 파일을 선택해 주세요.'); }
      return { file: file.name, state: validateProject(state) };
    },
    async writeAutosave(state) {
      await transact('recovery', 'readwrite', (table) => table.put({ tabId, revision: crypto.randomUUID(), savedAt: Date.now(), state }));
      return true;
    },
    async readAutosave() {
      const entries = await readStore('recovery');
      offeredRecovery = entries.find((entry) => entry.tabId === tabId)
        || entries.sort((a, b) => b.savedAt - a.savedAt)[0] || null;
      return offeredRecovery;
    },
    async clearAutosave() {
      const offered = offeredRecovery;
      await transact('recovery', 'readwrite', (table) => {
        table.delete(tabId);
        // Retire a consumed snapshot, but preserve any newer recovery from its original tab.
        if (offered && offered.tabId !== tabId) {
          const request = table.get(offered.tabId);
          request.onsuccess = () => {
            if (request.result?.revision === offered.revision) table.delete(offered.tabId);
          };
        }
      });
      offeredRecovery = null;
      return true;
    },
    async copyImage(url) {
      if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error('이 브라우저에서는 이미지 복사를 지원하지 않습니다. PNG로 저장해 주세요.');
      try {
        const blob = base64Blob(url.split(',')[1], 'image/png');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
      } catch (_) { throw new Error('클립보드 복사를 허용하거나 PNG로 저장해 주세요.'); }
    },
    async pasteImage() {
      if (!navigator.clipboard?.read) throw new Error('이 브라우저에서는 이미지 붙여넣기를 지원하지 않습니다. 이미지 넣기를 사용해 주세요.');
      try {
        for (const item of await navigator.clipboard.read()) {
          const type = item.types.find((type) => /^image\/(png|jpeg|webp|gif)$/.test(type));
          if (type) return readImage(await item.getType(type));
        }
        return null;
      } catch (_) { throw new Error('클립보드 읽기를 허용하거나 이미지 넣기를 사용해 주세요.'); }
    },
    setDirty(value) { dirty = !!value; },
  });
})();

'use strict';

// 실제 창에서 마우스로 조작해 보고 화면을 찍는 검사.
//   JJAL_DEV_URL=http://localhost:5183 JJAL_SHOT_DIR=<폴더> npx electron . --script=scripts/ui-check.cjs
// 결과: <폴더>/*.png 와 <폴더>/ui-check.json

const fs = require('node:fs');
const path = require('node:path');

module.exports = async function uiCheck(win) {
  const dir = process.env.JJAL_SHOT_DIR || path.join(process.cwd(), 'ui-check');
  fs.mkdirSync(dir, { recursive: true });
  const wc = win.webContents;
  const log = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const js = (code) => wc.executeJavaScript(code);
  const shot = async (name) => {
    await sleep(350);
    fs.writeFileSync(path.join(dir, `${name}.png`), (await wc.capturePage()).toPNG());
  };
  const check = (name, ok, detail = '') => log.push({ name, ok: !!ok, detail: String(detail) });
  const mouse = (type, x, y, extra = {}) => wc.sendInputEvent({ type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1, ...extra });
  const click = async (x, y) => { mouse('mouseDown', x, y); await sleep(40); mouse('mouseUp', x, y); await sleep(120); };
  const drag = async (x1, y1, x2, y2, extra = {}) => {
    mouse('mouseMove', x1, y1);
    mouse('mouseDown', x1, y1);
    for (let i = 1; i <= 8; i += 1) {
      await sleep(20);
      mouse('mouseMove', x1 + ((x2 - x1) * i) / 8, y1 + ((y2 - y1) * i) / 8, extra);
    }
    await sleep(40);
    mouse('mouseUp', x2, y2);
    await sleep(150);
  };
  const state = (expr) => js(`(() => { const s = window.__editor.getState(); return JSON.stringify(${expr}); })()`).then(JSON.parse);
  /** 문서 좌표 → 창 좌표 */
  const at = async (dx, dy) => js(`(() => { const c = document.querySelector('.canvas-wrap canvas'); const r = c.getBoundingClientRect();
    const w = window.__editor.getState().doc.card.w; const z = r.width / w; return [r.left + ${dx} * z, r.top + ${dy} * z, z]; })()`);
  const layer = (kind) => state(`s.doc.layers.find((l) => l.kind === '${kind}' && l.role !== 'bg')`);
  const clickText = (sel, text) => js(`(() => { const el = [...document.querySelectorAll('${sel}')].find((e) => e.textContent.includes(${JSON.stringify(text)}));
    if (!el) return false; el.click(); return true; })()`);

  await js('new Promise((r) => { const t = setInterval(() => { if (window.__editor && document.querySelector(".canvas-wrap canvas")) { clearInterval(t); r(); } }, 50); })');
  await sleep(900);

  for (let i = 0; i < 40 && !(await js('document.fonts && window.__fontsReady === true')); i += 1) await sleep(250);
  check('앱 시작 시 내 PC 글꼴이 자동으로 불러와진다', await js('window.__fontsReady === true'), await js('String(window.__fontCount)'));

  // 1) 첫 실행: 프리셋 고르기 창
  check('첫 실행에 프리셋 창이 열린다', await js('!!document.querySelector(".preset-grid")'));
  await shot('01-first-run-presets');
  await js('document.querySelectorAll(".preset-card")[1].click()');
  await sleep(500);
  check('프리셋 적용 후 창이 닫힌다', await js('!document.querySelector(".modal")'));
  check('프리셋 레이어가 들어왔다', (await state('s.doc.layers.length')) >= 5);

  // 2) 내용 입력 (닉네임 + 사양 붙여넣기 경로는 함수로 확인)
  await js(`window.__editor.getState().apply((d) => { d.content.nickname = '정신안차려?';
    const v = ['AMD Ryzen 7 9800X3D', 'Gigabyte B850 AORUS STEALTH ICE', 'DDR5 24GB*4', 'ZOTAC RTX 5090 SOLID OC', 'CRUCIAL T710 4TB', 'SuperFlower SF-1000F14XG', 'LIANLI O11D MINI V2 FLOW', 'LIANLI Hydroshift II LCD-C'];
    d.content.specs.forEach((r, i) => { r.value = v[i] || ''; }); })`);
  await shot('02-preset-applied');

  // 3) 캔버스 클릭으로 사양 목록 선택
  const spec0 = await layer('spec');
  let [x, y] = await at(spec0.x + spec0.w / 2, spec0.y + spec0.h / 2);
  await click(x, y);
  const sel = await state('s.selection');
  check('캔버스 클릭으로 사양 목록이 선택된다', sel.length === 1 && sel[0] === spec0.id, JSON.stringify(sel));
  check('속성 패널이 사양 목록 속성을 보여준다', await js('document.querySelector(".inspector .panel-head .sub")?.textContent === "사양 목록"'));
  await shot('03-spec-selected');
  check('빠른 도구모음이 사양 목록용으로 바뀐다', await js('document.querySelector(".quick-title")?.textContent === "사양 목록" && !!document.querySelector(".quickbar .quick-font")'));
  await js(`(() => { const item = [...document.querySelectorAll('.quickbar .quick-item')].find((p) => p.querySelector('span')?.textContent === '크기');
    const input = item.querySelector('.num-box'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    input.focus(); set.call(input, '13'); input.dispatchEvent(new Event('input', { bubbles: true })); input.blur(); })()`);
  await sleep(150);
  check('빠른 도구모음에서 바꾼 값이 문서와 속성 패널에 같이 반영된다', (await layer('spec')).size === 13
    && await js('[...document.querySelectorAll(".inspector .prop")].find((p) => p.querySelector("label")?.textContent === "크기").querySelector(".num-box").value === "13"'));
  await js('window.__editor.getState().undo()');

  // 4) 끌어서 이동 → 실행 취소 한 번으로 복귀
  const past0 = await state('s.past.length');
  await drag(x, y, x + 60, y + 24, { modifiers: ['alt'] });
  const spec1 = await layer('spec');
  check('끌면 레이어가 움직인다', spec1.x !== spec0.x && spec1.y !== spec0.y, `${spec0.x},${spec0.y} → ${spec1.x},${spec1.y}`);
  check('끌기 한 번은 실행 취소 한 번이다', (await state('s.past.length')) === past0 + 1);
  await js('window.__editor.getState().undo()');
  const spec2 = await layer('spec');
  check('실행 취소로 제자리', spec2.x === spec0.x && spec2.y === spec0.y);

  // 5) 오른쪽 아래 핸들로 크기 변경
  let z;
  [x, y, z] = await at(spec0.x + spec0.w, spec0.y + spec0.h);
  await drag(x, y, x + 40 * z, y - 30 * z);
  const spec3 = await layer('spec');
  check('핸들을 끌면 크기가 바뀐다', Math.abs(spec3.w - (spec0.w + 40)) <= 2 && Math.abs(spec3.h - (spec0.h - 30)) <= 2, `${spec0.w}×${spec0.h} → ${spec3.w}×${spec3.h}`);
  check('크기 변경 중 반대쪽 모서리는 고정', spec3.x === spec0.x && spec3.y === spec0.y);
  await js('window.__editor.getState().undo()');

  // 6) 닉네임 선택 후 회전 손잡이
  const nick = await state(`s.doc.layers.find((l) => l.kind === 'text')`);
  [x, y] = await at(nick.x + 20, nick.y + 12);
  await click(x, y);
  check('닉네임 텍스트 선택', (await state('s.selection'))[0] === nick.id);
  const knob = await js('(() => { const k = document.querySelector(".sel-rotate"); if (!k) return null; const r = k.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()');
  if (knob) {
    await drag(knob[0], knob[1], knob[0] + 60, knob[1] + 30);
    const rot = (await state(`s.doc.layers.find((l) => l.id === '${nick.id}').rot`));
    check('회전 손잡이로 회전한다', rot !== 0, `rot=${rot}`);
    await shot('04-text-rotated');
    await js('window.__editor.getState().undo()');
  } else check('회전 손잡이가 보인다', false);

  // 7) 속성 패널: 글자 크기 숫자 칸 입력 → 그림에 반영
  const before = await js('document.querySelector(".canvas-wrap canvas").toDataURL()');
  await js(`(() => { const row = [...document.querySelectorAll('.inspector .prop')].find((p) => p.querySelector('label')?.textContent === '크기');
    const input = row.querySelector('.num-box'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    input.focus(); set.call(input, '44'); input.dispatchEvent(new Event('input', { bubbles: true })); input.blur(); })()`);
  await sleep(200);
  check('속성 패널의 글자 크기 입력이 문서에 들어간다', (await state(`s.doc.layers.find((l) => l.id === '${nick.id}').size`)) === 44);
  check('입력 즉시 캔버스 그림이 바뀐다', before !== await js('document.querySelector(".canvas-wrap canvas").toDataURL()'));
  await js('window.__editor.getState().undo()');

  // 8) 레이어 패널: 숨기기, 순서 변경
  await js('document.querySelector(".layer-row.selected .flag").click()');
  check('레이어 패널의 눈 버튼으로 숨긴다', (await state(`s.doc.layers.find((l) => l.id === '${nick.id}').visible`)) === false);
  await js('window.__editor.getState().undo()');
  const idx0 = await state(`s.doc.layers.findIndex((l) => l.id === '${nick.id}')`);
  await clickText('.layer-tools button', '▼');
  const idx1 = await state(`s.doc.layers.findIndex((l) => l.id === '${nick.id}')`);
  check('▼ 버튼으로 한 칸 뒤로 간다', idx1 === idx0 - 1, `${idx0} → ${idx1}`);
  await js('window.__editor.getState().undo()');

  // 9) 사진 자리: 이미지 넣고 자르기(끌어서 위치)
  await js(`(async () => { const c = document.createElement('canvas'); c.width = 600; c.height = 800; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 600, 800); gr.addColorStop(0, '#ffb3d1'); gr.addColorStop(1, '#7b5cff'); g.fillStyle = gr; g.fillRect(0, 0, 600, 800);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(300, 330, 150, 0, 7); g.fill(); g.fillStyle = '#333'; g.beginPath(); g.arc(250, 310, 18, 0, 7); g.arc(350, 310, 18, 0, 7); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#333'; g.beginPath(); g.arc(300, 360, 60, 0.2, 2.9); g.stroke();
    window.__editor.getState().apply((d) => { d.assets.demo = { id: 'demo', name: 'demo.png', src: c.toDataURL(), builtin: false }; d.content.photo = 'demo'; }); })()`);
  await sleep(500);
  const photo = await state(`s.doc.layers.find((l) => l.kind === 'image' && l.slot === 'photo')`);
  [x, y] = await at(photo.x + photo.w / 2, photo.y + photo.h / 2);
  await click(x, y);
  mouse('mouseDown', x, y, { clickCount: 1 }); mouse('mouseUp', x, y, { clickCount: 1 });
  mouse('mouseDown', x, y, { clickCount: 2 }); mouse('mouseUp', x, y, { clickCount: 2 });
  await sleep(250);
  check('사진을 두 번 누르면 자르기 모드', (await state('s.cropId')) === photo.id);
  await drag(x, y, x + 30, y - 40);
  const photo2 = await state(`s.doc.layers.find((l) => l.id === '${photo.id}')`);
  check('자르기 중 끌면 사진만 움직인다', photo2.panX !== photo.panX && photo2.x === photo.x, `pan ${photo.panX},${photo.panY} → ${photo2.panX},${photo2.panY}`);
  await shot('05-crop-mode');
  wc.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); wc.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
  await sleep(150);
  check('Enter로 자르기 종료', (await state('s.cropId')) === null);

  // 10) 배경 갤러리
  await clickText('.addbar > button', '배경');
  await sleep(1200);
  const bgCount = await js('document.querySelectorAll(".bg-card").length');
  check('배경 갤러리에 164장이 나온다', bgCount === 164, bgCount);
  await shot('06-background-gallery');
  await js('document.querySelectorAll(".bg-card")[10].click()');
  await sleep(900);
  check('배경을 누르면 바탕 레이어가 이미지로 바뀐다', (await state(`(() => { const b = s.doc.layers.find((l) => l.role === 'bg'); return b.kind === 'image' && b.asset; })()`)) === 'bg_011');
  await clickText('.modal footer button', '완료');
  await sleep(700);
  await js('window.__editor.getState().select([])');
  await shot('07-background-applied');

  // 11) 효과 레이어 추가 → 맨 위 → 사진 아래로 내리기
  await js('window.__editor.getState().set({ playing: false })');
  await clickText('.addbar .menu > button', '효과');
  await sleep(150);
  await clickText('.menu-pop button', '오로라');
  await sleep(300);
  const fx = await state(`s.doc.layers[s.doc.layers.length - 1]`);
  check('효과가 레이어로 추가된다', fx.kind === 'effect' && fx.effect === 'aurora');
  await js('window.__editor.getState().set({ playing: false, t: 1.1 })');
  await shot('08-effect-on-top');
  await js(`window.__editor.getState().apply((d) => { const i = d.layers.findIndex((l) => l.id === '${fx.id}'); const [l] = d.layers.splice(i, 1); d.layers.splice(1, 0, l); })`);
  await shot('09-effect-behind');

  // 12) 내보내기 창
  await clickText('.topbar button', '내보내기');
  await sleep(600);
  await shot('10-export-dialog');
  await js('document.querySelector(".modal .icon-btn").click()');

  // 13) 내용 창
  await clickText('.topbar button', '내용');
  await sleep(400);
  await shot('11-content-dialog');
  await js('document.querySelector(".modal .icon-btn").click()');

  // 14) 프리셋 갤러리(내 내용으로 미리보기)
  await clickText('.topbar button', '프리셋');
  await sleep(1500);
  await shot('12-preset-gallery-with-content');
  await js('document.querySelector(".modal-body").scrollTop = 99999');
  await sleep(900);
  await shot('12b-preset-gallery-more');
  await js('document.querySelectorAll(".preset-card")[2].click()');
  await sleep(700);
  const c = await state('s.doc.content');
  check('다른 프리셋을 적용해도 닉네임·사양·사진이 남는다', c.nickname === '정신안차려?' && c.specs[0].value.includes('9800X3D') && c.photo === 'demo');
  await js('window.__editor.getState().set({ playing: false, t: 0.8 })');
  await shot('13-other-preset');

  // 14-2) 새 추가 메뉴: 패널·도형, 이모티콘, 효과
  await js('window.__editor.getState().select([])');
  await clickText('.addbar .menu > button', '패널·도형');
  await shot('14-shape-kits');
  await clickText('.kit-list button', '무늬 덮개');
  await sleep(200);
  const kit = await state('s.doc.layers[s.doc.layers.length - 1]');
  check('무늬 덮개가 바탕 없는 무늬 도형으로 추가된다', kit.kind === 'shape' && kit.fill.type === 'dots' && kit.fill.base === false);
  await js(`window.__editor.getState().apply((d) => { const l = d.layers.find((x) => x.id === '${kit.id}'); l.fill.type = 'hearts'; l.fill.size = 30; l.fill.color = '#ff8fc0'; l.fill.opacity = 0.5; })`);
  await clickText('.addbar .menu > button', '이모티콘');
  await sleep(150);
  await shot('15-emoji-picker');
  await clickText('.emoji-grid button', '😎');
  await sleep(200);
  const emo = await state('s.doc.layers[s.doc.layers.length - 1]');
  check('이모티콘이 텍스트 레이어로 추가된다', emo.kind === 'text' && emo.text === '😎');
  await clickText('.addbar .menu > button', '효과');
  await sleep(150);
  await shot('16-effect-menu');
  await clickText('.fx-grid button', '하트 둥둥');
  await sleep(200);
  await js(`window.__editor.getState().apply((d) => { d.card.border = { ...d.card.border, on: true, style: 'double', color: '#ffffff', width: 5 }; d.card.deco = { ...d.card.deco, on: true, style: 'dotted', color: '#ffd166', width: 2.5, inset: 14 }; })`);
  await js('window.__editor.getState().select([]); window.__editor.getState().set({ playing: false, t: 1.3 })');
  await shot('17-border-pattern-emoji-hearts');
  // 혼합 안내: 흰 도형에 스크린은 변화가 없다는 안내가 떠야 한다.
  await js(`window.__editor.getState().apply((d) => { const l = d.layers.find((x) => x.id === '${emo.id}'); l.blend = 'screen'; l.text = '★'; l.color = '#ffffff'; }); window.__editor.getState().select(['${emo.id}'])`);
  await sleep(300);
  check('효과 없는 혼합에는 안내가 뜬다', await js('[...document.querySelectorAll(".inspector .note.warn")].some((n) => n.textContent.includes("보통"))'));
  await js(`window.__editor.getState().apply((d) => { const l = d.layers.find((x) => x.id === '${emo.id}'); l.blend = 'multiply'; l.color = '#ff3d81'; })`);
  await sleep(300);
  check('효과 있는 혼합에는 안내가 없다', !(await js('[...document.querySelectorAll(".inspector .note.warn")].some((n) => n.textContent.includes("보통"))')));

  // 14-3) 스포이드와 게시판 미리보기
  check('스포이드를 쓸 수 있다', await js('"EyeDropper" in window && !!document.querySelector(".color .dropper")'));
  await js('window.__editor.getState().select([])');
  const beforeBg = await js('document.querySelector(".canvas-wrap canvas").toDataURL()');
  await clickText('.backdrop button', '어두운');
  await sleep(200);
  check('게시판 미리보기: 어두운 바탕으로 바뀐다', await js('getComputedStyle(document.querySelector(".stage")).backgroundColor === "rgb(28, 28, 30)"'));
  check('게시판 미리보기는 그림(출력)을 바꾸지 않는다', beforeBg === await js('document.querySelector(".canvas-wrap canvas").toDataURL()'));
  await shot('18-board-dark');
  await clickText('.backdrop button', '밝은');
  await shot('19-board-light');
  await clickText('.backdrop button', '▦');

  // 14-4) 색 테마, Ctrl+C / Ctrl+V, GIF 내보내기 창
  await clickText('.topbar .menu > button', '색 테마');
  await sleep(250);
  check('색 테마에 이 디자인의 색이 나온다', (await js('document.querySelectorAll(".theme-row").length')) >= 3);
  await shot('20-theme-colors');
  await clickText('.topbar .menu > button', '색 테마');
  const nickId = await state(`s.doc.layers.find((l) => l.kind === 'text' && l.slot === 'nickname').id`);
  await js(`window.__editor.getState().select(['${nickId}'])`);
  const countBefore = await state('s.doc.layers.length');
  wc.sendInputEvent({ type: 'keyDown', keyCode: 'C', modifiers: ['control'] }); wc.sendInputEvent({ type: 'keyUp', keyCode: 'C', modifiers: ['control'] });
  await sleep(150);
  wc.paste();
  await sleep(300);
  check('Ctrl+C / Ctrl+V로 레이어가 복제된다', (await state('s.doc.layers.length')) === countBefore + 1, `${countBefore} → ${await state('s.doc.layers.length')}`);
  await js('window.__editor.getState().undo()');
  await clickText('.topbar button', '내보내기');
  await sleep(300);
  await clickText('.modal .segment button', '움직이는 GIF');
  await sleep(200);
  await clickText('.modal footer button', '용량 확인');
  for (let i = 0; i < 80 && !(await js('document.querySelector(".size-info")?.textContent.startsWith("용량 ") && !document.querySelector(".busy")')); i += 1) await sleep(250);
  check('GIF 용량 확인이 용량을 보여준다', await js('/용량 [0-9.]+(KB|MB)/.test(document.querySelector(".size-info")?.textContent || "")'), await js('document.querySelector(".size-info")?.textContent'));
  await shot('21-export-gif');
  await js('document.querySelector(".modal .icon-btn").click()');

  // 15) 저장 → 다시 열기
  await js('window.__editor.getState().apply((d) => { d.name = "검사용 디자인"; })');
  wc.sendInputEvent({ type: 'keyDown', keyCode: 'S', modifiers: ['control'] }); wc.sendInputEvent({ type: 'keyUp', keyCode: 'S', modifiers: ['control'] });
  await sleep(1200);
  check('Ctrl+S 뒤에 저장됨으로 표시', await js('document.querySelector(".save-state").textContent === "저장됨"'));

  const failed = log.filter((l) => !l.ok);
  fs.writeFileSync(path.join(dir, 'ui-check.json'), JSON.stringify({ passed: log.length - failed.length, failed: failed.length, log }, null, 1));
};

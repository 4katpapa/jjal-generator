'use strict';

// 폰 크기 창(390×780)에서 간편 모드를 눌러 보는 검사.
//   JJAL_SHOT_DIR=<폴더> npx electron . --script=scripts/mobile-check.cjs

const fs = require('node:fs');
const path = require('node:path');

module.exports = async function mobileCheck(win) {
  const dir = process.env.JJAL_SHOT_DIR || path.join(process.cwd(), 'ui-check');
  fs.mkdirSync(dir, { recursive: true });
  const wc = win.webContents;
  const log = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const js = (code) => wc.executeJavaScript(code);
  const shot = async (name) => { await sleep(350); fs.writeFileSync(path.join(dir, `${name}.png`), (await wc.capturePage()).toPNG()); };
  const check = (name, ok, detail = '') => log.push({ name, ok: !!ok, detail: String(detail) });
  const mouse = (type, x, y) => wc.sendInputEvent({ type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
  const click = async (x, y) => { mouse('mouseDown', x, y); await sleep(40); mouse('mouseUp', x, y); await sleep(150); };
  const drag = async (x1, y1, x2, y2) => {
    mouse('mouseMove', x1, y1); mouse('mouseDown', x1, y1);
    for (let i = 1; i <= 6; i += 1) { await sleep(20); mouse('mouseMove', x1 + ((x2 - x1) * i) / 6, y1 + ((y2 - y1) * i) / 6); }
    await sleep(40); mouse('mouseUp', x2, y2); await sleep(150);
  };
  const state = (expr) => js(`(() => { const s = window.__editor.getState(); return JSON.stringify(${expr}); })()`).then(JSON.parse);
  const at = (dx, dy) => js(`(() => { const r = document.querySelector('.canvas-wrap canvas').getBoundingClientRect();
    const z = r.width / window.__editor.getState().doc.card.w; return [r.left + ${dx} * z, r.top + ${dy} * z, z]; })()`);
  const clickText = (sel, text) => js(`(() => { const el = [...document.querySelectorAll('${sel}')].find((e) => e.textContent.includes(${JSON.stringify(text)}));
    if (!el) return false; el.click(); return true; })()`);

  win.setMinimumSize(320, 480);
  win.setContentSize(390, 780);
  await sleep(300);
  wc.reload();
  await sleep(1500);
  await js('new Promise((r) => { const t = setInterval(() => { if (window.__editor && document.querySelector(".canvas-wrap canvas")) { clearInterval(t); r(); } }, 50); })');
  await sleep(600);

  check('폰 폭에서 간편 모드 화면이 뜬다', await js('!!document.querySelector(".app.mobile") && !document.querySelector(".side")'));
  check('가로로 넘치는 부분이 없다', await js('document.documentElement.scrollWidth <= window.innerWidth'), await js('document.documentElement.scrollWidth + " / " + window.innerWidth'));
  await shot('m01-presets');
  await js('document.querySelectorAll(".preset-card")[1].click()');
  await sleep(500);
  check('프리셋을 고르면 창이 닫히고 적용된다', await js('!document.querySelector(".modal")') && (await state('s.doc.layers.length')) >= 5);

  // 내용 탭: 닉네임 입력
  await js(`(() => { const input = document.querySelector('.m-pane input[type=text]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(input, '테스트닉'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await js(`window.__editor.getState().apply((d) => { const v = ['Example CPU 8-Core', 'Example B-Series Board', 'DDR5 16GB*2', 'Example GPU 12GB', 'Example NVMe 1TB', 'Example 750W GOLD', 'Example Mid Tower', 'Example Tower Cooler'];
    d.content.specs.forEach((r, i) => { r.value = v[i] || ''; }); })`);
  await sleep(200);
  check('내용 탭에서 닉네임을 바꾼다', (await state('s.doc.content.nickname')) === '테스트닉');
  check('카드가 화면 폭 안에 다 보인다', await js('(() => { const r = document.querySelector(".canvas-wrap canvas").getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.width > 300; })()'));
  check('내용 탭이 옆으로 넘치지 않는다', await js('(() => { const p = document.querySelector(".m-pane"); return p.scrollWidth <= p.clientWidth + 1; })()'), await js('document.querySelector(".m-pane").scrollWidth + " / " + document.querySelector(".m-pane").clientWidth'));
  await shot('m02-content');

  // 캔버스에서 사양 목록 탭 → 꾸미기 탭
  const spec = await state(`s.doc.layers.find((l) => l.kind === 'spec')`);
  let [x, y] = await at(spec.x + spec.w / 2, spec.y + spec.h / 2);
  await click(x, y);
  check('캔버스 탭으로 선택되고 꾸미기 탭으로 넘어간다', (await state('s.selection'))[0] === spec.id && await js('!!document.querySelector(".m-pane .quickbar")'));
  check('꾸미기 탭 내용이 옆으로 넘치지 않는다', await js('(() => { const p = document.querySelector(".m-pane"); return p.scrollWidth <= p.clientWidth + 1; })()'), await js('document.querySelector(".m-pane").scrollWidth + " / " + document.querySelector(".m-pane").clientWidth'));
  await shot('m03-style');
  await drag(x, y, x + 30, y + 14);
  const moved = await state(`s.doc.layers.find((l) => l.kind === 'spec')`);
  check('끌어서 옮긴다', moved.x !== spec.x || moved.y !== spec.y, `${spec.x},${spec.y} → ${moved.x},${moved.y}`);
  await js('window.__editor.getState().undo()');
  const grip = await js('(() => { const h = document.querySelector(".sel-handle"); return h ? h.getBoundingClientRect().width : 0; })()');
  check('손잡이가 터치용 크기다', grip >= 18, grip);

  // 꾸미기: 슬라이더로 글자 크기
  await js(`(() => { const item = [...document.querySelectorAll('.m-pane .quick-item')].find((p) => p.querySelector('span')?.textContent === '크기');
    const range = item.querySelector('input[type=range]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(range, '12'); range.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(150);
  check('꾸미기 탭 슬라이더가 문서에 반영된다', (await state(`s.doc.layers.find((l) => l.kind === 'spec').size`)) === 12);
  await js('window.__editor.getState().undo()');

  // 추가: 이모티콘
  await clickText('.m-tabs button', '추가');
  await sleep(150);
  await shot('m04-add');
  const n0 = await state('s.doc.layers.length');
  await js('document.querySelector(".m-pane .emoji-grid button").click()');
  await sleep(200);
  check('추가 탭에서 이모티콘을 넣는다', (await state('s.doc.layers.length')) === n0 + 1);

  // 배경 갤러리, 내보내기
  await clickText('.m-tabs button', '추가');
  await sleep(100);
  await clickText('.m-actions button', '배경 바꾸기');
  await sleep(1200);
  check('배경 창이 화면을 꽉 채운다', await js('(() => { const r = document.querySelector(".modal").getBoundingClientRect(); return r.width >= window.innerWidth - 1 && document.querySelectorAll(".bg-card").length === 164; })()'));
  await shot('m05-backgrounds');
  await js('document.querySelector(".modal .icon-btn").click()');
  await clickText('.m-top button', '저장');
  await sleep(700);
  check('내보내기 창이 넘치지 않는다', await js('document.documentElement.scrollWidth <= window.innerWidth && !!document.querySelector(".export-preview canvas")'));
  await shot('m06-export');
  await js('document.querySelector(".modal .icon-btn").click()');

  const failed = log.filter((l) => !l.ok);
  fs.writeFileSync(path.join(dir, 'mobile-check.json'), JSON.stringify({ passed: log.length - failed.length, failed: failed.length, log }, null, 1));
};

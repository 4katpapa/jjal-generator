'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const MARKER = '.speccard-web-output.json';
const IMAGE_SETTINGS = 'web-v1-width1700-q86-thumb340-q72-pixel-lossless';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function siteSettings(config, env = process.env) {
  const candidate = env.SITE_URL || config.siteUrl;
  let siteUrl = '';
  if (candidate) {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') throw new Error('SITE_URL must be an HTTPS public website URL.');
    siteUrl = url.href.replace(/\/$/, '');
  }
  return { ...config, siteUrl, googleSiteVerification: env.GOOGLE_SITE_VERIFICATION || config.googleSiteVerification || '' };
}

function replaceOnce(source, needle, replacement) {
  if (source.split(needle).length !== 2) throw new Error(`Web build anchor changed: ${needle.slice(0, 70)}`);
  return source.replace(needle, replacement);
}

function buildHtml(original, config) {
  let html = original;
  const verificationTags = String(config.googleSiteVerification || '').split(/[\s,]+/).filter(Boolean)
    .map((token) => `<meta name="google-site-verification" content="${escapeHtml(token)}" />`).join('\n  ');
  const siteData = config.siteUrl ? `<div itemscope itemtype="https://schema.org/WebSite"><meta itemprop="name" content="${escapeHtml(config.title)}" /><link itemprop="url" href="${escapeHtml(config.siteUrl)}/" /></div>` : '';
  html = replaceOnce(html, '<title>자짤 생성툴</title>', `<title>${escapeHtml(config.title)}</title>
  <meta name="description" content="${escapeHtml(config.description)}" />
  <meta name="theme-color" content="#006cff" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="ko_KR" />
  <meta property="og:site_name" content="${escapeHtml(config.title)}" />
  <meta property="og:title" content="${escapeHtml(config.title)}" />
  <meta property="og:description" content="${escapeHtml(config.description)}" />
  <link rel="icon" href="favicon.png" type="image/png" />
  <link rel="stylesheet" href="web.css" />
  ${config.siteUrl ? `<link rel="canonical" href="${escapeHtml(config.siteUrl)}/" /><meta property="og:url" content="${escapeHtml(config.siteUrl)}/" />` : ''}
  ${verificationTags}`);
  html = replaceOnce(html, "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline';",
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';");
  html = replaceOnce(html, '<body>', `<body class="web-edition">\n  ${siteData}\n  <div id="web-startup" role="status"><p>${escapeHtml(config.title)}을 준비하고 있습니다…</p><button type="button">다시 시도</button></div>\n  <noscript><p class="web-noscript">${escapeHtml(config.title)}은 브라우저에서 실행됩니다. JavaScript를 켜면 카드 편집과 이미지 저장을 사용할 수 있습니다.</p></noscript>`);
  html = replaceOnce(html, '<h1>SPEC BENCH</h1>', `<h1>${escapeHtml(config.title)}</h1>`);
  html = replaceOnce(html, '<span class="sub">PC 사양 카드 작업대</span>', '<span class="sub">무료 자짤생성기 · PC 사양 카드</span>');
  html = replaceOnce(html, '<div class="project-state"', `<details class="web-guide">
        <summary>사용법 · 저장 안내</summary>
        <div><p>${escapeHtml(config.description)}</p>
        ${config.siteUrl ? `<p>공식 웹 주소: <a href="${escapeHtml(config.siteUrl)}/">${escapeHtml(config.siteUrl.replace(/^https:\/\//, ''))}</a></p>` : ''}
        <p>CPU·그래픽카드·메모리와 모니터·키보드 등 주변기기를 입력하고, 배경 프리셋과 아이콘으로 나만의 자짤을 만드세요.</p>
        <ol><li>사양을 직접 입력하거나 여러 줄을 붙여넣습니다.</li><li>배경·색상·글자 외곽선·발광 효과를 조절합니다.</li><li>PNG 또는 WebP로 저장해 커뮤니티에서 사용합니다.</li></ol>
        <p><strong>저장</strong>은 현재 브라우저에 보관합니다. 사이트 데이터를 지우면 저장본이 사라질 수 있으므로, <strong>백업</strong>으로 .speccard 파일을 내려받아 보관하세요. 다른 PC에서는 <strong>파일 열기</strong>로 이어서 편집할 수 있습니다.</p>
        <p>저장된 디자인은 사이트 주소별로 구분됩니다. <a href="https://jjal-generator.pages.dev/" target="_blank" rel="noopener noreferrer">이전 pages.dev 주소</a>에 저장한 디자인은 그곳에서 <strong>백업</strong>한 뒤, 새 주소에서 <strong>파일 열기</strong>로 가져오세요.</p>
        <p>개인 이미지와 입력한 사양은 브라우저에서 처리합니다. PC 부품 자동 감지는 <a href="https://github.com/4katpapa/jjal-generator/releases/latest" target="_blank" rel="noopener noreferrer">Windows 앱</a>에서 지원합니다.</p>
        <p>글꼴은 사용하는 기기에 따라 달라질 수 있습니다. 정밀한 배치는 PC 화면에서 편집하기 좋습니다.</p></div>
      </details>
      <div class="project-state"`);
  html = replaceOnce(html, '>⚙ 사양 자동 채우기</button>', '>사양 붙여넣기</button>');
  html = replaceOnce(html, '<div class="spec-icon-settings">', '<p class="hint web-input-help">PC 사양은 직접 입력하거나 붙여넣어 주세요. 웹에서는 부품 정보를 자동으로 읽을 수 없습니다.</p>\n              <div class="spec-icon-settings">');
  html = replaceOnce(html, 'id="btn-save" class="primary" title="저장"', 'id="btn-save" class="primary" title="현재 브라우저에 저장"');
  html = replaceOnce(html, 'id="btn-copy-image" title="선택 이미지 복사"', 'id="btn-copy-image" title="완성 카드 이미지 복사"');
  html = replaceOnce(html, '<ul id="design-list"', '<p class="hint web-storage-note">이 브라우저에 저장한 디자인입니다. 파일로 보관하려면 백업을 사용하세요.</p><ul id="design-list"');
  html = replaceOnce(html, '· 버전 v3.21</div>', '· 웹판 v3.21</div>');
  html = replaceOnce(html, '<script src="spec-icons.js"></script>', '<script src="spec-text.js"></script>\n  <script src="browser-api.js"></script>\n  <script src="spec-icons.js"></script>');
  return html;
}

async function assertDirectory(directory) {
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || path.resolve(await fs.realpath(directory)) !== path.resolve(directory)) {
    throw new Error(`Expected a physical project directory: ${directory}`);
  }
}

async function filesUnder(directory, prefix = '') {
  const files = [];
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    if (item.isSymbolicLink()) throw new Error(`Linked file is not part of the web build: ${item.name}`);
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) files.push(...await filesUnder(path.join(directory, item.name), relative));
    else if (item.isFile()) files.push(relative);
  }
  return files.sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
}

async function build() {
  await assertDirectory(ROOT);
  await assertDirectory(__dirname);
  const output = path.join(__dirname, 'dist');
  const config = siteSettings(JSON.parse(await fs.readFile(path.join(__dirname, 'site.config.json'), 'utf8')));
  const originalHtml = await fs.readFile(path.join(ROOT, 'renderer/index.html'), 'utf8');
  const html = buildHtml(originalHtml, config);
  // A completed output records its exact file set. Unexpected files are never moved or overwritten.
  if (await fs.stat(output).catch(() => null)) {
    await assertDirectory(output);
    const previous = JSON.parse(await fs.readFile(path.join(output, MARKER), 'utf8'));
    const found = await filesUnder(output);
    if (previous.owner !== 'jjal-generator-web' || JSON.stringify(found) !== JSON.stringify([...previous.files, MARKER].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true })))) {
      throw new Error('web/dist contains unrecognized files. Build stopped to preserve them.');
    }
  }
  const runId = `${Date.now()}-${process.pid}`;
  const stage = path.join(__dirname, `.build-${runId}`);
  await fs.mkdir(stage);
  const write = async (name, bytes) => {
    const destination = path.join(stage, name);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
  };
  await write('index.html', html);
  for (const file of ['app.js', 'v2-core.js', 'spec-icons.js', 'style.css', 'background-library.js', 'background-library.css']) {
    await write(file, await fs.readFile(path.join(ROOT, 'renderer', file)));
  }
  for (const file of ['browser-api.js', 'spec-text.js', 'web.css']) await write(file, await fs.readFile(path.join(__dirname, file)));
  let webIcons = await fs.readFile(path.join(ROOT, 'renderer/spec-icons.js'), 'utf8');
  let iconBytes = 0;
  for (const series of ['mono', 'color', 'pixel']) {
    const atlas = await sharp(path.join(ROOT, `renderer/assets/spec-icons/${series}.png`)).webp({ lossless: true, effort: 5 }).toBuffer();
    iconBytes += atlas.length;
    await write(`assets/spec-icons/${series}.webp`, atlas);
    webIcons = replaceOnce(webIcons, `assets/spec-icons/${series}.png`, `assets/spec-icons/${series}.webp`);
  }
  await write('spec-icons.js', webIcons);
  await write('favicon.png', await sharp(path.join(ROOT, 'build/icon.png')).resize(64, 64).png().toBuffer());

  const originals = path.join(ROOT, 'assets/backgrounds');
  await assertDirectory(originals);
  const images = (await filesUnder(originals)).filter((name) => name.endsWith('.png'));
  const items = [];
  let originalBytes = 0;
  let optimizedBytes = 0;
  let thumbnailBytes = 0;
  let next = 0;
  const convert = async () => {
    while (next < images.length) {
      const file = images[next++];
      const bytes = await fs.readFile(path.join(originals, file));
      const digest = hash(Buffer.concat([bytes, Buffer.from(IMAGE_SETTINGS)])).slice(0, 16);
      const number = path.basename(file).match(/^\d+/)?.[0];
      if (!number) throw new Error(`Background has no numeric prefix: ${file}`);
      const name = path.basename(file, '.png').replace(/_/g, ' ');
      const pixel = /도트|픽셀/.test(file);
      const converted = await sharp(bytes).rotate().resize({ width: 1700, withoutEnlargement: true, kernel: pixel ? 'nearest' : 'lanczos3' })
        .webp(pixel ? { lossless: true, effort: 5 } : { quality: 86, effort: 5 }).toBuffer({ resolveWithObject: true });
      const thumbnail = await sharp(bytes).rotate().resize({ width: 340, withoutEnlargement: true, kernel: pixel ? 'nearest' : 'lanczos3' })
        .webp(pixel ? { lossless: true, effort: 4 } : { quality: 72, effort: 4 }).toBuffer();
      const url = `backgrounds/images/${number}.${digest}.webp`;
      const thumbUrl = `backgrounds/thumbnails/${number}.${digest}.webp`;
      await write(url, converted.data); await write(thumbUrl, thumbnail);
      originalBytes += bytes.length; optimizedBytes += converted.data.length; thumbnailBytes += thumbnail.length;
      items.push({ id: `builtin:${file}`, name, category: path.posix.dirname(file).replace(/_/g, ' '), file,
        source: 'builtin', bytes: converted.data.length, width: converted.info.width, height: converted.info.height, url, thumbnail: thumbUrl });
      if (items.length % 25 === 0) console.log(`Backgrounds: ${items.length}/${images.length}`);
    }
  };
  await Promise.all([convert(), convert(), convert(), convert()]);
  items.sort((a, b) => a.file.localeCompare(b.file, 'ko', { numeric: true }));
  const token = hash(JSON.stringify(items)).slice(0, 20);
  await write('backgrounds/manifest.json', JSON.stringify({ token, status: 'ready', message: '', bundledCount: items.length, items }));
  await write('robots.txt', `User-agent: *\nAllow: /\n${config.siteUrl ? `Sitemap: ${config.siteUrl}/sitemap.xml\n` : ''}`);
  if (config.siteUrl) await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHtml(config.siteUrl)}/</loc></url></urlset>\n`);
  await write('_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
/
  Cache-Control: public, max-age=0, must-revalidate
/:file
  Cache-Control: public, max-age=0, must-revalidate
/assets/spec-icons/*
  Cache-Control: public, max-age=0, must-revalidate
/backgrounds/manifest.json
  Cache-Control: public, max-age=0, must-revalidate
/backgrounds/images/*
  Cache-Control: public, max-age=31536000, immutable
/backgrounds/thumbnails/*
  Cache-Control: public, max-age=31536000, immutable
`);
  // An explicit 404 avoids Pages' SPA fallback returning index.html for missing images.
  await write('404.html', `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>페이지를 찾을 수 없습니다 | ${escapeHtml(config.title)}</title><h1>페이지를 찾을 수 없습니다.</h1><p><a href="/">${escapeHtml(config.title)}로 돌아가기</a></p></html>`);
  const report = { backgrounds: items.length, originalBytes, optimizedBytes, thumbnailBytes, iconBytes,
    categories: new Set(items.map((item) => item.category)).size, siteUrl: config.siteUrl || null };
  const generatedFiles = await filesUnder(stage);
  for (const file of generatedFiles) {
    if ((await fs.stat(path.join(stage, file))).size > 25 * 1024 * 1024) throw new Error(`Asset exceeds Cloudflare Pages limit: ${file}`);
  }
  await write(MARKER, JSON.stringify({ owner: 'jjal-generator-web', files: generatedFiles, report }, null, 2));
  if (await fs.stat(output).catch(() => null)) {
    const archiveRoot = path.join(ROOT, 'work/web-builds');
    await fs.mkdir(archiveRoot, { recursive: true }); await assertDirectory(archiveRoot);
    await fs.rename(output, path.join(archiveRoot, runId));
  }
  await fs.rename(stage, output);
  console.log(JSON.stringify({ output, ...report }, null, 2));
  if (!config.siteUrl) console.log('Public URL not set yet: set SITE_URL before search registration.');
  return report;
}

module.exports = { build, buildHtml, siteSettings };
if (require.main === module) build().catch((error) => { console.error(error); process.exitCode = 1; });

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildHtml, siteSettings } = require('../build.cjs');
const original = fs.readFileSync(path.resolve(__dirname, '../../renderer/index.html'), 'utf8');
const config = require('../site.config.json');

test('Web shell uses the shared editor with browser actions and crawlable instructions', () => {
  const html = buildHtml(original, siteSettings({ ...config, siteUrl: '' }, {}));
  assert.ok(html.includes('<title>자짤생성툴</title>'));
  assert.ok(html.includes('<h1>자짤생성툴</h1>'));
  assert.ok(html.includes('property="og:site_name" content="자짤생성툴"'));
  assert.ok(html.includes('사이트 데이터를 지우면 저장본이 사라질 수'));
  assert.ok(html.indexOf('browser-api.js') < html.indexOf('src="app.js"'));
  assert.ok(html.includes('id="btn-auto" class="primary">사양 붙여넣기'));
  assert.ok(!html.includes('rel="canonical"'));
  assert.ok(!html.includes('itemtype="https://schema.org/WebSite"'));
  assert.ok(html.includes("connect-src 'self'"));
  assert.ok(original.includes('<h1>SPEC BENCH</h1>'));
  assert.ok(html.includes('· 웹판 v4.0.0'));
  for (const file of ['sample-presets.js', 'preset-editor.js', 'preset-editor.css', 'fonts.css']) assert.ok(html.includes(file));
  assert.ok(html.indexOf('src="sample-presets.js"') < html.indexOf('src="app.js"'));
});
test('Search registration uses only the configured public URL and escaped verification token', () => {
  const html = buildHtml(original, siteSettings(config, { SITE_URL: 'https://example.pages.dev', GOOGLE_SITE_VERIFICATION: 'token"<x>' }));
  assert.ok(html.includes('rel="canonical" href="https://example.pages.dev/"'));
  assert.ok(html.includes('itemtype="https://schema.org/WebSite"><meta itemprop="name" content="자짤생성툴" /><link itemprop="url" href="https://example.pages.dev/"'));
  assert.ok(html.includes('token&quot;&lt;x&gt;'));
  assert.throws(() => siteSettings(config, { SITE_URL: 'http://localhost' }));
});
test('Changed editor anchors fail visibly instead of producing a partly adapted web app', () => {
  assert.throws(() => buildHtml(original.replace('<h1>SPEC BENCH</h1>', '<h1>Changed</h1>'), config), /anchor changed/);
});

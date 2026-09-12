'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readJsonWithBackup, writeJsonAtomic } = require('../jsonStore');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'speccard-jsonstore-test-'));
  t.after(() => {
    // 이 테스트가 만든 단일 디렉터리의 파일만 정리한다.
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  });
  return { dir, file: path.join(dir, 'recovery.json') };
}

test('atomic save replaces existing files and retains the previous complete JSON', (t) => {
  const { dir, file } = fixture(t);
  writeJsonAtomic(file, { state: { name: '첫 번째' } });
  writeJsonAtomic(file, { state: { name: '두 번째' } });
  writeJsonAtomic(file, { state: { name: '세 번째' } });
  assert.deepEqual(readJsonWithBackup(file), { value: { state: { name: '세 번째' } }, fromBackup: false });
  assert.deepEqual(JSON.parse(fs.readFileSync(`${file}.bak`, 'utf8')), { state: { name: '두 번째' } });
  assert.deepEqual(fs.readdirSync(dir).sort(), ['recovery.json', 'recovery.json.bak']);
});

test('a corrupt or missing primary file falls back to the valid backup', (t) => {
  const { file } = fixture(t);
  writeJsonAtomic(file, { name: '보존할 상태' });
  writeJsonAtomic(file, { name: '다음 상태' });
  fs.writeFileSync(file, '{broken');
  assert.deepEqual(readJsonWithBackup(file), { value: { name: '보존할 상태' }, fromBackup: true });
  fs.unlinkSync(file);
  assert.equal(readJsonWithBackup(file).value.name, '보존할 상태');
});

test('saving over a corrupt primary does not replace a valid backup with corrupt bytes', (t) => {
  const { file } = fixture(t);
  writeJsonAtomic(file, { name: '백업' });
  writeJsonAtomic(file, { name: '손상될 파일' });
  fs.writeFileSync(file, '{broken');
  const backup = fs.readFileSync(`${file}.bak`);
  writeJsonAtomic(file, { name: '복구 후 저장' });
  assert.deepEqual(fs.readFileSync(`${file}.bak`), backup);
  assert.equal(readJsonWithBackup(file).value.name, '복구 후 저장');
});

test('validation can recover malformed envelopes while a clear marker suppresses stale recovery', (t) => {
  const { file } = fixture(t);
  const validate = (value) => value && Object.hasOwn(value, 'state');
  writeJsonAtomic(file, { state: { name: '복구할 디자인' } });
  writeJsonAtomic(file, { invalid: true });
  assert.equal(readJsonWithBackup(file, validate).fromBackup, true);
  writeJsonAtomic(file, { state: null });
  assert.deepEqual(readJsonWithBackup(file, validate), { value: { state: null }, fromBackup: false });
});

test('failed promotion keeps the primary and a complete backup readable', (t) => {
  const { dir, file } = fixture(t);
  writeJsonAtomic(file, { name: '원본' });
  const before = fs.readFileSync(file);
  const rename = fs.renameSync;
  const mocked = t.mock.method(fs, 'renameSync', (from, to) => {
    if (to === file) throw Object.assign(new Error('simulated promotion failure'), { code: 'EACCES' });
    return rename(from, to);
  });
  assert.throws(() => writeJsonAtomic(file, { name: '새 내용' }), /promotion failure/);
  mocked.mock.restore();
  assert.deepEqual(fs.readFileSync(file), before);
  assert.deepEqual(fs.readFileSync(`${file}.bak`), before);
  assert.ok(fs.readdirSync(dir).every((name) => !name.endsWith('.tmp')));
});

test('failed backup promotion never replaces the primary', (t) => {
  const { file } = fixture(t);
  writeJsonAtomic(file, { name: '백업' });
  writeJsonAtomic(file, { name: '원본' });
  const before = fs.readFileSync(file);
  const backup = fs.readFileSync(`${file}.bak`);
  const rename = fs.renameSync;
  const mocked = t.mock.method(fs, 'renameSync', (from, to) => {
    if (to === `${file}.bak`) throw new Error('simulated backup failure');
    return rename(from, to);
  });
  assert.throws(() => writeJsonAtomic(file, { name: '새 내용' }), /backup failure/);
  mocked.mock.restore();
  assert.deepEqual(fs.readFileSync(file), before);
  assert.deepEqual(fs.readFileSync(`${file}.bak`), backup);
});

test('an interrupted temporary write leaves the original intact', (t) => {
  const { dir, file } = fixture(t);
  writeJsonAtomic(file, { name: '원본' });
  const before = fs.readFileSync(file);
  const write = fs.writeFileSync;
  const mocked = t.mock.method(fs, 'writeFileSync', (target, contents, options) => {
    if (typeof target === 'number') {
      write(target, String(contents).slice(0, 5), options);
      throw new Error('simulated interrupted write');
    }
    return write(target, contents, options);
  });
  assert.throws(() => writeJsonAtomic(file, { name: '새 내용' }), /interrupted write/);
  mocked.mock.restore();
  assert.deepEqual(fs.readFileSync(file), before);
  assert.deepEqual(fs.readdirSync(dir), ['recovery.json']);
});

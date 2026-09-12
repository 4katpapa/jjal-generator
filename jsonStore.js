'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function readJsonWithBackup(fullPath, validate = () => true) {
  let firstError;
  for (const candidate of [fullPath, `${fullPath}.bak`]) {
    try {
      const value = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (!validate(value)) throw new Error('저장 파일 형식이 올바르지 않습니다.');
      return { value, fromBackup: candidate !== fullPath };
    } catch (error) {
      firstError ||= error;
    }
  }
  throw firstError;
}

function removeTemp(filename) {
  if (!filename) return;
  try { fs.unlinkSync(filename); } catch (_) { /* 실패한 임시 파일은 다음 저장에 재사용하지 않는다. */ }
}

function stageFile(fullPath, contents) {
  const temp = path.join(path.dirname(fullPath), `.${path.basename(fullPath)}.${randomUUID()}.tmp`);
  let fd;
  try {
    fd = fs.openSync(temp, 'wx');
    fs.writeFileSync(fd, contents, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    return temp;
  } catch (error) {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch (_) {} }
    removeTemp(temp);
    throw error;
  }
}

// 완성된 파일만 같은 디렉터리에서 교체한다. 백업 실패 시 원본을 교체하지 않는다.
function writeJsonAtomic(fullPath, payload) {
  const contents = JSON.stringify(payload, null, 2);
  if (contents === undefined) throw new Error('저장할 내용이 없습니다.');
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  let temp;
  let backupTemp;
  try {
    temp = stageFile(fullPath, contents);
    let previous;
    try {
      previous = fs.readFileSync(fullPath, 'utf8');
      JSON.parse(previous);
    } catch (error) {
      // 손상된 주 파일이 정상 백업을 덮어쓰지 않도록 한다.
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
      previous = undefined;
    }
    if (previous !== undefined) {
      backupTemp = stageFile(`${fullPath}.bak`, previous);
      fs.renameSync(backupTemp, `${fullPath}.bak`);
      backupTemp = undefined;
    }
    fs.renameSync(temp, fullPath);
    temp = undefined;
  } finally {
    removeTemp(temp);
    removeTemp(backupTemp);
  }
}

module.exports = { readJsonWithBackup, writeJsonAtomic };

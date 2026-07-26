'use strict';
const { spawn } = require('child_process');

// PowerShell 스크립트: 하드웨어 정보를 JSON으로 출력한다.
const PS_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$out = [ordered]@{}

# CPU
$out.cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name

# 메인보드
$b = Get-CimInstance Win32_BaseBoard | Select-Object -First 1
$out.mb = ($b.Manufacturer + ' ' + $b.Product)

# RAM (모듈별)
$out.ram = @(Get-CimInstance Win32_PhysicalMemory | ForEach-Object {
  [ordered]@{
    manufacturer = $_.Manufacturer
    part         = ($_.PartNumber).Trim()
    gb           = [math]::Round($_.Capacity / 1GB)
    speed        = $_.ConfiguredClockSpeed
  }
})

# 그래픽카드 (전부 넘기고 JS에서 필터)
$out.vga = @(Get-CimInstance Win32_VideoController | ForEach-Object {
  [ordered]@{ name = $_.Name; ram = [int64]$_.AdapterRAM }
})

# 저장장치
$out.disks = @(Get-CimInstance Win32_DiskDrive | Sort-Object Index | ForEach-Object {
  [ordered]@{
    model = ($_.Model).Trim()
    gb    = [math]::Round($_.Size / 1GB)
    bus   = $_.InterfaceType
  }
})

$out | ConvertTo-Json -Depth 5 -Compress
`;

// 문자열 정리 헬퍼
function cleanCpu(name) {
  if (!name) return '';
  return name
    .replace(/\(R\)|\(TM\)|®|™/g, '')
    .replace(/\d+-Core Processor/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanMb(name) {
  if (!name) return '';
  return name
    .replace(/Technology Co\.?,? ?Ltd\.?/i, '')
    .replace(/Micro-Star International Co\.?,? ?Ltd\.?/i, 'MSI')
    .replace(/ASUSTeK COMPUTER INC\.?/i, 'ASUS')
    .replace(/\s+/g, ' ')
    .trim();
}

function bytesToGb(gb) {
  return `${gb}GB`;
}

// 동일한 RAM 모듈을 "브랜드 DDR5-6000 32GB*2" 형태로 묶는다.
function summarizeRam(mods) {
  if (!mods || !mods.length) return [];
  const groups = new Map();
  for (const m of mods) {
    const key = `${m.manufacturer}|${m.gb}|${m.speed}`;
    if (!groups.has(key)) groups.set(key, { ...m, count: 0 });
    groups.get(key).count++;
  }
  return [...groups.values()].map((g) => {
    const brand = (g.manufacturer && g.manufacturer !== 'Unknown') ? g.manufacturer : '';
    const ddr = g.speed ? `DDR5-${g.speed}` : 'DDR5';
    const size = `${g.gb}gb`;
    const mult = g.count > 1 ? `*${g.count}` : '';
    return `${brand} ${ddr} ${size}${mult}`.replace(/\s+/g, ' ').trim();
  });
}

// 실제 GPU만 골라낸다 (가상 디스플레이/원격 어댑터 제외).
function pickGpus(vgas) {
  if (!vgas) return [];
  const bad = /virtual|remote|basic|parsec|sudomaker|displaylink|meta|citrix|idd|mirror/i;
  const real = vgas.filter((v) => v.name && !bad.test(v.name));
  const list = real.length ? real : vgas;
  return list
    .sort((a, b) => (b.ram || 0) - (a.ram || 0))
    .map((v) => v.name.replace(/\s+/g, ' ').trim());
}

function niceSize(gb) {
  if (gb >= 1000) {
    const tb = gb / 1000;
    return `${Math.round(tb)}TB`;
  }
  return `${gb}GB`;
}

function readSpecs() {
  return new Promise((resolve, reject) => {
    // 스크립트 전체를 한 덩어리로 넘겨 부분 파싱 문제를 피한다 (UTF-16LE base64).
    const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');
    const ps = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true }
    );
    let out = '';
    let err = '';
    ps.stdout.on('data', (d) => (out += d.toString()));
    ps.stderr.on('data', (d) => (err += d.toString()));
    ps.on('error', reject);
    ps.on('close', (code) => {
      if (code !== 0 && !out.trim()) {
        return reject(new Error(err || `powershell exited ${code}`));
      }
      try {
        const raw = JSON.parse(out.trim());
        resolve(formatRows(raw));
      } catch (e) {
        reject(new Error('사양 파싱 실패: ' + e.message + '\n' + out));
      }
    });
  });
}

// 렌더러가 바로 쓰는 {label, value} 행 배열로 변환
function formatRows(raw) {
  const rows = [];
  if (raw.cpu) rows.push({ label: 'CPU', value: cleanCpu(raw.cpu) });
  if (raw.mb) rows.push({ label: 'MB', value: cleanMb(raw.mb) });

  for (const r of summarizeRam(raw.ram || [])) {
    rows.push({ label: 'RAM', value: r });
  }

  for (const g of pickGpus(raw.vga || [])) {
    rows.push({ label: 'VGA', value: g });
  }

  for (const d of raw.disks || []) {
    rows.push({ label: 'SSD', value: `${d.model} ${niceSize(d.gb)}`.trim() });
  }

  // 자동으로 알 수 없는 항목은 빈 값으로 자리만 만들어 준다.
  rows.push({ label: 'PSU', value: '' });
  rows.push({ label: 'CHA', value: '' });
  rows.push({ label: 'CS', value: '' });

  return rows;
}

module.exports = { readSpecs };

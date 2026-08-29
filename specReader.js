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
    manufacturer       = ([string]$_.Manufacturer).Trim()
    part               = ([string]$_.PartNumber).Trim()
    capacityBytes      = [int64]$_.Capacity
    configuredSpeed    = [int]$_.ConfiguredClockSpeed
    speed              = [int]$_.Speed
    smbiosMemoryType   = [int]$_.SMBIOSMemoryType
    memoryType         = [int]$_.MemoryType
  }
})

# 그래픽카드 (전부 넘기고 JS에서 필터)
$out.vga = @(Get-CimInstance Win32_VideoController | ForEach-Object {
  [ordered]@{ name = $_.Name; ram = [int64]$_.AdapterRAM }
})

# 저장장치. Get-PhysicalDisk 정보가 있으면 Win32_DiskDrive.Index와 DeviceId로 연결하고,
# 없는 환경에서는 Win32_DiskDrive의 모델/인터페이스 단서만 넘겨 JS에서 보수적으로 판별한다.
$physicalById = @{}
$physicalDisks = @(Get-PhysicalDisk)
$physicalDisks | ForEach-Object {
  $physicalById[[string]$_.DeviceId] = $_
}
$out.disks = @(Get-CimInstance Win32_DiskDrive | Sort-Object Index | ForEach-Object {
  $disk = $_
  $pd = $physicalById[[string]$disk.Index]
  if (-not $pd -and $disk.Model) {
    $pd = $physicalDisks | Where-Object {
      ([string]$_.FriendlyName).Trim() -eq ([string]$disk.Model).Trim()
    } | Select-Object -First 1
  }
  [ordered]@{
    model          = if ($disk.Model) { ([string]$disk.Model).Trim() } elseif ($pd) { ([string]$pd.FriendlyName).Trim() } else { '' }
    sizeBytes      = if ($disk.Size) { [int64]$disk.Size } elseif ($pd) { [int64]$pd.Size } else { 0 }
    mediaType      = if ($pd) { [string]$pd.MediaType } else { '' }
    wmiMediaType   = [string]$disk.MediaType
    busType        = if ($pd) { [string]$pd.BusType } else { '' }
    interfaceType  = [string]$disk.InterfaceType
    spindleSpeed   = if ($pd) { [int64]$pd.SpindleSpeed } else { 0 }
    pnpDeviceId    = [string]$disk.PNPDeviceID
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

function cleanText(value) {
  return value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizePartNumber(value) {
  return cleanText(value).replace(/\s+/g, '').toUpperCase();
}

function isUsefulText(value) {
  const s = cleanText(value);
  return !!s && !/^(unknown|undefined|n\/?a|none|default string|to be filled by o\.?e\.?m\.?)$/i.test(s);
}

// SMBIOS Memory Type 값. 확실히 알려진 세대만 표기하고, 모르는 값은 추측하지 않는다.
const MEMORY_TYPES = new Map([
  [20, 'DDR'], [21, 'DDR2'], [22, 'DDR2'], [24, 'DDR3'], [26, 'DDR4'],
  [27, 'LPDDR'], [28, 'LPDDR2'], [29, 'LPDDR3'], [30, 'LPDDR4'],
  [34, 'DDR5'], [35, 'LPDDR5'],
]);

function memoryTypeLabel(mod) {
  if (!mod || typeof mod !== 'object') return '';
  const raw = mod.smbiosMemoryType != null ? mod.smbiosMemoryType : mod.memoryType;
  if (typeof raw === 'string') {
    const normalized = cleanText(raw).toUpperCase().replace(/[ _-]+/g, '');
    const known = {
      DDR: 'DDR', DDR2: 'DDR2', DDR3: 'DDR3', DDR4: 'DDR4', DDR5: 'DDR5',
      LPDDR: 'LPDDR', LPDDR2: 'LPDDR2', LPDDR3: 'LPDDR3', LPDDR4: 'LPDDR4', LPDDR5: 'LPDDR5',
    };
    if (known[normalized]) return known[normalized];
  }
  return MEMORY_TYPES.get(toFiniteNumber(raw)) || '';
}

function ramCapacityLabel(mod) {
  const bytes = toFiniteNumber(mod && (mod.capacityBytes != null ? mod.capacityBytes : mod.capacity));
  if (bytes > 0) {
    const gib = bytes / (1024 ** 3);
    const rounded = Math.abs(gib - Math.round(gib)) < 0.05 ? Math.round(gib) : Number(gib.toFixed(1));
    return `${rounded}GB`;
  }
  const legacyGb = toFiniteNumber(mod && mod.gb);
  return legacyGb > 0 ? `${legacyGb}GB` : '';
}

function ramSpeed(mod) {
  return Math.round(toFiniteNumber(mod && (mod.configuredSpeed || mod.speed)));
}

// 동일한 RAM 모듈을 "브랜드 DDR5-6000 32GB*2" 형태로 묶는다.
// part number도 키에 포함해 같은 용량/속도의 서로 다른 키트를 합치지 않고,
// 서로 다른 키트를 구분해야 할 때만 결과 문구에 part number를 노출한다.
function summarizeRam(mods) {
  if (!Array.isArray(mods) || !mods.length) return [];
  const groups = new Map();
  for (const m of mods) {
    if (!m || typeof m !== 'object') continue;
    const manufacturer = isUsefulText(m.manufacturer) ? cleanText(m.manufacturer) : '';
    const part = isUsefulText(m.part) ? cleanText(m.part) : '';
    const partKey = normalizePartNumber(part);
    const type = memoryTypeLabel(m);
    const speed = ramSpeed(m);
    const size = ramCapacityLabel(m);
    if (!manufacturer && !part && !type && !speed && !size) continue;
    const key = [manufacturer.toUpperCase(), partKey, type, speed, size].join('|');
    if (!groups.has(key)) groups.set(key, { manufacturer, part, type, speed, size, count: 0 });
    groups.get(key).count++;
  }
  const grouped = [...groups.values()];
  const signatureCounts = new Map();
  for (const g of grouped) {
    const signature = [g.manufacturer.toUpperCase(), g.type, g.speed, g.size].join('|');
    signatureCounts.set(signature, (signatureCounts.get(signature) || 0) + 1);
  }
  return grouped.map((g) => {
    const memorySpec = g.type ? (g.speed ? `${g.type}-${g.speed}` : g.type) : (g.speed ? `${g.speed}MHz` : '');
    const mult = g.count > 1 ? `*${g.count}` : '';
    const signature = [g.manufacturer.toUpperCase(), g.type, g.speed, g.size].join('|');
    // part number는 서로 다른 키트를 구분해야 할 때만 노출해 카드 문구가 불필요하게 길어지지 않게 한다.
    const visiblePart = g.part && (!g.manufacturer || signatureCounts.get(signature) > 1) ? g.part : '';
    return `${g.manufacturer} ${visiblePart} ${memorySpec} ${g.size}${mult}`.replace(/\s+/g, ' ').trim();
  });
}

function cleanGpuName(name) {
  return cleanText(name).replace(/\(R\)|\(TM\)|®|™/gi, '').replace(/\s+/g, ' ').trim();
}

function gpuClass(name, ram) {
  const n = cleanGpuName(name);
  if (/\b(nvidia|geforce|quadro|tesla|rtx|gtx)\b|\bradeon\s+(rx|pro|vii)\b|\bintel\s+arc\s+[ab]\d/i.test(n)) return 3;
  if (/\b(uhd|iris|hd)\s+graphics\b|\bintel\b.*\bgraphics\b|\bradeon\s+graphics\b|\bvega\s*\d*\s+graphics\b/i.test(n)) return 1;
  return ram >= 2 * (1024 ** 3) ? 2 : 1.5;
}

// 가상 어댑터를 제거하고, 명시적 외장 GPU → VRAM 단서가 있는 GPU → 내장 GPU 순으로 정렬한다.
function pickGpus(vgas) {
  if (!Array.isArray(vgas)) return [];
  const bad = /virtual|remote|microsoft basic|basic render|parsec|sudomaker|displaylink|citrix|\bidd\b|mirror|indirect display/i;
  const unique = new Map();
  for (const v of vgas) {
    if (!v || !v.name) continue;
    const name = cleanGpuName(v.name);
    if (!name || bad.test(name)) continue;
    const ram = toFiniteNumber(v.ram);
    const key = name.toLowerCase();
    const prev = unique.get(key);
    if (!prev || ram > prev.ram) unique.set(key, { name, ram });
  }
  return [...unique.values()]
    .sort((a, b) => gpuClass(b.name, b.ram) - gpuClass(a.name, a.ram) || b.ram - a.ram || a.name.localeCompare(b.name, 'en'))
    .map((v) => v.name);
}

function compactDecimal(value, digits = 2) {
  return Number(value.toFixed(digits)).toString();
}

// 새 판독값(sizeBytes)은 제조사 표기와 같은 10진 GB/TB로 표시한다.
// 구형 저장값(gb)은 실제로 GiB였으므로 GiB/TiB 단위를 명시해 서로 섞지 않는다.
function formatDiskCapacity(disk) {
  const bytes = toFiniteNumber(disk && (disk.sizeBytes != null ? disk.sizeBytes : disk.size));
  if (bytes > 0) {
    if (bytes >= 1e12) {
      const tb = bytes / 1e12;
      const nearest = Math.round(tb);
      return `${Math.abs(tb - nearest) < 0.06 ? nearest : compactDecimal(tb)}TB`;
    }
    if (bytes >= 1e9) return `${Math.round(bytes / 1e9)}GB`;
    if (bytes >= 1e6) return `${Math.round(bytes / 1e6)}MB`;
    return `${Math.round(bytes)}B`;
  }
  const gib = toFiniteNumber(disk && disk.gb);
  if (gib <= 0) return '';
  return gib >= 1024 ? `${compactDecimal(gib / 1024)}TiB` : `${compactDecimal(gib)}GiB`;
}

function classifyDisk(disk) {
  if (!disk || typeof disk !== 'object') return 'DRIVE';
  const media = cleanText(disk.mediaType || disk.physicalMediaType || disk.wmiMediaType).toUpperCase();
  const bus = cleanText(disk.busType || disk.bus).toUpperCase();
  const iface = cleanText(disk.interfaceType).toUpperCase();
  const model = cleanText(disk.model);
  const pnp = cleanText(disk.pnpDeviceId);
  const spindle = toFiniteNumber(disk.spindleSpeed);

  if (bus === 'NVME' || iface === 'NVME' || /NVME/i.test(`${model} ${pnp}`)) return 'NVMe';
  if (media === 'SSD' || /\bSSD\b|SOLID[ -]?STATE/i.test(model)) return 'SSD';
  if (media === 'HDD' || (spindle > 0 && spindle < 100000) || /\bHDD\b/i.test(model)) return 'HDD';
  return 'DRIVE';
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
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
  raw = raw && typeof raw === 'object' ? raw : {};
  const rows = [];
  const cpu = cleanCpu(raw.cpu);
  const mb = cleanMb(raw.mb);
  if (cpu) rows.push({ label: 'CPU', value: cpu });
  if (mb) rows.push({ label: 'MB', value: mb });

  for (const r of summarizeRam(toArray(raw.ram))) {
    rows.push({ label: 'RAM', value: r });
  }

  for (const g of pickGpus(toArray(raw.vga))) {
    rows.push({ label: 'VGA', value: g });
  }

  for (const d of toArray(raw.disks)) {
    if (!d || typeof d !== 'object') continue;
    const value = `${cleanText(d.model)} ${formatDiskCapacity(d)}`.trim();
    if (value) rows.push({ label: classifyDisk(d), value });
  }

  return rows;
}

module.exports = {
  readSpecs,
  formatRows,
  summarizeRam,
  pickGpus,
  classifyDisk,
  formatDiskCapacity,
  memoryTypeLabel,
  normalizePartNumber,
  cleanCpu,
  cleanMb,
};

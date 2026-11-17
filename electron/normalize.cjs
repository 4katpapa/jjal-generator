'use strict';

// Windows가 알려 준 원시 장치 정보를 자짤에 적을 한 줄짜리 사양으로 다듬는다.
// 확실한 것만 만든다: 파워·케이스·쿨러처럼 운영체제가 알 수 없는 부품은 행을 만들지 않는다.

const MAKERS = [
  [/gigabyte/i, 'Gigabyte'], [/asustek|asus/i, 'ASUS'], [/micro-star|msi/i, 'MSI'],
  [/asrock/i, 'ASRock'], [/biostar/i, 'BIOSTAR'], [/lenovo/i, 'Lenovo'], [/dell/i, 'Dell'],
  [/hewlett|^hp$/i, 'HP'], [/samsung/i, 'Samsung'], [/intel/i, 'Intel'],
];

const DDR = { 20: 'DDR', 21: 'DDR2', 24: 'DDR3', 26: 'DDR4', 34: 'DDR5' };
const COMMON_GB = [120, 128, 240, 250, 256, 480, 500, 512, 960];

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function list(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function cpuName(name) {
  return clean(name)
    .replace(/\((R|TM|C)\)/gi, '')
    .replace(/\bCPU\b/gi, '')
    .replace(/@.*$/, '')
    .replace(/\b\d+-Core Processor\b/i, '')
    .replace(/\bProcessor\b/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function boardName(board) {
  const maker = clean(board.Manufacturer);
  const product = clean(board.Product);
  const short = (MAKERS.find(([re]) => re.test(maker)) ?? [null, maker])[1];
  if (!product) return '';
  return product.toLowerCase().startsWith(short.toLowerCase()) ? product : clean(`${short} ${product}`);
}

function memoryRows(memory) {
  const groups = new Map();
  for (const m of memory) {
    const gb = Math.round(Number(m.Capacity) / 2 ** 30);
    if (!gb) continue;
    const speed = Number(m.ConfiguredClockSpeed) || Number(m.Speed) || 0;
    const key = `${m.SMBIOSMemoryType}|${gb}|${speed}`;
    const g = groups.get(key) ?? { type: DDR[Number(m.SMBIOSMemoryType)] ?? '', gb, speed, count: 0 };
    g.count += 1;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => clean(
    `${g.type} ${g.gb}GB${g.count > 1 ? `*${g.count}` : ''}${g.speed ? ` ${g.speed}MHz` : ''}`,
  ));
}

function gpuNames(gpus) {
  return gpus
    .filter((g) => /^PCI\\/i.test(String(g.PNPDeviceID ?? '')))
    .map((g) => clean(g.Name))
    .filter((n) => n && !/basic (display|render)|virtual|remote|parsec|indirect|mirror/i.test(n));
}

function sizeText(bytes) {
  const gb = Number(bytes) / 1e9;
  if (!gb) return '';
  if (gb >= 900) {
    const tb = Math.round((gb / 1000) * 2) / 2;
    return `${tb}TB`;
  }
  const near = COMMON_GB.reduce((a, b) => (Math.abs(b - gb) < Math.abs(a - gb) ? b : a));
  return `${Math.abs(near - gb) / gb < 0.08 ? near : Math.round(gb)}GB`;
}

function diskRows(disks) {
  const rows = [];
  for (const d of disks) {
    const bus = String(d.BusType ?? '').toLowerCase();
    const media = String(d.MediaType ?? '').toLowerCase();
    if (bus === 'usb' || bus === '7' || bus === 'sd' || bus === '12' || bus === 'virtual' || bus === 'file backed virtual') continue;
    let label;
    if (bus === 'nvme' || bus === '17') label = 'NVMe';
    else if (media === 'ssd' || media === '4') label = 'SSD';
    else if (media === 'hdd' || media === '3') label = 'HDD';
    else continue;
    const name = clean(d.FriendlyName);
    if (!name) continue;
    const size = sizeText(d.Size);
    rows.push({ label, value: size && !name.toUpperCase().includes(size) ? `${name} ${size}` : name });
  }
  const order = { NVMe: 0, SSD: 1, HDD: 2 };
  return rows.sort((a, b) => order[a.label] - order[b.label]);
}

/** @returns {{label: string, value: string}[]} */
function normalizeSpecs(raw) {
  const rows = [];
  const cpu = list(raw.cpu).map((c) => cpuName(c.Name)).filter(Boolean)[0];
  if (cpu) rows.push({ label: 'CPU', value: cpu });
  const board = list(raw.board).map(boardName).filter(Boolean)[0];
  if (board) rows.push({ label: 'MB', value: board });
  for (const value of memoryRows(list(raw.memory))) rows.push({ label: 'RAM', value });
  for (const value of gpuNames(list(raw.gpu))) rows.push({ label: 'VGA', value });
  rows.push(...diskRows(list(raw.disks)));
  return rows;
}

module.exports = { normalizeSpecs, cpuName, boardName, sizeText };

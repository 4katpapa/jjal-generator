'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatRows,
  summarizeRam,
  pickGpus,
  classifyDisk,
  formatDiskCapacity,
  memoryTypeLabel,
  normalizePartNumber,
} = require('../specReader');

const GiB = 1024 ** 3;

test('SMBIOS 메모리 타입은 알려진 DDR/LPDDR 세대만 반환한다', () => {
  assert.equal(memoryTypeLabel({ smbiosMemoryType: 26 }), 'DDR4');
  assert.equal(memoryTypeLabel({ smbiosMemoryType: 34 }), 'DDR5');
  assert.equal(memoryTypeLabel({ smbiosMemoryType: 30 }), 'LPDDR4');
  assert.equal(memoryTypeLabel({ smbiosMemoryType: 'LPDDR5' }), 'LPDDR5');
  assert.equal(memoryTypeLabel({ smbiosMemoryType: 0 }), '');
  assert.equal(memoryTypeLabel({ smbiosMemoryType: 99 }), '');
});

test('DDR4/DDR5 RAM을 part number까지 포함해 올바르게 묶는다', () => {
  const rows = summarizeRam([
    {
      manufacturer: 'Kingston', part: 'KF432C16', capacityBytes: 16 * GiB,
      configuredSpeed: 3200, smbiosMemoryType: 26,
    },
    {
      manufacturer: 'Kingston', part: 'kf432 c16 ', capacityBytes: 16 * GiB,
      configuredSpeed: 3200, smbiosMemoryType: 26,
    },
    {
      manufacturer: 'SK hynix', part: 'HMCG88AGBUA', capacityBytes: 32 * GiB,
      configuredSpeed: 5600, smbiosMemoryType: 34,
    },
  ]);

  assert.deepEqual(rows, [
    'Kingston DDR4-3200 16GB*2',
    'SK hynix DDR5-5600 32GB',
  ]);
});

test('같은 브랜드/용량/속도라도 다른 part number는 합치지 않는다', () => {
  const rows = summarizeRam([
    { manufacturer: 'Crucial', part: 'KIT-A', gb: 16, speed: 3600, smbiosMemoryType: 26 },
    { manufacturer: 'Crucial', part: 'KIT-B', gb: 16, speed: 3600, smbiosMemoryType: 26 },
  ]);

  assert.deepEqual(rows, [
    'Crucial KIT-A DDR4-3600 16GB',
    'Crucial KIT-B DDR4-3600 16GB',
  ]);
  assert.equal(normalizePartNumber(' kit-a '), 'KIT-A');
});

test('타입을 모르는 RAM은 DDR 세대를 추측하지 않고 속도만 MHz로 표시한다', () => {
  assert.deepEqual(summarizeRam([
    { manufacturer: 'Crucial', part: 'CT8G4', gb: 8, speed: 3200, smbiosMemoryType: 0 },
  ]), ['Crucial 3200MHz 8GB']);
});

test('NVMe/SATA SSD/HDD/불명 저장장치를 보수적으로 분류한다', () => {
  const disks = [
    { model: 'Fast Disk', mediaType: 'SSD', busType: 'NVMe', sizeBytes: 1e12 },
    { model: 'Samsung SSD 870 EVO', mediaType: 'SSD', busType: 'SATA', sizeBytes: 500e9 },
    { model: 'WD Blue', mediaType: 'HDD', busType: 'SATA', spindleSpeed: 7200, sizeBytes: 2e12 },
    { model: 'Mystery Device', wmiMediaType: 'Fixed hard disk media', interfaceType: 'SCSI', sizeBytes: 250e9 },
  ];

  assert.deepEqual(disks.map(classifyDisk), ['NVMe', 'SSD', 'HDD', 'DRIVE']);
  assert.deepEqual(formatRows({ disks }), [
    { label: 'NVMe', value: 'Fast Disk 1TB' },
    { label: 'SSD', value: 'Samsung SSD 870 EVO 500GB' },
    { label: 'HDD', value: 'WD Blue 2TB' },
    { label: 'DRIVE', value: 'Mystery Device 250GB' },
  ]);
});

test('모델/PNP의 NVMe 단서와 모델의 SSD 단서를 fallback으로 사용한다', () => {
  assert.equal(classifyDisk({ model: 'Generic Controller', pnpDeviceId: 'PCI\\NVME_DEV_1234' }), 'NVMe');
  assert.equal(classifyDisk({ model: 'Portable Solid State Drive', interfaceType: 'USB' }), 'SSD');
  assert.equal(classifyDisk({ model: 'Unidentified USB Drive', interfaceType: 'USB' }), 'DRIVE');
});

test('새 byte 용량은 10진 GB/TB, 구형 gb 값은 GiB/TiB로 명시한다', () => {
  assert.equal(formatDiskCapacity({ sizeBytes: 1_000_204_886_016 }), '1TB');
  assert.equal(formatDiskCapacity({ sizeBytes: 1_500_000_000_000 }), '1.5TB');
  assert.equal(formatDiskCapacity({ sizeBytes: 512_000_000_000 }), '512GB');
  assert.equal(formatDiskCapacity({ gb: 954 }), '954GiB');
  assert.equal(formatDiskCapacity({ gb: 1908 }), '1.86TiB');
});

test('가상 GPU를 제거하고 외장 GPU를 내장 GPU보다 먼저 정렬하며 중복 이름을 합친다', () => {
  const rows = pickGpus([
    { name: 'Intel(R) UHD Graphics 770', ram: 1 * GiB },
    { name: 'Microsoft Basic Display Adapter', ram: 0 },
    { name: 'NVIDIA GeForce RTX 4090', ram: 4 * GiB },
    { name: 'NVIDIA GeForce RTX 4090', ram: 24 * GiB },
    { name: 'AMD Radeon RX 7900 XTX', ram: 0 },
    { name: 'Parsec Virtual Display Adapter', ram: 8 * GiB },
  ]);

  assert.deepEqual(rows, [
    'NVIDIA GeForce RTX 4090',
    'AMD Radeon RX 7900 XTX',
    'Intel UHD Graphics 770',
  ]);
});

test('가상 GPU밖에 없으면 허위 VGA 행을 만들지 않는다', () => {
  assert.deepEqual(pickGpus([
    { name: 'Microsoft Basic Display Adapter', ram: 0 },
    { name: 'Remote Display Adapter', ram: 0 },
  ]), []);
});

test('formatRows는 부분 결과만 반환하고 알 수 없는 PSU/CHA/CS 빈 행을 만들지 않는다', () => {
  assert.deepEqual(formatRows(null), []);
  assert.deepEqual(formatRows({}), []);
  assert.deepEqual(formatRows({
    cpu: 'AMD Ryzen 7 9800X3D 8-Core Processor',
    ram: {
      manufacturer: 'Unknown', part: '', capacityBytes: 32 * GiB,
      configuredSpeed: 6000, smbiosMemoryType: 34,
    },
  }), [
    { label: 'CPU', value: 'AMD Ryzen 7 9800X3D' },
    { label: 'RAM', value: 'DDR5-6000 32GB' },
  ]);
});

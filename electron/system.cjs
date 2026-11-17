'use strict';

const { execFile } = require('node:child_process');
const { normalizeSpecs } = require('./normalize.cjs');

const UTF8 = '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $ErrorActionPreference=\'SilentlyContinue\'; ';

const SPEC_SCRIPT = `${UTF8}
$o = [ordered]@{}
$o.cpu = @(Get-CimInstance Win32_Processor | Select-Object Name)
$o.board = @(Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer, Product)
$o.memory = @(Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity, Speed, ConfiguredClockSpeed, SMBIOSMemoryType)
$o.gpu = @(Get-CimInstance Win32_VideoController | Select-Object Name, PNPDeviceID)
$o.disks = @(Get-PhysicalDisk | ForEach-Object { [pscustomobject]@{ FriendlyName = $_.FriendlyName; MediaType = [string]$_.MediaType; BusType = [string]$_.BusType; Size = $_.Size } })
$o | ConvertTo-Json -Depth 4 -Compress`;

const FONT_SCRIPT = `${UTF8}
Add-Type -AssemblyName System.Drawing
(New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }`;

function powershell(script) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, timeout: 30000, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' },
      (err, stdout) => (err ? reject(err) : resolve(stdout)),
    );
  });
}

/** 이 PC의 사양을 읽는다. 읽기 전용 조회만 한다. */
async function readSpecs() {
  try {
    const out = await powershell(SPEC_SCRIPT);
    return { rows: normalizeSpecs(JSON.parse(out)) };
  } catch (err) {
    return { rows: [], error: String(err && err.message ? err.message : err).slice(0, 200) };
  }
}

async function listFonts() {
  try {
    const out = await powershell(FONT_SCRIPT);
    return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = { readSpecs, listFonts };

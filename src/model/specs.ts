import type { IconKind, SpecRow } from './types';
import { makeRow } from './factory';

export const ICON_KINDS: { kind: IconKind; name: string; label: string }[] = [
  { kind: 'cpu', name: 'CPU', label: 'CPU' },
  { kind: 'mb', name: '메인보드', label: 'MB' },
  { kind: 'ram', name: '메모리', label: 'RAM' },
  { kind: 'gpu', name: '그래픽카드', label: 'VGA' },
  { kind: 'ssd', name: 'SSD · NVMe', label: 'SSD' },
  { kind: 'hdd', name: 'HDD', label: 'HDD' },
  { kind: 'psu', name: '파워', label: 'PSU' },
  { kind: 'case', name: '케이스', label: 'CHA' },
  { kind: 'cooler', name: '쿨러', label: 'CS' },
  { kind: 'monitor', name: '모니터', label: 'MON' },
  { kind: 'speaker', name: '스피커', label: 'SPK' },
  { kind: 'mouse', name: '마우스', label: 'MOUSE' },
  { kind: 'keyboard', name: '키보드', label: 'KBD' },
  { kind: 'headset', name: '헤드셋', label: 'HEADSET' },
  { kind: 'mic', name: '마이크', label: 'MIC' },
  { kind: 'etc', name: '기타', label: 'ETC' },
];

const LABEL_RULES: [RegExp, IconKind][] = [
  [/^(CPU|프로세서|시피유)/, 'cpu'],
  [/^(MB|M\/B|MAINBOARD|MOTHERBOARD|메인보드|보드)/, 'mb'],
  [/^(RAM|MEMORY|메모리|램)/, 'ram'],
  [/^(VGA|GPU|그래픽|글카|그카)/, 'gpu'],
  [/^(NVME|SSD|M\.?2)/, 'ssd'],
  [/^(HDD|하드)/, 'hdd'],
  [/^(PSU|POWER|파워)/, 'psu'],
  [/^(CHA|CASE|케이스)/, 'case'],
  [/^(CS|COOLER|쿨러|AIO|수랭|공랭)/, 'cooler'],
  [/^(MON|DISPLAY|모니터)/, 'monitor'],
  [/^(SPK|SPEAKER|스피커)/, 'speaker'],
  [/^(MOUSE|마우스)/, 'mouse'],
  [/^(KBD|KEYBOARD|키보드)/, 'keyboard'],
  [/^(HEADSET|HEADPHONE|헤드셋|헤드폰|이어폰)/, 'headset'],
  [/^(MIC|마이크)/, 'mic'],
];

export function iconForLabel(label: string): IconKind {
  const key = label.trim().toUpperCase().replace(/\s+/g, '');
  for (const [re, kind] of LABEL_RULES) if (re.test(key)) return kind;
  return 'etc';
}

export function resolveIcon(row: SpecRow): IconKind | null {
  if (row.icon === 'none') return null;
  if (row.icon === 'auto') return iconForLabel(row.label);
  return row.icon;
}

const KNOWN_LABEL = /^(CPU|MB|M\/B|RAM|VGA|GPU|NVME|SSD|HDD|PSU|CHA|CASE|CS|MON|SPK|KBD|MOUSE|MIC|HEADSET|ETC|메인보드|메모리|그래픽카드|파워|케이스|쿨러|모니터|스피커|마우스|키보드|헤드셋|마이크)$/i;

/** "CPU: Ryzen 7" / "CPU<TAB>Ryzen 7" / "CPU Ryzen 7" 형태의 여러 줄을 행으로 바꾼다. */
export function parseSpecText(text: string): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // 탭은 확실한 구분자다. 콜론은 값 안에도 나오므로 짧은 항목명 뒤에 올 때만 구분자로 본다.
    let m = line.match(/^([^\t]{1,24}?)\s*\t\s*(.*)$/) ?? line.match(/^([^\s:：]{1,12}(?: [^\s:：]{1,8})?)\s*[:：]\s*(.*)$/);
    if (m && m[1].trim()) {
      rows.push({ label: m[1].trim(), value: m[2].trim() });
      continue;
    }
    m = line.match(/^(\S{1,12})\s{2,}(.+)$/);
    if (m) {
      rows.push({ label: m[1], value: m[2].trim() });
      continue;
    }
    const first = line.split(/\s+/, 1)[0];
    if (KNOWN_LABEL.test(first) && line.length > first.length) {
      rows.push({ label: first, value: line.slice(first.length).trim() });
      continue;
    }
    if (rows.length > 0) rows[rows.length - 1].value += `${rows[rows.length - 1].value ? '\n' : ''}${line}`;
    else rows.push({ label: '', value: line });
  }
  return rows;
}

function family(label: string): string {
  const kind = iconForLabel(label);
  return kind === 'etc' ? label.trim().toUpperCase() : kind === 'hdd' ? 'ssd' : kind;
}

export interface MergeSummary { filled: number; added: number; kept: number }

/**
 * 읽어 온 사양을 기존 목록에 합친다.
 * 사용자가 이미 적은 값은 그대로 두고, 빈 칸만 채우며, 남는 장치는 같은 종류 행 뒤에 덧붙인다.
 */
export function mergeSpecs(existing: SpecRow[], incoming: { label: string; value: string }[]): { rows: SpecRow[]; summary: MergeSummary } {
  const rows = existing.map((r) => ({ ...r }));
  const summary: MergeSummary = { filled: 0, added: 0, kept: 0 };
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const item of incoming) {
    if (!item.value.trim()) continue;
    const fam = family(item.label);
    const same = rows.filter((r) => family(r.label) === fam);
    if (same.some((r) => norm(r.value) === norm(item.value))) { summary.kept += 1; continue; }
    const blank = same.find((r) => !r.value.trim());
    if (blank) {
      blank.value = item.value;
      summary.filled += 1;
      continue;
    }
    if (same.length > 0 && !['ssd', 'ram', 'gpu', 'monitor'].includes(fam)) { summary.kept += 1; continue; }
    const row = makeRow(item.label, item.value);
    const last = same[same.length - 1];
    if (last) rows.splice(rows.indexOf(last) + 1, 0, row);
    else rows.push(row);
    summary.added += 1;
  }
  return { rows, summary };
}

/** 값이 하나도 없을 때 프리셋 미리보기에 쓰는 예시. 문서에는 저장하지 않는다. */
export const SAMPLE_VALUES: Record<string, string> = {
  cpu: 'Example CPU 8-Core',
  mb: 'Example B-Series Board',
  ram: 'DDR5 16GB*2',
  gpu: 'Example GPU 12GB',
  ssd: 'NVMe 1TB',
  hdd: 'HDD 4TB',
  psu: '750W 80+ GOLD',
  case: 'Mid Tower',
  cooler: 'Tower Cooler',
};

export function withSampleValues(rows: SpecRow[]): SpecRow[] {
  if (rows.some((r) => r.value.trim())) return rows;
  return rows.map((r) => ({ ...r, value: SAMPLE_VALUES[iconForLabel(r.label)] ?? '' }));
}

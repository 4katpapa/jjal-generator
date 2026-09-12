'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SpecText = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const LABELS = {
    cpu: 'CPU', processor: 'CPU', 프로세서: 'CPU',
    mb: 'MB', motherboard: 'MB', mainboard: 'MB', 메인보드: 'MB',
    ram: 'RAM', memory: 'RAM', 메모리: 'RAM', 램: 'RAM',
    gpu: 'VGA', vga: 'VGA', 그래픽카드: 'VGA', 그래픽: 'VGA',
    ssd: 'SSD', nvme: 'SSD', hdd: 'HDD', 하드디스크: 'HDD',
    psu: 'PSU', 파워: 'PSU', 파워서플라이: 'PSU',
    case: 'CHA', cha: 'CHA', 케이스: 'CHA',
    cs: 'CS', cooler: 'CS', 쿨러: 'CS',
    monitor: '모니터', 모니터: '모니터', mouse: '마우스', 마우스: '마우스',
    keyboard: '키보드', 키보드: '키보드', speaker: '스피커', speakers: '스피커', 스피커: '스피커',
    headset: '헤드셋', 헤드셋: '헤드셋', microphone: '마이크', 마이크: '마이크',
  };

  function parse(text) {
    const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) throw new Error('사양을 한 줄에 하나씩 입력해 주세요.');
    if (lines.length > 64) throw new Error('한 번에 최대 64개 항목을 가져올 수 있습니다.');
    return lines.map((line, index) => {
      const cleaned = line.replace(/^[-*•]\s+/, '');
      const match = cleaned.match(/^([^:：\t]+?)\s*(?:[:：\t]|\s+-\s+)\s*(.+)$/)
        || cleaned.match(/^(\S+)\s+(.+)$/);
      if (!match) throw new Error(`${index + 1}번째 줄을 'CPU: 부품 이름' 형태로 입력해 주세요.`);
      const key = match[1].trim();
      const numbered = key.match(/^(ssd|hdd|monitor|모니터)(\d+)$/i);
      const label = LABELS[key.toLowerCase()] || (numbered ? (LABELS[numbered[1].toLowerCase()] + numbered[2]) : key);
      const value = match[2].trim();
      if (!label || label.length > 24 || !value || value.length > 1000) {
        throw new Error(`${index + 1}번째 줄: 항목명은 24자, 사양은 1,000자 이내로 입력해 주세요.`);
      }
      return { label, value };
    });
  }
  return { parse };
});

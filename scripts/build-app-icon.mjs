// 앱 아이콘을 만든다: node scripts/build-app-icon.mjs → build/icon.png (512px)
import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#232a4d"/><stop offset="1" stop-color="#12142a"/></linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fc7"/><stop offset="1" stop-color="#8f6bff"/></linearGradient>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bg)"/>
  <g transform="rotate(-8 256 256)">
    <rect x="70" y="150" width="372" height="212" rx="30" fill="url(#card)" stroke="#ffffff" stroke-width="10"/>
    <rect x="100" y="188" width="150" height="20" rx="10" fill="#ffffff"/>
    <rect x="100" y="228" width="112" height="16" rx="8" fill="#ffffff" opacity="0.85"/>
    <rect x="100" y="260" width="134" height="16" rx="8" fill="#ffffff" opacity="0.85"/>
    <rect x="100" y="292" width="96" height="16" rx="8" fill="#ffffff" opacity="0.85"/>
    <path d="M300 150 L412 150 A30 30 0 0 1 442 180 L442 332 A30 30 0 0 1 412 362 L262 362 Z" fill="#ffffff" opacity="0.28"/>
    <circle cx="372" cy="250" r="44" fill="#ffffff" opacity="0.92"/>
  </g>
  <path d="M398 86 l12 32 32 12 -32 12 -12 32 -12 -32 -32 -12 32 -12z" fill="#ffe27a"/>
  <path d="M120 388 l7 19 19 7 -19 7 -7 19 -7 -19 -19 -7 19 -7z" fill="#7ae7ff"/>
</svg>`;

await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('build/icon.png');
console.log('build/icon.png');

// Generates SVG placeholder art for the non-food UI slots.
// Run with: node scripts/gen-placeholders.mjs
// Food art lives in food-assets/ and is exported by `npm run build`; this
// script no longer emits per-item placeholder SVGs.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'src', 'assets');
mkdirSync(assets, { recursive: true });

const bg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#162a29"/>
  <rect width="1920" height="1080" fill="url(#g)" opacity="0.5"/>
  <defs><radialGradient id="g" cx="50%" cy="18%" r="60%">
    <stop offset="0%" stop-color="#2c4a44"/><stop offset="100%" stop-color="#162a29" stop-opacity="0"/>
  </radialGradient></defs>
  <text x="960" y="545" font-size="46" fill="#3f5f59" text-anchor="middle" font-family="'VT323', 'Courier New', monospace">BACKGROUND placeholder · 1920×1080</text>
</svg>`;
writeFileSync(join(assets, 'bg.svg'), bg);

const hud = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 140">
  <rect width="1200" height="140" rx="18" fill="#10201e" opacity="0.82" stroke="#2f4d48" stroke-width="2"/>
</svg>`;
writeFileSync(join(assets, 'hud.svg'), hud);

const hint = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 120">
  <rect width="640" height="120" rx="24" fill="#10201e" opacity="0.85" stroke="#f3b66c" stroke-width="2"/>
</svg>`;
writeFileSync(join(assets, 'hint.svg'), hint);

console.log('Generated placeholders: bg.svg, hud.svg, hint.svg (food art: npm run build)');

// Rebuild the vendored pixel CJK font subset from a full Fusion Pixel 12px
// proportional (simplified Chinese) OTF. Fusion Pixel is an OFL open-source
// pixel font: https://github.com/TakWolf/fusion-pixel-font
//
// Usage:
//   npm run fonts:cjk -- <path to fusion-pixel-12px-proportional-zh_hans.otf>
// The OFL license sits next to the OTF inside the release zip and is copied
// alongside the subset. The character set is derived from the game's live copy
// (see scripts/pixel-cjk-chars.mjs), so newly added text just needs a re-run.
// The vendor manifest (src/vendor/resources.json) is updated in place.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import subsetFont from 'subset-font';
import { collectGameCharacters } from './pixel-cjk-chars.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: npm run fonts:cjk -- <fusion-pixel-12px-proportional-zh_hans.otf>');
  process.exit(1);
}

const text = collectGameCharacters();
console.log(`Subset characters: ${text.length}`);

const subset = await subsetFont(readFileSync(inputPath), text, { targetFormat: 'woff2' });
const outPath = `${root}src/assets/fonts/FusionPixel12-zh_hans-subset.woff2`;
writeFileSync(outPath, subset);
console.log(`Wrote ${outPath} (${(subset.length / 1024).toFixed(1)} KB)`);

const oflSource = join(dirname(inputPath), 'OFL.txt');
const oflTarget = `${root}src/assets/fonts/fusion-pixel-OFL.txt`;
copyFileSync(oflSource, oflTarget);
console.log(`Copied license ${oflTarget}`);

// Keep the vendored-resource manifest in sync so offline hash tests pass.
const manifestPath = `${root}src/vendor/resources.json`;
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const fingerprint = (name) => {
  const bytes = readFileSync(`${root}src/assets/fonts/${name}`);
  return {
    path: `assets/fonts/${name}`,
    source: 'https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.11.10 (12px-proportional, subset built by scripts/build-pixel-cjk-font.mjs)',
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
};
for (const entry of [fingerprint('FusionPixel12-zh_hans-subset.woff2'), fingerprint('fusion-pixel-OFL.txt')]) {
  const index = manifest.findIndex((item) => item.path === entry.path);
  if (index >= 0) manifest[index] = entry; else manifest.push(entry);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Updated ${manifestPath}`);

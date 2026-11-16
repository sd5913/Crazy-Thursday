import { mkdir, readdir, stat, copyFile, unlink } from 'node:fs/promises';

// food-assets/ is the single content source. Importing this validates the
// bilingual catalogue, the category folders and every PNG, regenerates the
// English runtime data in src/, and gives us the image export list.
import { FOOD_ART } from './sync-food-assets.mjs';

// Copy src/ over www/ in place. We intentionally do NOT delete www/ first:
// the environment's safe-delete shim blocks fs.rm on generated dirs, and a
// plain recursive copy already overwrites changed files and adds new ones.
// Skip files whose size matches and which are no older than the source.
// Rewriting all ~60 MB of PNG/vendor assets on every `npm start` costs about a
// minute on Windows; an incremental copy makes repeated builds near-instant.
const srcRoot = new URL('../src/', import.meta.url);
const wwwRoot = new URL('../www/', import.meta.url);

let copied = 0;
let skipped = 0;

async function syncDir(src, dest) {
  await mkdir(dest, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    const from = new URL(entry.name, src);
    const to = new URL(entry.name, dest);
    if (entry.isDirectory()) {
      await syncDir(new URL(`${entry.name}/`, src), new URL(`${entry.name}/`, dest));
      continue;
    }
    await copyIfChanged(from, to);
  }
}

async function copyIfChanged(from, to) {
  const source = await stat(from);
  try {
    const target = await stat(to);
    if (target.size === source.size && target.mtimeMs >= source.mtimeMs) {
      skipped += 1;
      return;
    }
  } catch {
    // Target missing: copy it below.
  }
  await copyFile(from, to);
  copied += 1;
}

await syncDir(srcRoot, wwwRoot);

// Export the one set of food images into the web bundle. www/ is a generated
// packaging output (gitignored), not a second content source: src/ has no food
// PNGs, and the browser needs the flat assets/food/<id>.png layout.
const foodRoot = new URL('./assets/food/', wwwRoot);
await mkdir(foodRoot, { recursive: true });
const expected = new Set(FOOD_ART.map((art) => art.to));
for (const art of FOOD_ART) {
  await copyIfChanged(art.from, new URL(art.to, foodRoot));
}
for (const file of await readdir(foodRoot)) {
  if (/\.(png|svg)$/.test(file) && !expected.has(file)) await unlink(new URL(file, foodRoot));
}

console.log(`Built www/ from src/ and food-assets/ (${copied} copied, ${skipped} unchanged, ${expected.size} food items)`);

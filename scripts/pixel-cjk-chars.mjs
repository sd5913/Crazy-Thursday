// Shared character collector for the pixel CJK font subset.
// Every Chinese character the game can display must come from these sources:
//   1. src/i18n.js  UI_STRINGS.zh (all UI copy)
//   2. food-assets/catalogue.json  name_zh / line_zh (all food copy)
// plus a safety net of ASCII and the punctuation the UI actually renders.
// New user-visible Chinese text is covered automatically on the next run of
// `npm run fonts:cjk`; scripts/cjk-font.test.js fails if the font lacks one.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { UI_STRINGS } from '../src/i18n.js';

// Always embed ASCII plus the symbols used across the UI, so mixed
// Latin/CJK lines resolve inside the pixel font instead of a system font.
const SAFETY_NET =
  ' ' +
  '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' +
  '×＋－—–…·、。，！？：；（）「」『』％°℃　';

function collectFrom(value, out) {
  if (typeof value === 'string') {
    for (const char of value) {
      // Combining marks (the corrupted ending name) are not standalone glyphs:
      // the source pixel font has none and the browser overlays them via a
      // fallback font, so asking this subset for them would only fail the test.
      if (char.trim() && !/\p{M}/u.test(char)) out.add(char);
    }
  } else if (Array.isArray(value)) {
    for (const entry of value) collectFrom(entry, out);
  } else if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) collectFrom(entry, out);
  }
}

export function collectGameCharacters() {
  const chars = new Set(SAFETY_NET);
  collectFrom(UI_STRINGS.zh, chars);
  const catalogue = JSON.parse(readFileSync(fileURLToPath(new URL('../food-assets/catalogue.json', import.meta.url)), 'utf8'));
  for (const item of catalogue.items) {
    collectFrom(item.name_zh, chars);
    collectFrom(item.line_zh, chars);
  }
  return [...chars].join('');
}

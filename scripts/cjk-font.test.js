// Contract test: the vendored pixel CJK font subset covers EVERY Chinese
// character the game can display. New bilingual text that outgrows the font
// fails here until `npm run fonts:cjk` rebuilds the subset.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { openSync as fontkitOpenSync } from 'fontkit';

import { UI_STRINGS } from '../src/i18n.js';
import { collectGameCharacters } from './pixel-cjk-chars.mjs';

const FONT_URL = new URL('../src/assets/fonts/FusionPixel12-zh_hans-subset.woff2', import.meta.url);

function collectZhChars(value, out) {
  if (typeof value === 'string') {
    for (const char of value) {
      if (/\p{Script=Han}/u.test(char) || /[，。！？：；、（）「」『』…·×＋－％℃—–]/u.test(char)) out.add(char);
    }
  } else if (Array.isArray(value)) {
    for (const entry of value) collectZhChars(entry, out);
  } else if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) collectZhChars(entry, out);
  }
}

test('pixel CJK subset exists and stays small enough for offline bundling', async () => {
  const info = await stat(FONT_URL);
  assert.ok(info.size > 10 * 1024, 'subset suspiciously small');
  assert.ok(info.size < 1024 * 1024, 'subset must stay under 1 MB');
  const css = await readFile(new URL('../src/assets/fonts/fonts.css', import.meta.url), 'utf8');
  assert.match(css, /Fusion Pixel 12/);
  assert.match(css, /FusionPixel12-zh_hans-subset\.woff2/);
});

test('every character the game can display has a glyph in the pixel CJK subset', async () => {
  const font = fontkitOpenSync(fileURLToPath(FONT_URL));
  const needed = new Set(collectGameCharacters());
  const missing = [...needed].filter((char) => !font.hasGlyphForCodePoint(char.codePointAt(0)));
  assert.deepEqual(missing, [], `characters missing from the pixel CJK font: ${missing.join(' ')}`);
});

test('the collector covers the zh UI dictionary and food copy', () => {
  const uiZh = new Set();
  collectZhChars(UI_STRINGS.zh, uiZh);
  assert.ok(uiZh.size > 50, 'zh UI dictionary should contribute many characters');
  const collected = new Set(collectGameCharacters());
  for (const char of uiZh) assert.ok(collected.has(char), `collector missed UI char: ${char}`);
});

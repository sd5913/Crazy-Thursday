import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { translateDebugText } from '../src/face-debug-i18n.js';

test('every displayed raw signal has a Chinese translation and round-trips', async () => {
  const source = await readFile(new URL('../src/face-debug.js', import.meta.url), 'utf8');
  const signals = source.match(/const rawNames = \[([^\]]+)\]/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  for (const signal of signals) {
    const display = { leftEAR: 'Left eye openness ratio', rightEAR: 'Right eye openness ratio' }[signal] || signal;
    const translated = translateDebugText(display, 'zh');
    assert.match(translated, /\p{Script=Han}/u, display);
    assert.equal(translateDebugText(translated, 'en'), display);
    assert.equal(translateDebugText(display, 'en'), display);
  }
});

test('log JSON retains original model field names', () => {
  const payload = '{"eyeBlinkLeft":0.8,"jawOpen":0.2}';
  assert.ok(translateDebugText(`Debug settings: ${payload}`, 'zh').endsWith(payload));
});

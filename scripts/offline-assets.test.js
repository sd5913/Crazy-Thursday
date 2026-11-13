import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const source = new URL('../src/', import.meta.url);
test('vendored runtime resources match recorded sizes and hashes', async () => {
  const manifest = JSON.parse(await readFile(new URL('vendor/resources.json', source), 'utf8'));
  for (const item of manifest) {
    const file = new URL(item.path, source);
    assert.equal((await stat(file)).size, item.bytes, item.path);
    const bytes = await readFile(file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.path);
  }
});

test('model and font entry points have no remote runtime URLs', async () => {
  const face = await readFile(new URL('face.js', source), 'utf8');
  const html = await readFile(new URL('index.html', source), 'utf8');
  const fonts = await readFile(new URL('assets/fonts/fonts.css', source), 'utf8');
  assert.doesNotMatch(face, /https?:\/\//);
  assert.doesNotMatch(html, /(?:href|src)=["']https?:\/\//);
  assert.doesNotMatch(fonts, /https?:\/\//);
  assert.match(face, /new URL\(.*import.meta.url/);
  assert.match(html, /assets\/fonts\/fonts.css/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { preloadImage, prefetchImages } from '../src/food-image.js';

// Node has no Image/document: the helper must resolve immediately so game
// logic (and unit tests) never hang on a missing browser API.
test('preloadImage resolves without a browser and is cached per src', async () => {
  await Promise.race([
    preloadImage('assets/food/banana.png'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('hung')), 500)),
  ]);
  assert.equal(await preloadImage('assets/food/banana.png'), undefined);
  assert.doesNotThrow(() => prefetchImages(['a.png', 'b.png', null]));
});

test('prefetchImages tolerates empty/odd input', () => {
  assert.doesNotThrow(() => prefetchImages(null));
  assert.doesNotThrow(() => prefetchImages([]));
});

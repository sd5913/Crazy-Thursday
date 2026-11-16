import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { ITEMS } from '../src/logic.js';
import { FOOD_LOCALES, foodText } from '../src/food-catalogue.js';

const source = new URL('../food-assets/', import.meta.url);

const readCatalogue = async () => JSON.parse(await readFile(new URL('catalogue.json', source), 'utf8'));

test('food-assets/ is the single editable food source', async () => {
  const catalogue = await readCatalogue();
  const categoryNames = Object.keys(catalogue.categories);

  assert.equal(catalogue.items.length, 107);
  assert.equal(catalogue.items.some((it) => it.id === 'die'), false);
  assert.equal(catalogue.items.some((it) => it.id === 'dice-cheese'), false);
  assert.deepEqual(new Set(categoryNames), new Set(['food', 'foreign_object', 'lookalike', 'surreal_food']));

  // No second copy of the food images under src/: the build exports them.
  await assert.rejects(stat(new URL('../src/assets/food/', import.meta.url)), /ENOENT/);

  const listed = new Set();
  for (const item of catalogue.items) {
    assert.equal(item.status, 'ready');
    assert.equal(typeof item.eatable, 'boolean');
    assert.ok(item.name && item.name_zh, `missing name: ${item.id}`);
    assert.ok(item.line && item.line_zh, `missing line: ${item.id}`);
    assert.equal(item.image, `png/${item.category}/${item.id}.png`);
    assert.ok(categoryNames.includes(item.category), `bad category: ${item.id}`);
    assert.ok((await stat(new URL(item.image, source))).size > 0, `empty image: ${item.image}`);
    listed.add(`${item.category}/${item.id}.png`);
  }

  for (const category of categoryNames) {
    const def = catalogue.categories[category];
    assert.equal(def.path, `png/${category}/`);
    assert.equal(def.count, catalogue.items.filter((it) => it.category === category).length);
    for (const file of await readdir(new URL(def.path, source))) {
      assert.match(file, /\.png$/);
      assert.ok(listed.has(`${category}/${file}`), `orphan image: ${category}/${file}`);
    }
  }
});

test('runtime data carries both languages exactly as catalogued', async () => {
  const catalogue = await readCatalogue();
  assert.equal(ITEMS.length, catalogue.items.length);
  for (const [i, item] of catalogue.items.entries()) {
    assert.deepEqual(ITEMS[i], {
      id: item.id,
      name: item.name,
      name_zh: item.name_zh,
      eatable: item.eatable,
      category: item.category,
      line: item.line,
      line_zh: item.line_zh,
      image: `assets/food/${item.id}.png`,
    });
  }
});

test('foodText is the single extraction point for a future language switch', () => {
  assert.deepEqual(FOOD_LOCALES, ['en', 'zh']);
  for (const item of ITEMS) {
    assert.deepEqual(foodText(item), { name: item.name, line: item.line });
    assert.deepEqual(foodText(item, 'en'), { name: item.name, line: item.line });
    assert.deepEqual(foodText(item, 'zh'), { name: item.name_zh, line: item.line_zh });
    assert.deepEqual(foodText(item, 'fr'), { name: item.name, line: item.line });
    assert.match(item.name_zh, /[一-龥]/);
    assert.match(item.line_zh, /[一-龥]/);
  }
});

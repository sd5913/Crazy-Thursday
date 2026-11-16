// Contract test: the 中/EN global switch covers every UI string in BOTH
// languages. Any new key must exist in en AND zh or this test fails.
// Rule for future work: user-visible text always ships in both languages.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LANGUAGES, getLanguage, setLanguage, toggleLanguage, onLanguageChange,
  t, faceLabel, UI_STRINGS,
} from '../src/i18n.js';
import { FOOD_ITEMS, foodText } from '../src/food-catalogue.js';

// Flatten nested string groups (e.g. face/badge) into 'face.smile' style keys.
function flatten(group, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(group)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

test('exactly two languages are supported: en and zh', () => {
  assert.deepEqual(LANGUAGES, ['en', 'zh']);
});

test('en and zh define exactly the same key set', () => {
  const en = flatten(UI_STRINGS.en);
  const zh = flatten(UI_STRINGS.zh);
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
});

test('no UI string is empty in either language', () => {
  for (const lang of ['en', 'zh']) {
    for (const [key, value] of Object.entries(flatten(UI_STRINGS[lang]))) {
      if (typeof value === 'string') assert.ok(value.length > 0, `${lang}.${key} is empty`);
    }
  }
});

test('gameplay copy arrays match in length and carry Chinese text', () => {
  for (const key of ['nurseLines', 'defenseLines']) {
    assert.ok(Array.isArray(UI_STRINGS.en[key]) && UI_STRINGS.en[key].length > 0, `${key} missing in en`);
    assert.equal(UI_STRINGS.zh[key].length, UI_STRINGS.en[key].length, `${key} length mismatch`);
    assert.ok(UI_STRINGS.zh[key].every((line) => /\p{Script=Han}/u.test(line)), `${key} zh lines must contain Chinese`);
  }
  assert.equal(UI_STRINGS.en.nurseLines.length, 5);
  assert.equal(UI_STRINGS.en.defenseLines.length, 4);
});

test('t() interpolates vars, passes through arrays and falls back to the key', () => {
  const original = getLanguage();
  try {
    setLanguage('en');
    assert.equal(t('combo', { n: 3 }), 'combo ×3');
    assert.equal(t('outcomeSurreal', { n: 30 }), 'Suspiciously good. +30');
    assert.deepEqual(t('nurseLines').length, 5);
    assert.equal(t('definitely-not-a-key'), 'definitely-not-a-key');
    // English-string keys (calibration errors) resolve through the same dict.
    assert.equal(t('Not enough fresh face samples. Face the camera and retry.'),
      'Not enough fresh face samples. Face the camera and retry.');
    setLanguage('zh');
    assert.equal(t('combo', { n: 3 }), '连击 ×3');
    assert.match(t('Not enough fresh face samples. Face the camera and retry.'), /样本不足/);
  } finally {
    setLanguage(original);
  }
});

test('faceLabel resolves every game state in both languages', () => {
  const states = ['smile', 'refusal', 'vomit', 'blink', 'neutral', 'none', 'waiting', 'error'];
  const original = getLanguage();
  try {
    setLanguage('en');
    const en = Object.fromEntries(states.map((s) => [s, faceLabel(s)]));
    setLanguage('zh');
    for (const s of states) {
      assert.ok(faceLabel(s) && faceLabel(s) !== 'undefined');
      assert.notEqual(faceLabel(s), en[s]);
    }
  } finally {
    setLanguage(original);
  }
});

test('language toggle notifies listeners and survives without storage', () => {
  const original = getLanguage();
  const seen = [];
  const unsubscribe = onLanguageChange((lang) => seen.push(lang));
  try {
    assert.equal(toggleLanguage(), original === 'en' ? 'zh' : 'en');
    assert.equal(getLanguage(), original === 'en' ? 'zh' : 'en');
    toggleLanguage();
    assert.deepEqual(seen, [original === 'en' ? 'zh' : 'en', original]);
    assert.equal(getLanguage(), original);
    // Node has no window/localStorage here; setLanguage must not throw.
    assert.doesNotThrow(() => setLanguage('zh'));
  } finally {
    unsubscribe();
    setLanguage(original);
  }
});

test('unsupported languages are rejected', () => {
  assert.throws(() => setLanguage('fr'), /Unsupported language/);
});

test('food lines stay bilingual so the switch covers food subtitles too', () => {
  assert.equal(FOOD_ITEMS.length, 107);
  for (const item of FOOD_ITEMS) {
    const en = foodText(item, 'en');
    const zh = foodText(item, 'zh');
    assert.ok(en.name && en.line && zh.name && zh.line, `${item.id} missing a language variant`);
    assert.notEqual(en.line, zh.line);
  }
});

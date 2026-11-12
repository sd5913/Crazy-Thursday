import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildThresholds, classifyExpression, frownScore } from '../src/logic.js';
import { defaultFaceSettings, analyzeFaceSettings } from '../src/face-settings.js';

const cats = (values) => Object.entries(values).map(([categoryName, score]) => ({ categoryName, score }));

test('brow average triggers refusal at default 0.05 boundary', () => {
  const thresholds = buildThresholds(null);
  assert.equal(thresholds.frown, 0.05);
  const brow = cats({ browDownLeft: 0.05, browDownRight: 0.05 });
  assert.equal(frownScore(brow), 0.05);
  assert.equal(classifyExpression(brow, thresholds), 'refusal');
  assert.equal(analyzeFaceSettings(brow, defaultFaceSettings()).expression, 'refusal');
  assert.equal(classifyExpression(cats({ browDownLeft: 0.049, browDownRight: 0.049 }), thresholds), 'neutral');
});

test('mouth refusal paths and higher-priority gestures remain available', () => {
  const thresholds = buildThresholds(null);
  assert.equal(classifyExpression(cats({ mouthPressLeft: 0.1, mouthPressRight: 0.1 }), thresholds), 'neutral');
  assert.equal(classifyExpression(cats({ mouthFrownLeft: 0.05, mouthFrownRight: 0.05 }), thresholds), 'refusal');
  assert.equal(classifyExpression(cats({ browDownLeft: 0.1, browDownRight: 0.1, jawOpen: 0.8 }), thresholds), 'vomit');
});

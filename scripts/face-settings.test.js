import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultFaceSettings, applyFaceSettings, resetFaceSettings, getAppliedFaceSettings,
  analyzeFaceSettings, classifyGameExpression, gameEyesClosed, gameIntentFromExpression,
} from '../src/face-settings.js';
import { buildThresholds, classifyExpression } from '../src/logic.js';

const cats = (values) => Object.entries(values).map(([categoryName, score]) => ({ categoryName, score }));

test('applied debug tuning changes actual game classification, intent and blink hold signal', () => {
  resetFaceSettings();
  const thresholds = buildThresholds(null);
  const smile = cats({ mouthSmileLeft: 0.2, mouthSmileRight: 0.2 });
  assert.equal(classifyGameExpression(smile, thresholds), 'neutral');
  const settings = defaultFaceSettings();
  settings.weights.smile = 2;
  settings.weights.blink = 2;
  applyFaceSettings(settings);
  try {
    assert.equal(classifyGameExpression(smile, thresholds), 'smile');
    assert.equal(gameIntentFromExpression(smile, thresholds), 'accept');
    assert.equal(analyzeFaceSettings(smile, settings).expression, classifyGameExpression(smile, thresholds));
    const closed = cats({ eyeBlinkLeft: 0.4, eyeBlinkRight: 0.4, eyeSquintLeft: 1, eyeSquintRight: 1 });
    assert.equal(gameEyesClosed(closed, thresholds, { left: .04, right: .04 }), true);
    assert.equal(gameIntentFromExpression(closed, thresholds, false, { left: .04, right: .04 }), 'neutral');
    assert.equal(gameIntentFromExpression(closed, thresholds, true, { left: .04, right: .04 }), 'defend');
    assert.equal(classifyGameExpression(null, thresholds), 'neutral');
    const copy = getAppliedFaceSettings();
    copy.weights.smile = 0;
    assert.equal(getAppliedFaceSettings().weights.smile, 2);
  } finally { resetFaceSettings(); }
  assert.equal(classifyGameExpression(smile, thresholds), classifyExpression(smile, thresholds));
});

test('saved baseline is available without browser storage and reset restores defaults', () => {
  resetFaceSettings();
  const settings = defaultFaceSettings();
  settings.thresholds.vomitJawOpen = 0.2;
  const calibrated = { ...buildThresholds(null), vomitJawOpen: 0.9 };
  const mouth = cats({ jawOpen: 0.3 });
  assert.equal(applyFaceSettings(settings), false); // Node has no browser storage
  assert.equal(classifyGameExpression(mouth, calibrated), 'vomit');
  resetFaceSettings();
  assert.equal(classifyGameExpression(mouth, calibrated), 'neutral');
  assert.throws(() => applyFaceSettings({ weights: {} }));
  assert.equal(getAppliedFaceSettings(), null);
});

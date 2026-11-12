import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEyeHold } from '../src/eye-hold.js';

test('natural blink does not qualify; continuous 500ms closes do', () => {
  const gate = createEyeHold();
  const update = (now, closed, inferred = true) => gate.update({ now, closed, inferred });
  assert.equal(update(0, true).ready, false);
  assert.equal(update(100, false).elapsedMs, 0);
  update(200, true);
  update(300, true);
  update(400, true);
  assert.equal(update(500, true).ready, false);
  assert.equal(update(550, true).ready, false);
  assert.equal(update(650, true).ready, false);
  assert.equal(update(700, true).ready, true);
  assert.equal(update(710, false).ready, false);
});

test('cached frames never advance timer and stale detections reset it', () => {
  const gate = createEyeHold();
  gate.update({ inferred: true, closed: true, now: 0 });
  gate.update({ inferred: true, closed: true, now: 100 });
  assert.equal(gate.update({ inferred: false, now: 180 }).elapsedMs, 100);
  assert.equal(gate.update({ inferred: false, now: 350 }).elapsedMs, 0);
  assert.equal(gate.update({ inferred: true, closed: true, now: 360 }).ready, false);
  assert.equal(gate.update({ inferred: true, closed: false, now: 380 }).elapsedMs, 0);
});

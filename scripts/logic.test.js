import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextMessage } from '../src/logic.js';
test('each signal reports the new count', () => {
  assert.match(nextMessage(1), /Signal 1 sent/);
  assert.match(nextMessage(2), /Signal 2 sent/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRIALS, TRIAL_FOOD_COUNT, TRIAL_PASS_COUNT,
  trialHit, trialPassed, pickTrialFoods,
} from '../src/calibration-trial.js';

test('every calibration step has a trial with a known channel and food pool', () => {
  assert.deepEqual(Object.keys(TRIALS).sort(), ['blink', 'frown', 'jaw', 'neutral', 'smile']);
  assert.equal(TRIALS.smile.channel, 'smile');
  assert.equal(TRIALS.frown.pool, 'foreign'); // practice refusal on inedible food
  assert.equal(TRIALS.jaw.channel, 'jaw');
  assert.equal(TRIALS.blink.channel, 'blink');
});

test('trialHit compares a frame channel score against the captured threshold', () => {
  assert.equal(trialHit({ smile: 0.7 }, 'smile', 0.5), true);
  assert.equal(trialHit({ smile: 0.4 }, 'smile', 0.5), false);
  assert.equal(trialHit({ frown: 0.9 }, 'frown', 0.6), true);
  assert.equal(trialHit(null, 'smile', 0.5), false);
  assert.equal(trialHit({ smile: NaN }, 'smile', 0.5), false);
  assert.equal(trialHit({ smile: 0.9 }, 'smile', null), false); // no threshold -> no hit
});

test('trialPassed needs the required number of hits across all dishes', () => {
  assert.equal(TRIAL_PASS_COUNT, 2);
  assert.equal(TRIAL_FOOD_COUNT, 3);
  assert.equal(trialPassed([true, true, false]), true);
  assert.equal(trialPassed([true, false, true]), true);
  assert.equal(trialPassed([true, false, false]), false);
  assert.equal(trialPassed([false, false, false]), false);
  assert.equal(trialPassed([true, true]), false); // wrong length
});

test('pickTrialFoods spreads across the pool without duplicates', () => {
  const pool = Array.from({ length: 9 }, (_, i) => ({ id: i }));
  const picked = pickTrialFoods(pool);
  assert.equal(picked.length, TRIAL_FOOD_COUNT);
  assert.equal(new Set(picked.map((f) => f.id)).size, TRIAL_FOOD_COUNT);
  assert.deepEqual(pickTrialFoods([], 3), []);
  assert.equal(pickTrialFoods([{ id: 0 }, { id: 1 }], 3).length, 2); // smaller pool
});

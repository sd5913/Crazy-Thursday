import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRIALS, TRIAL_FOOD_COUNT, TRIAL_PASS_COUNT,
  trialHit, trialPassed, pickTrialFoods,
} from '../src/calibration-trial.js';

test('only the three middle expressions get a food test', () => {
  assert.deepEqual(Object.keys(TRIALS).sort(), ['frown', 'jaw', 'smile']);
  assert.equal(TRIALS.neutral, undefined); // relaxed is calibration-only
  assert.equal(TRIALS.blink, undefined); // closed eyes are calibration-only
  assert.equal(TRIALS.smile.pool, 'normal'); // eat the good food
  assert.equal(TRIALS.frown.pool, 'foreign'); // refuse the inedible object
  assert.equal(TRIALS.jaw.pool, 'foreign'); // purge a swallowed object
  assert.equal(TRIALS.jaw.channel, 'jaw');
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

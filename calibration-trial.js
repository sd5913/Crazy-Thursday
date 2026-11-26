// Post-calibration mini-test: after each expression is captured, the player
// proves it on a few food items before moving to the next expression.
// Kept as pure functions so the pass/fail rules can be unit-tested without a
// camera or DOM.

export const TRIAL_FOOD_COUNT = 3; // foods shown per expression test
export const TRIAL_PASS_COUNT = 2; // correct expressions needed to pass
export const TRIAL_WINDOW_MS = 1600; // time to react to each food

// Only the three middle expressions get a food test: relaxed and closed eyes
// are calibration-only steps. `channel` is the raw face-settings channel that
// must fire for a hit; `pool` picks dishes that fit the expression's meaning.
export const TRIALS = {
  smile: { channel: 'smile', pool: 'normal' }, // eat the good food
  frown: { channel: 'frown', pool: 'foreign' }, // refuse the inedible object
  jaw: { channel: 'jaw', pool: 'foreign' }, // object was swallowed - purge it
};

// A frame's channel values are the median-smoothed scores keyed by channel
// name. `threshold` is captured from the just-finished calibration sample.
export function trialHit(frame, channel, threshold) {
  if (!frame || !frame[channel] || !Number.isFinite(threshold)) return false;
  return frame[channel] >= threshold;
}

// results: array of booleans, one per shown food.
export function trialPassed(results) {
  if (!Array.isArray(results) || results.length !== TRIAL_FOOD_COUNT) return false;
  return results.filter(Boolean).length >= TRIAL_PASS_COUNT;
}

// Pick deterministic sample foods from a pool for repeatable tests: spread
// evenly across the pool so the three items differ.
export function pickTrialFoods(pool, count = TRIAL_FOOD_COUNT) {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const out = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    out.push(pool[Math.floor(i * pool.length / n)]);
  }
  return out;
}
